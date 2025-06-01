export class ResolutionTimePointDto {
    label: string;
    value: number; // in hours
}

export class ResolutionTimeDataDto {
    week: ResolutionTimePointDto[];
    month: ResolutionTimePointDto[];
    quarter: ResolutionTimePointDto[];
}

export class ResolutionTimeAverageDto {
    week: number;
    month: number;
    quarter: number;
}

export class ResolutionTimeResponseDto {
    data: ResolutionTimeDataDto;
    average: ResolutionTimeAverageDto;
}
