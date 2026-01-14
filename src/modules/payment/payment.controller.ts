import {
    Controller,
    Post,
    Param,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { GlobalAdminGuard } from '../../shared/guards/global-admin.guard';
import { PaymentService } from './payment.service';

@Controller('payments')
@UseGuards(AuthGuard('jwt'))
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}

    @Post(':id/send-invoice')
    @UseGuards(GlobalAdminGuard)
    @UseInterceptors(FileInterceptor('file'))
    async sendInvoice(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { email: string; invoiceLink?: string },
        @UploadedFile() file: any,
    ) {
        return this.paymentService.sendInvoiceEmail(id, {
            to: body.email,
            invoiceLink: body.invoiceLink,
            file: file,
        });
    }
}
