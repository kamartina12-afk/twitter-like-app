import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Param,
  Delete,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guard';
import { NotificationsService } from './notification.service';
import { UsersService } from '../users/users.service';

@UseGuards(FirebaseAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private usersService: UsersService,
  ) {}

  @Post('token')
  async saveToken(
    @CurrentUser() user: { uid: string; email?: string },
    @Body() body: { token: string },
  ) {
    const token = typeof body.token === 'string' ? body.token.trim() : '';

    if (user.email) {
      await this.usersService.syncFirebaseUser(user.uid, user.email);
    } else {
      const row = await this.prisma.user.findUnique({
        where: { id: user.uid },
      });
      if (!row) {
        throw new BadRequestException(
          'User profile is not synced yet; complete registration or call POST /users/me first.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Ensure one device token is mapped to only one account.
      if (token) {
        await tx.user.updateMany({
          where: {
            id: { not: user.uid },
            fcmToken: token,
          },
          data: { fcmToken: null },
        });
      }

      return tx.user.update({
        where: { id: user.uid },
        data: { fcmToken: token || null } as Prisma.UserUpdateInput,
      });
    });
  }

  @Get()
  async listNotifications(
    @CurrentUser() user: { uid: string },
    @Query('type') type?: string,
  ) {
    const where: any = { userId: user.uid };
    if (type && type !== 'all') {
      where.type = type;
    }

    return (this.prisma as any).notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: { uid: string }) {
    const count = await (this.prisma as any).notification.count({
      where: {
        userId: user.uid,
        readAt: null,
      },
    });

    return { count };
  }

  @Post('mark-read')
  async markAllAsRead(@CurrentUser() user: { uid: string }) {
    await (this.prisma as any).notification.updateMany({
      where: {
        userId: user.uid,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  @Post(':id/read')
  async markOneAsRead(
    @CurrentUser() user: { uid: string },
    @Param('id') id: string,
  ) {
    const updated = await (this.prisma as any).notification.updateMany({
      where: {
        id,
        userId: user.uid,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { success: true, updated: updated.count };
  }

  @Delete(':id')
  async deleteOne(
    @CurrentUser() user: { uid: string },
    @Param('id') id: string,
  ) {
    const deleted = await (this.prisma as any).notification.deleteMany({
      where: {
        id,
        userId: user.uid,
        NOT: {
          readAt: null,
        },
      },
    });

    return { success: true, deleted: deleted.count };
  }

  @Post('birthdays/run')
  async sendBirthdayNotifications() {
    return this.notifications.sendBirthdayNotificationsForToday();
  }
}
