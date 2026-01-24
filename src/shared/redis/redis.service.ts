import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    public publisher: Redis;
    public subscriber: Redis;
    private isRedisEnabled = false;
    private isConnected = false;

    constructor(private readonly configService: ConfigService) {
        this.isRedisEnabled = this.configService.get<string>('REDIS_HOST') !== undefined;

        if (this.isRedisEnabled) {
            const host = this.configService.get<string>('REDIS_HOST', 'localhost');
            const port = this.configService.get<number>('REDIS_PORT', 6379);
            const password = this.configService.get<string>('REDIS_PASSWORD');

            const redisOptions = {
                host,
                port,
                ...(password && { password }),
                retryStrategy: (times: number) => {
                    return Math.min(times * 500, 10000);
                },
                maxRetriesPerRequest: null,
            };

            this.publisher = new Redis(redisOptions);
            this.subscriber = new Redis(redisOptions);

            this.publisher.on('connect', () => {
                this.isConnected = true;
                this.logger.log(`Redis connected to ${host}:${port}`);
            });

            this.publisher.on('error', (err) => {
                if (this.isConnected) {
                    this.logger.error('Redis connection lost', err);
                    this.isConnected = false;
                }
            });

            this.subscriber.on('error', () => {
                // Silent
            });
        }
    }

    onModuleInit() {
        if (!this.isRedisEnabled) {
            this.logger.log('Redis is disabled. Cross-instance sync will not be available.');
        }
    }

    onModuleDestroy() {
        if (this.publisher) this.publisher.disconnect();
        if (this.subscriber) this.subscriber.disconnect();
    }

    async publish(channel: string, message: any) {
        if (!this.isConnected) return;
        try {
            await this.publisher.publish(channel, JSON.stringify(message));
        } catch (e) {
            this.logger.warn(`Failed to publish to Redis channel ${channel}`);
        }
    }

    async subscribe(channel: string, callback: (message: any) => void) {
        if (!this.isRedisEnabled) return;

        this.subscriber.subscribe(channel).catch(() => {
            // Silent catch to handle initial connection failure
        });

        this.subscriber.on('message', (chan, msg) => {
            if (chan === channel) {
                try {
                    callback(JSON.parse(msg));
                } catch (e) {
                    this.logger.error(`Error parsing Redis message from channel ${chan}`, e);
                }
            }
        });
    }
}
