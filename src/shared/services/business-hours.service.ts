import { Injectable } from '@nestjs/common';

@Injectable()
export class BusinessHoursService {
    // (Saturday=6, Sunday=0)
    private readonly WEEKEND_DAYS = [0, 6];

    calculateBusinessHours(startDate: Date, endDate: Date): number {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // If same day, check if it's a weekend
        if (this.isSameDay(start, end)) {
            return this.isWeekend(start) ? 0 : this.calculateHoursBetween(start, end);
        }

        // For multi-day periods, calculate total hours excluding weekends
        return this.calculateMultiDayHours(start, end);
    }

    private isSameDay(date1: Date, date2: Date): boolean {
        return (
            date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
        );
    }

    private calculateHoursBetween(start: Date, end: Date): number {
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }

    private calculateMultiDayHours(start: Date, end: Date): number {
        let totalHours = 0;
        const current = new Date(start);

        while (current < end) {
            if (!this.isWeekend(current)) {
                const dayStart = new Date(current);
                dayStart.setHours(0, 0, 0, 0);

                const dayEnd = new Date(current);
                dayEnd.setHours(23, 59, 59, 999);

                const effectiveStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
                const effectiveEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));

                if (effectiveStart < effectiveEnd) {
                    totalHours += this.calculateHoursBetween(effectiveStart, effectiveEnd);
                }
            }
            current.setDate(current.getDate() + 1);
        }

        return totalHours;
    }

    private isWeekend(date: Date): boolean {
        const dayOfWeek = date.getDay();
        return this.WEEKEND_DAYS.includes(dayOfWeek);
    }
}
