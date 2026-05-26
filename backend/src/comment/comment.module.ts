import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { CommentLikeController } from './comment-like.controller';
import { AiModule } from '../geminiAi/ai.module';
import { NotificationsModule } from '../notifications/notification.module';

@Module({
  imports: [AiModule, NotificationsModule],
  providers: [CommentService],
  controllers: [CommentController, CommentLikeController],
})
export class CommentModule {}
