import { AuthModule } from '@/modules/auth/auth.module';
import { UserAuthorizationModule } from '@/modules/user/authorization/user-authorization.module';
import { UsersController } from '@/modules/user/users.controller';
import { UsersService } from '@/modules/user/users.service';
import { Module, forwardRef } from '@nestjs/common';

@Module({
    imports: [forwardRef(() => UserAuthorizationModule), AuthModule],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
