import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Tenant } from '@/modules/auth/decorators/tenant.decorator';
import type { AccessTokenDTO } from '@/types/auth';
import { UserToken } from '@/decorators/user';
import { SerializeOptions } from '@/util/decorator';
import { PaginatedResponse } from '@/types';
import { Booking } from '@prisma/client';
import { BookingService } from '@/modules/booking/services/booking.service';
import {
    BookingEntityApiResponse,
    BookingListApiResponse,
    CreateBookingApiResponse,
} from '@/modules/booking/entities/booking.entity';
import {
    CancelBookingDto,
    CreateBookingDto,
    CreateBookingFromScheduleDto,
    GetBookingsQueryDto,
} from '@/modules/booking/dto/booking.dto';

@Controller('booking')
@ApiTags('Booking')
@Tenant('USER')
export class BookingController {
    constructor(private readonly bookingService: BookingService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new booking' })
    @ApiResponse({
        status: 201,
        description: 'Booking created successfully with payment URL',
        type: CreateBookingApiResponse,
    })
    @SerializeOptions({
        type: CreateBookingApiResponse,
        strategy: 'excludeAll',
    })
    async createBooking(
        @UserToken() user: AccessTokenDTO,
        @Body() dto: CreateBookingDto,
    ): Promise<CreateBookingApiResponse> {
        const { booking, payment } =
            await this.bookingService.createBookingFromTrip(user.sub, dto);

        return {
            status: payment.status,
            message:
                payment.status === 'success'
                    ? 'Booking confirmed'
                    : 'Booking created successfully. Please complete payment.',
            data: {
                booking,
                payment,
            },
        };
    }

    @Post('from-schedule')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a booking from a trip schedule' })
    @ApiResponse({
        status: 201,
        description:
            'Booking created from schedule successfully with payment URL',
        type: CreateBookingApiResponse,
    })
    @SerializeOptions({
        type: CreateBookingApiResponse,
        strategy: 'excludeAll',
    })
    async createBookingFromSchedule(
        @UserToken() user: AccessTokenDTO,
        @Body() dto: CreateBookingFromScheduleDto,
    ): Promise<CreateBookingApiResponse> {
        const { booking, payment } =
            await this.bookingService.createBookingFromSchedule(user.sub, dto);

        return {
            status: payment.status,
            message:
                payment.status === 'success'
                    ? 'Booking confirmed'
                    : 'Booking created from schedule successfully. Please complete payment.',
            data: {
                booking,
                payment,
            },
        };
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get user bookings' })
    @ApiResponse({
        status: 200,
        description: 'Bookings retrieved successfully',
        type: BookingListApiResponse,
    })
    @SerializeOptions({ type: BookingListApiResponse, strategy: 'excludeAll' })
    async getUserBookings(
        @UserToken() user: AccessTokenDTO,
        @Query() query: GetBookingsQueryDto,
    ): Promise<PaginatedResponse<Booking>> {
        const bookings = await this.bookingService.getUserBookings(
            user.sub,
            query,
        );

        return {
            status: 'success',
            message: 'Bookings retrieved successfully',
            data: bookings,
        };
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get booking details' })
    @ApiResponse({
        status: 200,
        description: 'Booking retrieved successfully',
        type: BookingEntityApiResponse,
    })
    @SerializeOptions({
        type: BookingEntityApiResponse,
        strategy: 'excludeAll',
    })
    async getBookingById(@Param('id') id: string) {
        const booking = await this.bookingService.getBookingById(id);

        return {
            status: 'success',
            message: 'Booking retrieved successfully',
            data: booking,
        };
    }

    @Patch(':id/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancel a booking' })
    @ApiResponse({
        status: 200,
        description: 'Booking cancelled successfully',
    })
    @SerializeOptions({
        type: BookingEntityApiResponse,
        strategy: 'excludeAll',
    })
    async cancelBooking(
        @UserToken() user: AccessTokenDTO,
        @Param('id') id: string,
        @Body() dto: CancelBookingDto,
    ) {
        await this.bookingService.cancelBooking(user.sub, id, dto.reason);

        return {
            status: 'success',
            message: 'Booking cancelled successfully',
        };
    }
}
