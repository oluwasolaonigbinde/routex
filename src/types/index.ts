export interface ApiResponse<T = void> {
    status: 'pending' | 'success' | 'failed' | 'processing';
    message: string;
    data?: T | null;
}

export interface PaginatedResponse<T> {
    status: 'pending' | 'success' | 'failed' | 'processing';
    message: string;
    data: {
        limit: number;
        results: T[];
        page: number;
        perPage: number;
        totalCount: number;
    };
}
