import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '@/app.module';
import { ActionRequiredFilter } from '@/common/filters/action-required.filter';
// import MockDate from 'mockdate';
import { PrismaExceptionFilter } from '@/common/filters/prisma-exception.filter';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    const config = new DocumentBuilder()
        .setTitle('Simple API')
        .setDescription('Simple API description')
        .setVersion('1.0')
        .build();
    const document = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    app.useGlobalPipes(
        new ValidationPipe({ transform: true, whitelist: true }),
    );
    // app.useGlobalInterceptors(new LoggingInterceptor());
    app.useGlobalFilters(
        new PrismaExceptionFilter(),
        new ActionRequiredFilter(),
    );

    app.set('trust proxy', 1);
    await app.listen(process.env.PORT || 4000);
}
// MockDate.set(new Date('2026-03-13T06:00:00Z'));

bootstrap().catch((error: unknown) => {
    console.error('Unknown bootstrap error', error);
    process.exit(1);
});
