export interface CategoryCountDto {
    categoryId: number;
    categoryName: string;
    ticketCount: number;
}

export interface CategoryCountResponseDto {
    categories: CategoryCountDto[];
}
