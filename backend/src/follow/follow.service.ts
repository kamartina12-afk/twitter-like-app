import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notification.service';

@Injectable()
export class FollowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const existing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (existing) {
      return { followed: false };
    }

    await this.prisma.follow.create({
      data: {
        follower: { connect: { id: followerId } },
        following: { connect: { id: followingId } },
      },
    });

    // Create a notification for the user being followed
    try {
      const follower = await this.prisma.user.findUnique({
        where: { id: followerId },
        select: {
          username: true,
          displayName: true,
        },
      });

      const actorName =
        follower?.displayName || follower?.username || 'Someone';

      const notificationMessage = `${actorName} started following you.`;

      const notification = await (this.prisma as any).notification.create({
        data: {
          userId: followingId,
          // Store the actor so the mobile app can deep-link to the follower's profile.
          actorId: followerId,
          type: 'follow',
          message: notificationMessage,
        },
      });

      this.notifications.broadcastInAppNotification(
        notification.userId,
        notification,
      );

      const targetUser: { fcmToken: string | null } | null = await (
        this.prisma as any
      ).user.findUnique({
        where: { id: followingId },
        select: { fcmToken: true },
      });

      await this.notifications.sendPushNotification(
        targetUser?.fcmToken,
        'New follower',
        notificationMessage,
        {
          data: {
            type: 'follow',
            href: `/profile/${followerId}`,
          },
        },
      );
    } catch {
      // ignore notification failures
    }

    return { followed: true };
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow
      .delete({
        where: {
          followerId_followingId: { followerId, followingId },
        },
      })
      .catch(() => null);

    return { unfollowed: true };
  }

  async getFollowers(userId: string) {
    return this.prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFollowing(userId: string) {
    return this.prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
