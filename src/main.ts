import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
// import { LoggingInterceptor } from './interceptor/logger-interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ActionRequiredFilter } from './common/filters/action-required.filter';

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
bootstrap().catch((error: unknown) => {
    console.error('Unknown bootstrap error', error);
    process.exit(1);
});
