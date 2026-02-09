import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response, Request } from 'express';

type PrismaErrorMeta =
    | { modelName?: string; cause?: string }
    | { target?: string[] }
    | undefined;

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
    catch(
        exception: Prisma.PrismaClientKnownRequestError,
        host: ArgumentsHost,
    ): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        const mapped = this.mapPrismaError(exception);

        response.status(mapped.status).json({
            statusCode: mapped.status,
            error: mapped.error,
            message: mapped.message,
        });
    }

    private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
        status: HttpStatus;
        error: string;
        message: string;
    } {
        switch (exception.code) {
            case 'P2025':
                return {
                    status: HttpStatus.NOT_FOUND,
                    error: 'Not Found',
                    message: this.formatNotFound(exception.meta),
                };

            case 'P2002':
                return {
                    status: HttpStatus.CONFLICT,
                    error: 'Conflict',
                    message: this.formatUniqueConstraint(exception.meta),
                };

            case 'P2003':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    error: 'Bad Request',
                    message: this.formatForeignKeyViolation(exception.meta),
                };

            case 'P2014':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    error: 'Bad Request',
                    message: 'Operation violates a required relation',
                };

            case 'P2015':
            case 'P2018':
                return {
                    status: HttpStatus.NOT_FOUND,
                    error: 'Not Found',
                    message: 'Required related record was not found',
                };

            case 'P2016':
            case 'P2017':
                return {
                    status: HttpStatus.BAD_REQUEST,
                    error: 'Bad Request',
                    message: 'Invalid relational operation',
                };

            case 'P2021':
            case 'P2022':
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    error: 'Internal Server Error',
                    message: 'Database schema is out of sync',
                };

            default:
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    error: 'Internal Server Error',
                    message: 'Database operation failed',
                };
        }
    }

    private formatNotFound(meta: PrismaErrorMeta): string {
        if (meta && 'cause' in meta && meta.cause) {
            return meta.cause;
        }

        if (meta && 'modelName' in meta && meta.modelName) {
            return `${meta.modelName} not found`;
        }

        return 'Record not found';
    }

    private formatUniqueConstraint(meta: PrismaErrorMeta): string {
        if (meta && 'target' in meta && Array.isArray(meta.target)) {
            return `A record with the same ${meta.target.join(', ')} already exists`;
        }

        return 'Unique constraint violation';
    }

    private formatForeignKeyViolation(meta: unknown): string {
        if (
            meta &&
            typeof meta === 'object' &&
            'constraint' in meta &&
            typeof meta.constraint === 'string'
        ) {
            const constraint = meta.constraint;

            const parsed = this.parseConstraintName(constraint);

            if (parsed) {
                const { field } = parsed;
                return `${field} does not exist`;
            }

            return 'Referenced record does not exist';
        }

        return 'Referenced record does not exist';
    }

    private parseConstraintName(
        constraint: string,
    ): { model: string; field: string } | null {
        // Example: Plan_payout_account_id_fkey
        const suffix = '_fkey';

        if (!constraint.endsWith(suffix)) {
            return null;
        }

        const trimmed = constraint.slice(0, -suffix.length);
        const parts = trimmed.split('_');

        if (parts.length < 2) {
            return null;
        }

        const model = parts[0];
        const field = parts.slice(1).join('_');

        return { model, field };
    }
}
