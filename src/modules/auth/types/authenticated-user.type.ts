import { RoleEnum } from '../../../common/enums/roles.enum';

export type AuthenticatedUser = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: RoleEnum;
    sessionId?: string;
};