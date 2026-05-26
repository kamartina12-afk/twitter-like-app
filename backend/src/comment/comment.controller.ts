import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CommentService } from './comment.service';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';

interface AuthRequest extends Request {
  user: { uid: string; email?: string };
}

@Controller('comments')
@UseGuards(FirebaseAuthGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post(':postId')
  async create(
    @Req() req: AuthRequest,
    @Param('postId') postId: string,
    @Body() body: { content: string; parentId?: string | null },
  ) {
    return this.commentService.create(
      req.user.uid,
      postId,
      body.content,
      body.parentId ?? undefined,
    );
  }

  @Get(':postId')
  async findByPost(
    @Req() req: AuthRequest,
    @Param('postId') postId: string,
  ) {
    return this.commentService.findByPost(postId, req.user.uid);
  }
}
