import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { AiModule } from '../geminiAi/ai.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { NotificationsModule } from '../notifications/notification.module';

@Module({
  imports: [AiModule, FirebaseModule, NotificationsModule],
  providers: [PostService],
  controllers: [PostController],
  exports: [PostService],
})
export class PostModule {}
