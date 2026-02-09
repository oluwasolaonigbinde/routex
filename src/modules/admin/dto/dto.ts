import { ExposeAll } from '@/util/decorator';
import { PickType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsOptional } from 'class-validator';
import { Admin } from '../entities';

@ExposeAll()
export class CreateAdminDto
    extends PickType(Admin, [
        'email',
        'password',
        'role',
        'firstName',
        'lastName',
        'require2Fa',
        'requireEmailVerification',
    ] as const)
    implements Omit<Prisma.AdminCreateInput, 'username' | 'tenant'>
{
    // @IsEmail(
    //     {
    //         host_whitelist: ['princepsfinance.com'],
    //     },
    //     {
    //         message: 'Email must be a princepsfinance.com email address',
    //     },
    // )
    email: string;

    @IsOptional()
    requireEmailVerification: boolean;

    @IsOptional()
    require2Fa: boolean;
}
