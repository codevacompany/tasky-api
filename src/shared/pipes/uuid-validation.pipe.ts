import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isUUID } from 'class-validator';

/**
 * Pipe to validate UUID format in route parameters
 * Usage: @Param('uuid', UUIDValidationPipe) uuid: string
 */
@Injectable()
export class UUIDValidationPipe implements PipeTransform<string, string> {
    transform(value: string): string {
        if (!isUUID(value)) {
            throw new BadRequestException(`Invalid UUID format: ${value}`);
        }
        return value;
    }
}

