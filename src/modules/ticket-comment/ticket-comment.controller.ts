import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateTicketCommentDto } from './dtos/create-ticket-comment.dto';
import { UpdateTicketCommentDto } from './dtos/update-ticket-comment.dto';
import { TicketCommentService } from './ticket-comment.service';

@Controller('ticket-updates')
export class TicketCommentController {
    constructor(private readonly ticketCommentService: TicketCommentService) {}

    @Get()
    async findAll() {
        return this.ticketCommentService.findAll();
    }

    @Get(':id')
    async findById(@Param('id', ParseIntPipe) id: number) {
        return this.ticketCommentService.findById(id);
    }

    @Get('ticket/:ticketId')
    findByTicket(@Param('ticketId', ParseIntPipe) ticketId: number) {
        return this.ticketCommentService.findBy({ ticketId: ticketId });
    }

    @Post()
    async create(@Body() createTicketCommentDto: CreateTicketCommentDto) {
        return this.ticketCommentService.create(createTicketCommentDto);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateTicketCommentDto: UpdateTicketCommentDto,
    ) {
        return this.ticketCommentService.update(id, updateTicketCommentDto);
    }
}
