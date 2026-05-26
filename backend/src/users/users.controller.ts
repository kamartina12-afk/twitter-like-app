import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { FollowService } from '../follow/follow.service';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';

interface AuthRequest extends Request {
  user: {
    uid: string;
    email?: string;
  };
}

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly followService: FollowService,
  ) {}

  @Get('search')
  search(@Req() req: AuthRequest, @Query('q') query: string) {
    return this.usersService.search(req.user.uid, query);
  }

  @Get('mentions')
  getMentionSuggestions(
    @Req() req: AuthRequest,
    @Query('q') query?: string,
  ): Promise<
    {
      id: string;
      username: string;
      displayName?: string;
      avatarUrl?: string | null;
    }[]
  > {
    return this.usersService.getMutualFollowersForMentions(req.user.uid, query);
  }

  @Get('profile')
  getProfile(@Req() req: AuthRequest) {
    return this.usersService.getProfile(req.user.uid);
  }

  @Patch('profile')
  updateProfile(
    @Req() req: AuthRequest,
    @Body()
    updateDto: {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      coverUrl?: string;
      birthDate?: string | null;
      country?: string | null;
    },
  ) {
    return this.usersService.updateProfile(req.user.uid, updateDto);
  }

  @Post(':userId/follow')
  async follow(@Req() req: AuthRequest, @Param('userId') userId: string) {
    await this.followService.follow(req.user.uid, userId);
    return { message: 'User followed successfully' };
  }

  @Post(':userId/unfollow')
  async unfollow(@Req() req: AuthRequest, @Param('userId') userId: string) {
    await this.followService.unfollow(req.user.uid, userId);
    return { message: 'User unfollowed successfully' };
  }

  @Post('me')
  async syncUser(
    @Req() req: AuthRequest,
    @Body() body: { birthDate?: string; username?: string },
  ) {
    return this.usersService.syncFirebaseUser(
      req.user.uid,
      req.user.email!,
      body?.birthDate,
      body?.username,
    );
  }

  @Get(':username')
  async getByUsername(
    @Req() req: AuthRequest,
    @Param('username') username: string,
  ) {
    const profile = await this.usersService.getProfileByUsername(
      username,
      req.user.uid,
    );

    if (!profile) {
      return null;
    }

    const followers = await this.followService.getFollowers(profile.id);

    const isFollowing = followers.some(
      (follow) => follow.follower?.id === req.user.uid,
    );

    return {
      ...profile,
      isFollowing,
    };
  }
}
