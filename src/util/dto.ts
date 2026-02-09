import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class PaginatedQuery {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @ApiPropertyOptional({ description: 'Page number', default: 1, example: 1 })
    page: number = 1;

    @IsOptional()
    @Type(() => Number)
    @Min(1)
    @IsNumber({}, { message: 'limit must be a number' })
    @ApiPropertyOptional({
        description: 'Number of items per page',
        default: 10,
        example: 10,
    })
    limit: number = 10;
}

export interface PaginatedResponse<T> {
    status: 'pending' | 'success' | 'failed' | 'processing';
    message: string;
    data: {
        limit: number;
        results: T[];
        page: number;
        totalCount: number;
    };
}
