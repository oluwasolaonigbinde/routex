import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import {
    ActionRequiredException,
    ActionRequiredPayload,
} from '../exception/exception';

@Catch(ActionRequiredException)
export class ActionRequiredFilter implements ExceptionFilter {
    catch(exception: ActionRequiredException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        const payload = exception.getResponse() as ActionRequiredPayload;

        response.status(exception.getStatus()).json({
            status: payload.reason,
            context: {
                reason: payload.reason,
                message: payload.message,
            },
            next: payload.next,
        });
    }
}
