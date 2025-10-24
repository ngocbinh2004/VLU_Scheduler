import * as process from 'process';

export enum RoleType {
  ADMIN = 'user_admin',
  USER = 'user_member',
  SYNC = 'sync_admin',
}

export const KEY = process.env.TOKEN_KEY;
