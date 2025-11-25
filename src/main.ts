import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { DatabaseRetryInterceptor } from './shared/interceptors/database-retry.interceptor';
import { json, raw, Request, Response, NextFunction } from 'express';

async function bootstrap() {
    dotenv.config();

    const app = await NestFactory.create(AppModule, {
        cors: true,
        bodyParser: false, // Disable default to handle manually
    });

    // Configure body parser: use raw for webhook, JSON for everything else
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.path === '/stripe/webhook' || req.originalUrl === '/stripe/webhook') {
            raw({ type: 'application/json' })(req, res, next);
        } else {
            json()(req, res, next);
        }
    });

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalInterceptors(new DatabaseRetryInterceptor());

    await app.listen(4443);
}
bootstrap();
