export interface AccessTokenPayload {
    sub: string;
    email: string;
    roleId: string;
    sid: string;
    type: 'access';
}

export interface RefreshTokenPayload {
    sub: string;
    sid: string;
    type: 'refresh';
}