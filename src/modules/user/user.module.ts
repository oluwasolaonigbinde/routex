import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { UserAuthorizationModule } from './authorization/user-authorization.module';

@Module({
    imports: [
        forwardRef(() => AuthModule),
        forwardRef(() => UserAuthorizationModule),
    ],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
