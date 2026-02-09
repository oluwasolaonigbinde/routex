import { StoredFile } from 'nestjs-form-data';

export interface UploadOptions {
    file: StoredFile;
    key: string;
    private?: boolean;
    metadata?: Record<string, string>;
}

export interface UploadResult {
    url: string;
    key: string;
    bucket?: string;
    etag?: string;
}

export interface DeleteOptions {
    key: string;
}

export interface GetUrlOptions {
    key: string;í
    expiresIn?: number; // seconds
}

export abstract class CloudStorageStrategy {
    abstract upload(options: UploadOptions): Promise<UploadResult>;
    abstract delete(options: DeleteOptions): Promise<void>;
    abstract getPrivateUrl(options: GetUrlOptions): Promise<string>;
    abstract getPublicUrl(key: string): string;
}
