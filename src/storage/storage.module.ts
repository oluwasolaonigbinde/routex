import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { CloudStorageStrategy } from './interfaces/cloud-storage.interface';
import { MemoryStoredFile, NestjsFormDataModule } from 'nestjs-form-data';
import { DummyStorageStrategy } from './strategies/dummy.strategy';

@Global()
@Module({
    imports: [
        ConfigModule,
        NestjsFormDataModule.config({
            storage: MemoryStoredFile,
            isGlobal: true,
        }),
    ],
    providers: [
        {
            provide: CloudStorageStrategy,
            useClass: DummyStorageStrategy,
        },
        StorageService,
    ],
    exports: [StorageService],
})
export class StorageModule {}
