import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface MentionUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(uid: string, email: string, username: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id: uid },
    });

    if (existing) {
      return existing;
    }

    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      throw new BadRequestException('Username is already taken');
    }

    return this.prisma.user.create({
      data: {
        id: uid,
        email,
        username,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async search(currentUserId: string, query: string) {
    if (!query || query.length < 2) {
      return [];
    }

    const users = await (this.prisma as any).user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
        // Do not return users that the current user has blocked
        blockedBy: {
          none: {
            blockerId: currentUserId,
          },
        },
      },
      take: 10,
    });

    return users.map((user: any) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName ?? undefined,
      email: user.email,
      bio: user.bio ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
    }));
  }

  async getProfile(userId: string) {
    const [user, totalLikesReceived, totalVideoViewsReceived] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          posts: true,
          followers: true,
          following: true,
        },
      }),
      (this.prisma as any).like.count({
        where: {
          post: {
            userId,
          },
        },
      }),
      (this.prisma as any).postView.count({
        where: {
          post: {
            userId,
            videoUrl: {
              not: null,
            },
          },
        },
      }),
    ]);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName ?? undefined,
      email: user.email,
      bio: user.bio ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      coverUrl: (user as any).coverUrl ?? undefined,
      birthDate: (user as any).birthDate ?? undefined,
      country: (user as any).country ?? undefined,
      createdAt: user.createdAt,
      postsCount: user.posts.length,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      totalLikesReceived,
      totalVideoViewsReceived,
    };
  }

  async getProfileByUsername(username: string, viewerId?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { id: username }],
      },
      include: {
        posts: true,
        followers: true,
        following: true,
      },
    });

    if (!user) {
      return null;
    }

    const isOwnProfile = viewerId && viewerId === user.id;

    let isMutualFollower = false;

    if (viewerId && !isOwnProfile) {
      const [followsViewerToUser, followsUserToViewer] = await Promise.all([
        this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: user.id,
            },
          },
        }),
        this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: user.id,
              followingId: viewerId,
            },
          },
        }),
      ]);

      isMutualFollower = !!followsViewerToUser && !!followsUserToViewer;
    }

    const result: any = {
      id: user.id,
      username: user.username,
      displayName: user.displayName ?? undefined,
      email: user.email,
      bio: user.bio ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      coverUrl: (user as any).coverUrl ?? undefined,
      createdAt: user.createdAt,
      postsCount: user.posts.length,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      country: (user as any).country ?? undefined,
      isMutualFollower,
    };

    if (isOwnProfile || isMutualFollower) {
      result.birthDate = (user as any).birthDate ?? undefined;
    }

    return result;
  }

  async updateProfile(
    userId: string,
    updates: {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      coverUrl?: string;
      birthDate?: string | null;
      country?: string | null;
    },
  ) {
    const data: any = {
      displayName: updates.displayName,
      bio: updates.bio,
      avatarUrl: updates.avatarUrl,
      coverUrl: updates.coverUrl,
    };

    if (typeof updates.birthDate !== 'undefined') {
      if (updates.birthDate) {
        const d = new Date(updates.birthDate);
        if (Number.isNaN(d.getTime())) {
          throw new BadRequestException('Invalid birth date');
        }

        const today = new Date();
        let age = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
          age--;
        }

        if (age < 10) {
          throw new BadRequestException('User must be at least 10 years old');
        }

        data.birthDate = d;
      } else {
        data.birthDate = null;
      }
    }

    if (typeof updates.country !== 'undefined') {
      data.country = updates.country ?? null;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.getProfile(userId);
  }

  async syncFirebaseUser(
    id: string,
    email: string,
    birthDate?: string,
    username?: string,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (existing) {
      return existing;
    }

    let parsedBirthDate: Date | undefined;

    if (birthDate) {
      const d = new Date(birthDate);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException('Invalid birth date');
      }

      const today = new Date();
      let age = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
        age--;
      }

      if (age < 10) {
        throw new BadRequestException('User must be at least 10 years old');
      }

      parsedBirthDate = d;
    }

    const preferredUsername = username?.trim();
    const normalizedUsername = preferredUsername || email.split('@')[0];

    if (preferredUsername) {
      const existingUsername = await this.prisma.user.findUnique({
        where: { username: preferredUsername },
      });

      if (existingUsername && existingUsername.id !== id) {
        throw new BadRequestException('Username is already taken');
      }
    }

    const data: any = {
      id,
      email,
      username: normalizedUsername,
    };

    if (parsedBirthDate) {
      data.birthDate = parsedBirthDate;
    }

    return this.prisma.user.create({
      data,
    });
  }

  async getMutualFollowersForMentions(
    currentUserId: string,
    query?: string,
  ): Promise<MentionUser[]> {
    const where: any = {
      id: { not: currentUserId },
      followers: {
        some: {
          followerId: currentUserId,
        },
      },
      following: {
        some: {
          followingId: currentUserId,
        },
      },
      // Do not suggest users that are blocked in either direction
      blockedBy: {
        none: {
          blockerId: currentUserId,
        },
      },
      blockedUsers: {
        none: {
          blockedId: currentUserId,
        },
      },
    };

    if (query && query.trim().length > 0) {
      const q = query.trim();
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await (this.prisma as any).user.findMany({
      where,
      take: 10,
      orderBy: {
        username: 'asc',
      },
    });

    const mutuals: MentionUser[] = users.map((user: any) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName ?? undefined,
      avatarUrl: user.avatarUrl ?? null,
    }));

    const kittyBot: MentionUser = {
      id: 'kitty-bot',
      username: 'KittyBot',
      displayName: 'Kitty Bot',
      avatarUrl: null,
    };

    const normalizedQuery = query?.trim().toLowerCase() ?? '';

    const includeKitty =
      !normalizedQuery ||
      'kittybot'.includes(normalizedQuery) ||
      'kitty bot'.includes(normalizedQuery);

    return includeKitty ? [kittyBot, ...mutuals] : mutuals;
  }
}
