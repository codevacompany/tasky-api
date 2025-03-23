import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CreateTicketUpdateDto } from './dtos/create-ticket-update.dto';
import { UpdateTicketUpdateDto } from './dtos/update-ticket-update.dto';
import { TicketUpdateService } from './ticket-update.service';

@Controller('ticket-updates')
export class TicketUpdateController {
    constructor(private readonly ticketUpdateService: TicketUpdateService) {}

    @Get()
    async findAll() {
        return this.ticketUpdateService.findAll();
    }

    @Get(':id')
    async findById(@Param('id') id: number) {
        return this.ticketUpdateService.findById(id);
    }

    @Get('ticket/:ticketId')
    findByTicket(@Param('ticketId') ticketId: number) {
        return this.ticketUpdateService.findBy({ ticketId: ticketId });
    }

    @Post()
    async create(@Body() createTicketUpdateDto: CreateTicketUpdateDto) {
        return this.ticketUpdateService.create(createTicketUpdateDto);
    }

    @Put(':id')
    async update(@Param('id') id: number, @Body() updateTicketUpdateDto: UpdateTicketUpdateDto) {
        return this.ticketUpdateService.update(id, updateTicketUpdateDto);
    }
}
