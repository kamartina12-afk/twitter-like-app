import { Module, forwardRef } from '@nestjs/common';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { NotificationsModule } from '../notifications/notification.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  providers: [FollowService],
  controllers: [FollowController],
  exports: [FollowService],
})
export class FollowModule {}
