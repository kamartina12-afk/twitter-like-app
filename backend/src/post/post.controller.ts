import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { PostService } from './post.service';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';

interface AuthRequest extends Request {
  user: { uid: string; email?: string };
}

@Controller('posts')
@UseGuards(FirebaseAuthGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  create(
    @Req() req: AuthRequest,
    @Body()
    dto: {
      content?: string;
      imageUrl?: string | string[];
      gifUrl?: string;
      videoUrl?: string;
      mediaAspectRatio?: number;
      originalPostId?: string;
      poll?: {
        question?: string;
        options: string[];
        expiresAt: string;
      };
    },
  ) {
    return this.postService.create(req.user.uid, dto);
  }

  @Get()
  findAll(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);

    return this.postService.findAll(pageNum, limitNum, req.user.uid);
  }

  @Get('feed')
  getFeed(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: 'for_you' | 'following',
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    const feedType = type === 'following' ? 'following' : 'for_you';

    return this.postService.getFeed(req.user.uid, pageNum, limitNum, feedType);
  }

  @Get('explore')
  getExplore(
    @Req() req: AuthRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);

    // For now we reuse the "for_you" feed which already mixes
    // recommended posts based on liked hashtags and interests.
    return this.postService.getFeed(req.user.uid, pageNum, limitNum, 'for_you');
  }

  @Get('by-hashtag/:name')
  getByHashtag(
    @Req() req: AuthRequest,
    @Param('name') name: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);

    return this.postService.getByHashtag(name, pageNum, limitNum, req.user.uid);
  }

  @Get('user/:username')
  findByUser(@Req() req: AuthRequest, @Param('username') username: string) {
    return this.postService.findByUser(username, req.user?.uid);
  }

  @Get('mentions/:username')
  findByMentions(
    @Req() req: AuthRequest,
    @Param('username') username: string,
  ) {
    return this.postService.findByMentions(username, req.user.uid);
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postService.findOne(id, req.user.uid);
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postService.remove(id, req.user.uid);
  }

  @Post(':id/poll/vote')
  voteOnPoll(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: { optionId: string },
  ) {
    if (!body?.optionId) {
      throw new BadRequestException('optionId is required');
    }
    return this.postService.voteOnPoll(id, req.user.uid, body.optionId);
  }

  @Post(':id/view')
  recordView(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postService.recordView(id, req.user.uid);
  }
}
