import { Injectable } from '@nestjs/common';
import {
    CloudStorageStrategy,
    DeleteOptions,
    GetUrlOptions,
    UploadOptions,
    UploadResult,
} from './interfaces/cloud-storage.interface';
import { MemoryStoredFile, StoredFile } from 'nestjs-form-data';

export function isMemoryStoredFile(file: StoredFile): file is MemoryStoredFile {
    return (file as MemoryStoredFile).buffer !== undefined;
}

@Injectable()
export class StorageService {
    constructor(private readonly storageStrategy: CloudStorageStrategy) {}

    async uploadFile(options: UploadOptions): Promise<UploadResult> {
        return this.storageStrategy.upload(options);
    }

    async deleteFile(options: DeleteOptions): Promise<void> {
        return this.storageStrategy.delete(options);
    }

    async getPrivateUrl(options: GetUrlOptions): Promise<string> {
        return this.storageStrategy.getPrivateUrl(options);
    }

    getPublicUrl(key: string): string {
        return this.storageStrategy.getPublicUrl(key);
    }
}
