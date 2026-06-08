import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPreference } from './entities/user-preference.entity';
import { UserPreferenceRepository } from './user-preference.repository';
import { UserPreferenceService } from './user-preference.service';

@Module({
    imports: [TypeOrmModule.forFeature([UserPreference])],
    providers: [UserPreferenceRepository, UserPreferenceService],
    exports: [UserPreferenceRepository, UserPreferenceService],
})
export class UserPreferenceModule {}
