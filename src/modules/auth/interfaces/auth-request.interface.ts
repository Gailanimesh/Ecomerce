import { Request } from 'express';

import { AuthenticatedUser } from '../types/authenticated-user.type';

export interface AuthRequest extends Request {
    user?: AuthenticatedUser;
    cookies: Record<string, string | undefined>;
}