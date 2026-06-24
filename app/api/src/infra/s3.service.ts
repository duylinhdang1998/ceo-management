import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

/**
 * S3Service — CMC Cloud S3-compatible storage.
 *
 * All credentials and endpoint are pulled from environment variables:
 *   S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET
 *
 * forcePathStyle: true is required for CMC Cloud (and most S3-compatible
 * gateways) because they do not support virtual-hosted-style bucket URLs.
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? 'ceo-reports';
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT ?? 'https://s3.cmccloud.vn',
      region: process.env.S3_REGION ?? 'hcm',
      forcePathStyle: true, // required for CMC + most non-AWS gateways
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? '',
        secretAccessKey: process.env.S3_SECRET_KEY ?? '',
      },
    });
  }

  /**
   * Upload an HTML string as UTF-8 text.
   * Used for report HTML content stored on CMC S3.
   */
  async putHtml(key: string, html: string): Promise<void> {
    this.logger.debug(`putHtml key=${key} size=${html.length}`);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(html, 'utf8'),
        ContentType: 'text/html; charset=utf-8',
      }),
    );
  }

  /**
   * Upload a raw buffer with a given MIME content-type.
   * Used for email attachments, images, or arbitrary blobs.
   */
  async putBuffer(
    key: string,
    buf: Buffer,
    contentType: string,
  ): Promise<void> {
    this.logger.debug(
      `putBuffer key=${key} contentType=${contentType} size=${buf.length}`,
    );
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buf,
        ContentType: contentType,
      }),
    );
  }

  /**
   * Download an object from S3.
   * Returns the body as a Buffer and the stored content-type.
   */
  async get(key: string): Promise<{ body: Buffer; contentType: string }> {
    this.logger.debug(`get key=${key}`);
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    const contentType = response.ContentType ?? 'application/octet-stream';
    const body = await S3Service.streamToBuffer(response.Body as Readable);
    return { body, contentType };
  }

  /**
   * Permanently delete an object from S3.
   */
  async delete(key: string): Promise<void> {
    this.logger.debug(`delete key=${key}`);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  /** Convert a Node.js Readable stream to a Buffer. */
  private static streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer | string) =>
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
      );
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
