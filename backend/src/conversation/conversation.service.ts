import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notification.service';

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listForUser(userId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                content: true,
                createdAt: true,
                senderId: true,
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    const allOtherUserIds = Array.from(
      new Set(
        participants.flatMap((p) =>
          p.conversation.participants
            .map((x) => x.user.id)
            .filter((id) => id !== userId),
        ),
      ),
    );

    const blocks = allOtherUserIds.length
      ? await (this.prisma as any).block.findMany({
          where: {
            OR: [
              {
                blockerId: userId,
                blockedId: { in: allOtherUserIds },
              },
              {
                blockerId: { in: allOtherUserIds },
                blockedId: userId,
              },
            ],
          },
        })
      : [];

    return participants.map((p) => {
      const conv = p.conversation;
      const otherParticipants = conv.participants.filter(
        (x) => x.userId !== userId,
      );
      const lastMessage = conv.messages[0] ?? null;

      const lastReadAt = p.lastReadAt;
      const hasUnread =
        !!lastMessage &&
        lastMessage.senderId !== userId &&
        (!lastReadAt || lastMessage.createdAt > lastReadAt);

      let isBlocked = false;
      let blockedByMe = false;
      let blockedByOther = false;
      let hasBlockedParticipants = false;

      if (conv.type === 'direct' && otherParticipants.length === 1) {
        const otherId = otherParticipants[0].userId;
        blockedByMe = blocks.some(
          (b: any) => b.blockerId === userId && b.blockedId === otherId,
        );
        blockedByOther = blocks.some(
          (b: any) => b.blockerId === otherId && b.blockedId === userId,
        );
        isBlocked = blockedByMe || blockedByOther;
      } else if (conv.type === 'group') {
        hasBlockedParticipants = conv.participants.some((x) =>
          blocks.some(
            (b: any) =>
              (b.blockerId === userId && b.blockedId === x.user.id) ||
              (b.blockerId === x.user.id && b.blockedId === userId),
          ),
        );
      }

      return {
        id: conv.id,
        type: conv.type,
        updatedAt: conv.updatedAt,
        participants: conv.participants.map((x) => ({
          userId: x.user.id,
          username: x.user.username,
          displayName: x.user.displayName,
          avatarUrl: x.user.avatarUrl,
        })),
        otherParticipants,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
            }
          : null,
        hasUnread,
        isBlocked,
        blockedByMe,
        blockedByOther,
        hasBlockedParticipants,
      };
    });
  }

  async getUnreadSummary(userId: string) {
    const participations = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });

    let totalUnreadConversations = 0;
    let totalUnreadMessages = 0;

    for (const part of participations) {
      const unreadCount = await this.prisma.message.count({
        where: {
          conversationId: part.conversationId,
          senderId: { not: userId },
          ...(part.lastReadAt ? { createdAt: { gt: part.lastReadAt } } : {}),
        },
      });

      if (unreadCount > 0) {
        totalUnreadConversations += 1;
        totalUnreadMessages += unreadCount;
      }
    }

    return {
      totalUnreadConversations,
      totalUnreadMessages,
    };
  }

  async findOne(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Conversation not found');
    }

    const conv = participant.conversation;

    const otherUserIds = conv.participants
      .map((p) => p.user.id)
      .filter((id) => id !== userId);

    let isBlocked = false;
    let blockedByMe = false;
    let blockedByOther = false;
    let hasBlockedParticipants = false;

    if (otherUserIds.length > 0) {
      const blocks = await (this.prisma as any).block.findMany({
        where: {
          OR: [
            {
              blockerId: userId,
              blockedId: { in: otherUserIds },
            },
            {
              blockerId: { in: otherUserIds },
              blockedId: userId,
            },
          ],
        },
      });

      if (conv.type === 'direct' && otherUserIds.length === 1) {
        const otherId = otherUserIds[0];
        blockedByMe = blocks.some(
          (b: any) => b.blockerId === userId && b.blockedId === otherId,
        );
        blockedByOther = blocks.some(
          (b: any) => b.blockerId === otherId && b.blockedId === userId,
        );
        isBlocked = blockedByMe || blockedByOther;
      } else if (conv.type === 'group') {
        hasBlockedParticipants = conv.participants.some((p) =>
          blocks.some(
            (b: any) =>
              (b.blockerId === userId && b.blockedId === p.user.id) ||
              (b.blockerId === p.user.id && b.blockedId === userId),
          ),
        );
      }
    }

    return {
      id: conv.id,
      type: conv.type,
      updatedAt: conv.updatedAt,
      participants: conv.participants.map((p) => ({
        userId: p.user.id,
        username: p.user.username,
        displayName: p.user.displayName,
        avatarUrl: p.user.avatarUrl,
      })),
      isBlocked,
      blockedByMe,
      blockedByOther,
      hasBlockedParticipants,
    };
  }

  /** Get or create a direct conversation between two users. */
  async getOrCreateDirect(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new ForbiddenException('Cannot create conversation with yourself');
    }

    const myParticipations = await this.prisma.conversationParticipant.findMany(
      {
        where: { userId, conversation: { type: 'direct' } },
        include: { conversation: true },
      },
    );

    for (const p of myParticipations) {
      const count = await this.prisma.conversationParticipant.count({
        where: { conversationId: p.conversationId },
      });
      if (count !== 2) continue;
      const other = await this.prisma.conversationParticipant.findFirst({
        where: { conversationId: p.conversationId, userId: otherUserId },
      });
      if (other) {
        return this.findOne(p.conversationId, userId);
      }
    }

    const otherExists = await this.prisma.user.findUnique({
      where: { id: otherUserId },
    });
    if (!otherExists) {
      throw new NotFoundException('User not found');
    }

    const block = await (this.prisma as any).block.findFirst({
      where: {
        OR: [
          {
            blockerId: userId,
            blockedId: otherUserId,
          },
          {
            blockerId: otherUserId,
            blockedId: userId,
          },
        ],
      },
    });

    if (block) {
      throw new ForbiddenException('Cannot create conversation with this user');
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        type: 'direct',
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return {
      id: conversation.id,
      type: conversation.type,
      updatedAt: conversation.updatedAt,
      participants: conversation.participants.map((p) => ({
        userId: p.user.id,
        username: p.user.username,
        displayName: p.user.displayName,
        avatarUrl: p.user.avatarUrl,
      })),
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) {
      throw new NotFoundException('Conversation not found');
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.conversationParticipant.update({
        where: {
          conversationId_userId: { conversationId, userId },
        },
        data: {
          lastReadAt: now,
        },
      }),
      this.prisma.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          createdAt: { lte: now },
          status: { in: ['sent', 'delivered'] },
        },
        data: {
          status: 'read',
        },
      }),
    ]);

    return { ok: true };
  }

  async createGroup(ownerId: string, memberUserIds: string[], name?: string) {
    const uniqueMembers = Array.from(
      new Set(memberUserIds.filter((id) => id !== ownerId)),
    );

    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueMembers } },
      select: { id: true },
    });
    const existingIds = new Set(users.map((u) => u.id));
    const validMemberIds = uniqueMembers.filter((id) => existingIds.has(id));

    const conversation = await this.prisma.conversation.create({
      data: {
        type: 'group',
        participants: {
          create: [{ userId: ownerId }],
        },
      },
    });

    const follows = await this.prisma.follow.findMany({
      where: {
        followerId: { in: validMemberIds },
        followingId: ownerId,
      },
      select: { followerId: true },
    });
    const followerIds = new Set(follows.map((f) => f.followerId));

    const directParticipants = validMemberIds.filter((id) =>
      followerIds.has(id),
    );
    const needsInvite = validMemberIds.filter((id) => !followerIds.has(id));

    if (directParticipants.length > 0) {
      await this.prisma.conversationParticipant.createMany({
        data: directParticipants.map((userId) => ({
          conversationId: conversation.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    if (needsInvite.length > 0) {
      const owner = await this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { username: true, displayName: true },
      });
      const actorName = owner?.displayName || owner?.username || 'Someone';
      const groupName = name || 'group chat';

      const invites = await this.prisma.$transaction(
        needsInvite.map((inviteeId) =>
          (this.prisma as any).groupInvite.create({
            data: {
              conversationId: conversation.id,
              inviterId: ownerId,
              inviteeId,
            },
          }),
        ),
      );

      const notifications = await this.prisma.$transaction(
        invites.map((invite: any) =>
          (this.prisma as any).notification.create({
            data: {
              userId: invite.inviteeId,
              type: 'system',
              message: `GROUP_INVITE|${invite.id}|${conversation.id}|${groupName}|${actorName}`,
            },
          }),
        ),
      );

      notifications.forEach((n: any) => {
        this.notifications.broadcastInAppNotification(n.userId, n);
      });

      const targetUsers = await this.prisma.user.findMany({
        where: { id: { in: notifications.map((n: any) => n.userId) } },
        select: { id: true, fcmToken: true },
      });

      await Promise.all(
        targetUsers.map((user) =>
          this.notifications.sendPushNotification(
            (user as any).fcmToken,
            'Group chat invite',
            `${actorName} invited you to join ${groupName}.`,
            {
              data: {
                type: 'group_invite',
                href: '/notifications',
                conversationId: conversation.id,
              },
            },
          ),
        ),
      );
    }

    const full = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return {
      id: full.id,
      type: full.type,
      updatedAt: full.updatedAt,
      participants: full.participants.map((p) => ({
        userId: p.user.id,
        username: p.user.username,
        displayName: p.user.displayName,
        avatarUrl: p.user.avatarUrl,
      })),
    };
  }

  async respondToGroupInvite(
    inviteId: string,
    userId: string,
    action: 'accept' | 'deny',
  ) {
    const invite = await (this.prisma as any).groupInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.inviteeId !== userId) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'pending') {
      return { ok: false };
    }

    const now = new Date();

    if (action === 'accept') {
      await this.prisma.$transaction([
        (this.prisma as any).groupInvite.update({
          where: { id: inviteId },
          data: { status: 'accepted', respondedAt: now },
        }),
        this.prisma.conversationParticipant.create({
          data: {
            conversationId: invite.conversationId,
            userId,
          },
        }),
      ]);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, displayName: true },
      });
      const actorName = user?.displayName || user?.username || 'Someone';
      await this.prisma.message.create({
        data: {
          conversationId: invite.conversationId,
          senderId: userId,
          content: `SYSTEM:USER_JOINED|${actorName}`,
        },
      });
      return { ok: true, status: 'accepted' };
    }

    await (this.prisma as any).groupInvite.update({
      where: { id: inviteId },
      data: { status: 'declined', respondedAt: now },
    });

    return { ok: true, status: 'declined' };
  }

  async leaveGroup(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, type: true },
    });

    if (!conversation || conversation.type !== 'group') {
      throw new NotFoundException('Group conversation not found');
    }

    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    await this.prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    return { ok: true };
  }
}
