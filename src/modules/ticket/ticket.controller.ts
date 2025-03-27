import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { UpdateTicketDto } from './dtos/update-department.dto';
import { TicketService } from './ticket.service';

@Controller('tickets')
export class TicketController {
    constructor(private readonly ticketService: TicketService) {}

    @Post()
    create(@Body() createTicketDto: CreateTicketDto) {
        return this.ticketService.create(createTicketDto);
    }

    @Get()
    findAll() {
        return this.ticketService.findAll();
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.ticketService.findById(id);
    }

    @Get('department/:departmentId')
    findByDepartment(@Param('departmentId', ParseIntPipe) departmentId: number) {
        return this.ticketService.findBy({ departmentId: departmentId });
    }

    @Get('requester/:requesterId')
    findByRequester(@Param('requesterId', ParseIntPipe) requesterId: number) {
        return this.ticketService.findBy({ requesterId: requesterId });
    }

    @Get('target-user/:userId')
    findByTargetUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.ticketService.findBy({ targetUserId: userId });
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateTicketDto: UpdateTicketDto) {
        return this.ticketService.update(id, updateTicketDto);
    }

    // @Delete(':id')
    // delete(@Param('id', ParseIntPipe) id: number) {
    //     return this.ticketService.delete(id);
    // }
}
