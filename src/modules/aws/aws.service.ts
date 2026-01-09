import { Injectable } from '@nestjs/common';
import { S3, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

    private sanitizeFileName(fileName: string): string {
        const lastDotIndex = fileName.lastIndexOf('.');
        const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
        const nameWithoutExt = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;

        let sanitized = nameWithoutExt
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_+|_+$/g, '');

        if (!sanitized) {
            sanitized = 'file';
        }

        const timestamp = Date.now();
        return `${sanitized}_${timestamp}${extension}`;
    }

    async generateUploadURL(fileName: string): Promise<{ url: string; fileName: string }> {
        const sanitizedFileName = this.sanitizeFileName(fileName);

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: sanitizedFileName,
        });

        const url = await getSignedUrl(this.s3, command, {
            expiresIn: 60,
        });

        return {
            url,
            fileName: sanitizedFileName,
        };
    }

    async getFileStream(
        fileKey: string,
    ): Promise<{ stream: NodeJS.ReadableStream; contentType: string }> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: fileKey,
        });

        const response = await this.s3.send(command);

        if (!response.Body) {
            throw new Error('File not found');
        }

        return {
            stream: response.Body as NodeJS.ReadableStream,
            contentType: response.ContentType || 'application/octet-stream',
        };
    }

    extractFileKeyFromUrl(url: string): string {
        // Extract the file key from S3 URL
        // URL format: https://bucket.s3.region.amazonaws.com/file-key
        const urlObj = new URL(url);
        return urlObj.pathname.substring(1); // Remove leading slash
    }
}
