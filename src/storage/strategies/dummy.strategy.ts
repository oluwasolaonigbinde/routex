import { Injectable } from '@nestjs/common';
import {
    CloudStorageStrategy,
    DeleteOptions,
    GetUrlOptions,
    UploadOptions,
    UploadResult,
} from '../interfaces/cloud-storage.interface';

@Injectable()
export class DummyStorageStrategy extends CloudStorageStrategy {
    async upload(options: UploadOptions): Promise<UploadResult> {
        // Simulate file upload
        return {
            url: `https://dummy-storage.example.com/${options.key}`,
            key: options.key,
            bucket: 'dummy-bucket',
            etag: `dummy-etag-${Date.now()}`,
        };
    }

    async delete(options: DeleteOptions): Promise<void> {
        // Simulate file deletion
        console.log(`Dummy: Deleted file with key: ${options.key}`);
    }

    async getPrivateUrl(options: GetUrlOptions): Promise<string> {
        const expiresIn = options.expiresIn || 3600;
        const expiry = Date.now() + expiresIn * 1000;
        return `https://dummy-storage.example.com/private/${options.key}?expires=${expiry}`;
    }

    getPublicUrl(key: string): string {
        return `https://dummy-storage.example.com/public/${key}`;
    }
}
