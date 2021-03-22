import { Roles } from './roles';

import { JwtSessionService, ServerFunction } from '@remult/core';
import { UserInfo, Context } from '@remult/core';
import { Users } from './users';
export class ServerSignIn {
    
    @ServerFunction({ allowed: () => true })
    static async signIn(user: string, password: string, context?: Context) {
        let result: UserInfo;
        let u = await context.for(Users).findFirst(h => h.name.isEqualTo(user));
        if (u)
            if (!u.realStoredPassword.value || Users.passwordHelper.verify(password, u.realStoredPassword.value)) {
                result = {
                    id: u.id.value,
                    roles: [],
                    name: u.name.value
                };
                if (u.admin.value) {
                    result.roles.push(Roles.admin);
                }
            }

        if (result) {
            return JwtSessionService.createTokenOnServer(result);
        }
        return undefined;
    }
}
