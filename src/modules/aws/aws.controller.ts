import { Controller, Get, Query } from '@nestjs/common';
import { AwsService } from './aws.service';

@Controller('aws')
export class AwsController {
  constructor(private readonly awsService: AwsService) {}

  @Get('upload-url')
  async getPresignedUrl(@Query('ext') ext: string): Promise<{ url: string }> {
    const url = await this.awsService.generateUploadURL(ext);
    return { url };
  }
}
