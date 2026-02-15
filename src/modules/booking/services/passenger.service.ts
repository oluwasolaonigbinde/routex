import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
    BoardingTokenExpiredException,
    BoardingTokenInvalidException,
} from '../exceptions/booking.exception';
import { EnvironmentVariables } from '@/validators/env.validation';

interface BoardingTokenPayload {
    sub: string; // passengerTripId
    tripId: string;
    bookingId: string;
    exp: number;
}

@Injectable()
export class PassengerService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService<EnvironmentVariables>,
    ) {}

    /**
     * Generate a JWT boarding token for a passenger trip
     * @param passengerTripId - The passenger trip ID
     * @param tripId - The trip ID
     * @param bookingId - The booking ID
     * @param departureTime - Trip departure time
     * @returns JWT boarding token
     */
    generateBoardingToken(
        passengerTripId: string,
        tripId: string,
        bookingId: string,
        departureTime: Date,
    ): string {
        // Token expires 4 hours after scheduled departure
        const expirationTime = new Date(departureTime);
        expirationTime.setUTCHours(expirationTime.getHours() + 4);

        const payload: Omit<BoardingTokenPayload, 'exp'> = {
            sub: passengerTripId,
            tripId,
            bookingId,
        };

        const secret = this.configService.get<string>('JWT_SECRET');

        return this.jwtService.sign(payload, {
            secret,
            expiresIn: Math.floor(
                (expirationTime.getTime() - Date.now()) / 1000,
            ),
        });
    }

    /**
     * Validate and decode a boarding token
     * @param token - JWT boarding token
     * @param tripId - Expected trip ID
     * @returns Decoded token payload
     * @throws BoardingTokenExpiredException if token is expired
     * @throws BoardingTokenInvalidException if token is invalid or trip mismatch
     */
    validateBoardingToken(token: string, tripId: string): BoardingTokenPayload {
        try {
            const secret = this.configService.get<string>('JWT_SECRET');

            const decoded = this.jwtService.verify<BoardingTokenPayload>(
                token,
                { secret },
            );

            // Verify the token is for the correct trip
            if (decoded.tripId !== tripId) {
                throw new BoardingTokenInvalidException(
                    'Token is not valid for this trip',
                );
            }

            return decoded;
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'TokenExpiredError') {
                throw new BoardingTokenExpiredException();
            }

            if (
                error instanceof BoardingTokenInvalidException ||
                error instanceof BoardingTokenExpiredException
            ) {
                throw error;
            }

            throw new BoardingTokenInvalidException('Invalid boarding token');
        }
    }

    /**
     * Decode a boarding token without validation (for extracting tripId)
     * @param token - JWT boarding token
     * @returns Decoded token payload or null if invalid
     */
    decodeBoardingToken(token: string): BoardingTokenPayload | null {
        try {
            return this.jwtService.decode(token);
        } catch {
            return null;
        }
    }
}
