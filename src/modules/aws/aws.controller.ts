import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AwsService } from './aws.service';

@Controller('aws')
export class AwsController {
    constructor(private readonly awsService: AwsService) {}

    @Get('upload-url')
    async getPresignedUrl(@Query('fileName') fileName: string) {
        return this.awsService.generateUploadURL(fileName);
    }

    @Get('download')
    async downloadFile(@Query('url') fileUrl: string, @Res() res: Response): Promise<void> {
        try {
            const fileKey = this.awsService.extractFileKeyFromUrl(fileUrl);
            const { stream, contentType } = await this.awsService.getFileStream(fileKey);

            const fileName = fileKey.split('/').pop() || 'download';

            res.setHeader('Content-Type', contentType);
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${encodeURIComponent(fileName)}"`,
            );

            stream.pipe(res);
        } catch (error) {
            res.status(404).send('File not found');
        }
    }
}
