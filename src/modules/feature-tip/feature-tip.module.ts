import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSeenFeatureTip } from './entities/user-seen-feature-tip.entity';
import { FeatureTipController } from './feature-tip.controller';
import { FeatureTipService } from './feature-tip.service';
import { UserSeenFeatureTipRepository } from './user-seen-feature-tip.repository';

@Module({
    imports: [TypeOrmModule.forFeature([UserSeenFeatureTip])],
    controllers: [FeatureTipController],
    providers: [UserSeenFeatureTipRepository, FeatureTipService],
    exports: [FeatureTipService],
})
export class FeatureTipModule {}
