import { ApiResponse } from '@/types';
import { ExposeAll } from '@/util/decorator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Vehicle as PrismaVehicle } from '@prisma/client';
import { Type } from 'class-transformer';

// ========== Base Entities ==========

export class Vehicle implements PrismaVehicle {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    name: string;

    @ApiProperty({ type: Number })
    totalSeats: number;

    @ApiProperty({ type: String, nullable: true })
    type: string | null;
}

@ExposeAll()
export class VehicleEntity extends PickType(Vehicle, [
    'id',
    'name',
    'totalSeats',
    'type',
] as const) {}

// ========== ApiResponse Wrappers ==========

@ExposeAll()
export class VehicleEntityApiResponse implements ApiResponse<VehicleEntity> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: VehicleEntity })
    @Type(() => VehicleEntity)
    data?: VehicleEntity;
}

@ExposeAll()
class PaginatedVehicleResult {
    @ApiProperty({ type: Number })
    totalCount: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    limit: number;

    @ApiProperty({ type: [VehicleEntity] })
    @Type(() => VehicleEntity)
    results: VehicleEntity[];
}

@ExposeAll()
export class VehicleListApiResponse implements ApiResponse<PaginatedVehicleResult> {
    @ApiProperty({
        type: String,
        enum: ['pending', 'success', 'failed', 'processing'],
    })
    status: 'pending' | 'success' | 'failed' | 'processing';

    @ApiProperty({ type: String })
    message: string;

    @ApiProperty({ type: PaginatedVehicleResult })
    @Type(() => PaginatedVehicleResult)
    data?: PaginatedVehicleResult;
}
