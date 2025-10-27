import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';

async function bootstrap() {
    dotenv.config();

    // const app = await NestFactory.create(AppModule, { cors: true });
    // app.useGlobalPipes(new ValidationPipe({whitelist: true, forbidNonWhitelisted: true}));

    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);

            const allowedOrigins = [
                'http://localhost:5173',
                'http://localhost:5174',
                'http://localhost:5175',
                'http://localhost:3000',
                'https://tasky-system.vercel.app',
            ];

            // Check if origin is in allowed list or matches Vercel preview pattern
            if (
                allowedOrigins.includes(origin) ||
                (origin.includes('tasky-system') && origin.includes('vercel.app'))
            ) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    });

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

    await app.listen(4443);
}
bootstrap();
