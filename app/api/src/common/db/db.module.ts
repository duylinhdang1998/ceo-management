import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { getPool } from './pool';

export const DB_POOL = 'DB_POOL';

@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      useFactory: (): Pool => getPool(),
    },
  ],
  exports: [DB_POOL],
})
export class DbModule {}
