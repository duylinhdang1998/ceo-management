import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';

/**
 * S3Module — exports S3Service for use in any feature module.
 *
 * Import this module in any NestJS module that needs to upload/download
 * files from CMC Cloud S3.
 *
 * Example:
 *   @Module({ imports: [S3Module], ... })
 *   export class ReportsModule {}
 */
@Module({
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
