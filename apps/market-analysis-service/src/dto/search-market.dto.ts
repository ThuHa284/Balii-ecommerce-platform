export class SearchMarketDto {
  keyword!: string;
  platforms!: string[];
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}
