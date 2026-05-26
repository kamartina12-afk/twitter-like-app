import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { NotificationsGateway } from './notification.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly gateway: NotificationsGateway,
    private readonly prisma: PrismaService,
  ) {}

  private isExpoPushToken(token: string) {
    return /^ExponentPushToken\[[^\]]+\]$/.test(token);
  }

  private isProbablyFcmToken(token: string) {
    // Heuristic: FCM registration tokens are long opaque strings.
    // We explicitly exclude Expo push tokens and obvious APNs hex tokens.
    if (this.isExpoPushToken(token)) return false;
    if (/^[a-f0-9]{64}$/i.test(token)) return false; // APNs device token
    return token.length >= 100;
  }

  private async sendExpoPushNotification(params: {
    token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }) {
    // Expo push service endpoint. No auth needed for basic usage.
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.token,
        title: params.title,
        body: params.body,
        sound: 'default',
        channelId: 'default',
        ...(params.data && Object.keys(params.data).length > 0
          ? { data: params.data }
          : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Expo push send failed (${res.status}): ${text || res.statusText}`,
      );
    }
  }

  async sendPushNotification(
    token: string | null | undefined,
    title: string,
    body: string,
    options?: { data?: Record<string, string> },
  ) {
    if (!token) {
      return;
    }

    const data = options?.data
      ? Object.fromEntries(
          Object.entries(options.data).map(([k, v]) => [k, String(v ?? '')]),
        )
      : undefined;

    try {
      if (this.isExpoPushToken(token)) {
        await this.sendExpoPushNotification({ token, title, body, data });
        return;
      }

      if (!this.isProbablyFcmToken(token)) {
        // Unknown/unsupported token type; don't attempt firebase-admin send.
        return;
      }

      await admin.messaging().send({
        token,
        notification: { title, body },
        ...(data && Object.keys(data).length > 0 ? { data } : {}),
      });
    } catch (error) {
      console.error('Failed to send push notification', error);
    }
  }

  broadcastInAppNotification(userId: string, payload: unknown) {
    try {
      this.gateway.emitNotification(userId, payload);
    } catch (error) {
      console.error('Failed to broadcast in-app notification', error);
    }
  }

  async sendBirthdayNotificationsForToday() {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const usersWithBirthdays = await (this.prisma as any).user.findMany({
      where: {
        birthDate: {
          not: null,
        },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        birthDate: true,
      },
    });

    for (const birthdayUser of usersWithBirthdays) {
      if (!birthdayUser.birthDate) continue;

      const birthDate = new Date(birthdayUser.birthDate);
      if (
        birthDate.getMonth() !== todayMonth ||
        birthDate.getDate() !== todayDate
      ) {
        continue;
      }

      const followers = await this.prisma.follow.findMany({
        where: { followingId: birthdayUser.id },
        select: { followerId: true },
      });

      const following = await this.prisma.follow.findMany({
        where: { followerId: birthdayUser.id },
        select: { followingId: true },
      });

      const followingSet = new Set(following.map((f) => f.followingId));
      const mutualFollowerIds = followers
        .map((f) => f.followerId)
        .filter((id) => followingSet.has(id));

      if (!mutualFollowerIds.length) continue;

      const mutualUsers = await (this.prisma as any).user.findMany({
        where: { id: { in: mutualFollowerIds } },
        select: { id: true, fcmToken: true },
      });

      const displayName = birthdayUser.displayName || birthdayUser.username;
      const handle = `@${birthdayUser.username}`;
      const message = `It's ${handle}'s birthday today! Tap to wish them a happy birthday.`;

      for (const target of mutualUsers) {
        const notification = await (this.prisma as any).notification.create({
          data: {
            userId: target.id,
            type: 'system',
            message,
          },
        });

        this.broadcastInAppNotification(notification.userId, notification);

        await this.sendPushNotification(
          target.fcmToken,
          'Birthday',
          `Wish ${displayName} a happy birthday!`,
        );
      }
    }

    return { success: true };
  }
}
