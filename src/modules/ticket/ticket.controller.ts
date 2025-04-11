import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { UpdateTicketDto } from './dtos/update-ticket.dto';
import { TicketService } from './ticket.service';
import { UpdateTicketStatusDto } from './dtos/update-ticket-status.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('tickets')
export class TicketController {
    constructor(private readonly ticketService: TicketService) {}

    @Post()
    @UseGuards(AuthGuard('jwt'))
    create(@Body() createTicketDto: CreateTicketDto) {
        return this.ticketService.create(createTicketDto);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    findAll() {
        return this.ticketService.findAll();
    }

    @Get(':id')
    @UseGuards(AuthGuard('jwt'))
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.ticketService.findById(id);
    }

    @Get('department/:departmentId')
    @UseGuards(AuthGuard('jwt'))
    findByDepartment(@Param('departmentId', ParseIntPipe) departmentId: number) {
        return this.ticketService.findBy({ departmentId: departmentId });
    }

    @Get('requester/:requesterId')
    @UseGuards(AuthGuard('jwt'))
    findByRequester(@Param('requesterId', ParseIntPipe) requesterId: number) {
        return this.ticketService.findBy({ requesterId: requesterId });
    }

    @Get('target-user/:userId')
    @UseGuards(AuthGuard('jwt'))
    findByTargetUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.ticketService.findBy({ targetUserId: userId });
    }

    @Patch(':id')
    @UseGuards(AuthGuard('jwt'))
    update(@Param('id', ParseIntPipe) id: number, @Body() updateTicketDto: UpdateTicketDto) {
        return this.ticketService.update(id, updateTicketDto);
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard('jwt'))
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateTicketStatusDto: UpdateTicketStatusDto,
    ) {
         this.ticketService.updateStatus(id, updateTicketStatusDto);
    }

    @Post(':id/accept')
    @UseGuards(AuthGuard('jwt'))
    accept(@Param('id', ParseIntPipe) id: number) {
        return this.ticketService.accept(id);
    }

    @Post(':id/approve')
    @UseGuards(AuthGuard('jwt'))
    approve(@Param('id', ParseIntPipe) id: number) {
        return this.ticketService.approve(id);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    delete(@Param('id', ParseIntPipe) id: number) {
        return this.ticketService.delete(id);
    }
}
