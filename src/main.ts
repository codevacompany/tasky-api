import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { DatabaseRetryInterceptor } from './shared/interceptors/database-retry.interceptor';
import { json, raw, Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
    dotenv.config();

    const app = await NestFactory.create(AppModule, {
        cors: true,
        bodyParser: false, // Disable default to handle manually
    });

    app.use(
        morgan(':date[iso] :method :url :status :response-time ms - :res[content-length]'),
    );

    // Proxy de Migração: Captura tudo o que chegar se a variável estiver setada
    if (process.env.API_PROXY_TARGET) {
        console.log(
            `[Proxy] Ativo: Redirecionando requisições para ${process.env.API_PROXY_TARGET}`,
        );
        app.use(
            createProxyMiddleware({
                target: process.env.API_PROXY_TARGET,
                changeOrigin: true,
            }),
        );
    }

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

    const port = process.env.PORT || 4443;
    await app.listen(port);

    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
