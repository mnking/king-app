export interface ApiResponse<T> {
  statusCode?: number;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  results: T[];
  total: number;
}
