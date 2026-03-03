import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class CreatePassengerDto {
    @ApiProperty({ example: 'John' })
    @IsString()
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    lastName: string;

    @ApiProperty({ example: '+2348012345678' })
    @IsPhoneNumber()
    phoneNumber: string;

    @ApiProperty({ example: 'john.doe@example.com', required: false })
    @IsEmail()
    @IsOptional()
    email?: string;
}
