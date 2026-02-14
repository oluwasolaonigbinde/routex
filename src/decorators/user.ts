import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const UserToken = createParamDecorator(
    <T>(data: unknown, ctx: ExecutionContext): T => {
        const request = ctx.switchToHttp().getRequest<Request>();
        return request.user as T;
    },
);
