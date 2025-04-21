// aws.service.ts
import { Injectable } from '@nestjs/common';
import { S3, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import { promisify } from 'util';

const randomBytes = promisify(crypto.randomBytes);

@Injectable()
export class AwsService {
  private readonly s3: S3;
  private readonly bucketName: string;
  private readonly region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-west-2';
    this.bucketName = process.env.AWS_BUCKET_NAME;

    this.s3 = new S3({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async generateUploadURL(fileExtension: string): Promise<string> {
    const rawBytes = await randomBytes(8);
    const imageName = rawBytes.toString('hex') + fileExtension;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: imageName,
    });

    const url = await getSignedUrl(this.s3, command, {
      expiresIn: 60,
    });

    return url;
  }
}
