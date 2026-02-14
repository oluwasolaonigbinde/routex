import { Injectable } from '@nestjs/common';
import { AuthorizationStrategyRegistry } from '../../auth/authorization.service';

@Injectable()
export class AuthAuthorizationRegistry extends AuthorizationStrategyRegistry {
    constructor() {
        super([]);
    }
}
