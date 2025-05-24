import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CnpjService } from './cnpj.service';

@Module({
    imports: [HttpModule],
    providers: [CnpjService],
    exports: [CnpjService],
})
export class CnpjModule {}
