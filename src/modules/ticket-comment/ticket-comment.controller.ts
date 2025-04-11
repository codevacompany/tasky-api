import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateTicketCommentDto } from './dtos/create-ticket-comment.dto';
import { UpdateTicketCommentDto } from './dtos/update-ticket-comment.dto';
import { TicketCommentService } from './ticket-comment.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('ticket-comments')
export class TicketCommentController {
    constructor(private readonly ticketCommentService: TicketCommentService) {}

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll() {
        return this.ticketCommentService.findAll();
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    async findById(@Param('id', ParseIntPipe) id: number) {
        return this.ticketCommentService.findById(id);
    }

    @Get('ticket/:ticketId')
    @UseGuards(AuthGuard('jwt'))
    findByTicket(@Param('ticketId', ParseIntPipe) ticketId: number) {
        return this.ticketCommentService.findBy({ ticketId: ticketId });
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(@Body() createTicketCommentDto: CreateTicketCommentDto) {
        return this.ticketCommentService.create(createTicketCommentDto);
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'))
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateTicketCommentDto: UpdateTicketCommentDto,
    ) {
        return this.ticketCommentService.update(id, updateTicketCommentDto);
    }
}
