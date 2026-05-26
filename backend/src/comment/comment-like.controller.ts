import { Controller, Post, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { CommentService } from './comment.service';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';

interface AuthRequest extends Request {
  user: { uid: string; email?: string };
}

@Controller('comment-likes')
@UseGuards(FirebaseAuthGuard)
export class CommentLikeController {
  constructor(private readonly commentService: CommentService) {}

  @Post(':commentId')
  async toggle(
    @Req() req: AuthRequest,
    @Param('commentId') commentId: string,
  ) {
    return this.commentService.toggleLike(req.user.uid, commentId);
  }
}
