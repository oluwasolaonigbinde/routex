import { Injectable } from '@nestjs/common';
import { AuthorizationStrategyRegistry } from '../../auth/authorization.service';

@Injectable()
export class UserAuthorizationRegistry extends AuthorizationStrategyRegistry {
    constructor() {
        super([]);
    }
}
