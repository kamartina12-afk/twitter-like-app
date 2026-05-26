import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notification.service';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private readonly MAX_MESSAGE_TEXT_LENGTH = 2000;
  private readonly MAX_ATTACHMENTS_PER_MESSAGE = 5;
  // 50 MB per attachment
  private readonly MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;
  // 200 MB combined across all attachments
  private readonly MAX_TOTAL_ATTACHMENTS_SIZE_BYTES = 200 * 1024 * 1024;

  private extractMentions(text: string | undefined): string[] {
    if (!text) return [];
    const matches = Array.from(
      text.matchAll(/@([\p{L}\p{N}_]+)\b/gu),
      (m) => m[1]?.toLowerCase(),
    ).filter(Boolean) as string[];
    return Array.from(new Set(matches));
  }

  async create(conversationId: string, senderId: string, content: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: senderId },
      },
    });

    if (!participant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type === 'direct') {
      const other = conversation.participants.find(
        (p) => p.userId !== senderId,
      );
      if (other) {
        const block = await (this.prisma as any).block.findFirst({
          where: {
            OR: [
              {
                blockerId: senderId,
                blockedId: other.userId,
              },
              {
                blockerId: other.userId,
                blockedId: senderId,
              },
            ],
          },
        });

        if (block) {
          throw new ForbiddenException(
            'You cannot send messages in this conversation because one of you has blocked the other.',
          );
        }
      }
    }

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      throw new BadRequestException('Message content cannot be empty');
    }

    // Content is usually a JSON payload with { text, attachments }
    // but we are defensive in case plain strings are sent.
    let text: string = trimmedContent;
    let attachments: Array<{ size?: number }> = [];

    try {
      const parsed = JSON.parse(trimmedContent);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.text === 'string') {
          text = parsed.text;
        }
        if (Array.isArray(parsed.attachments)) {
          attachments = parsed.attachments;
        }
      }
    } catch {
      // not JSON, fall back to raw text
    }

    const safeText = (text ?? '').trim();

    if (safeText.length > this.MAX_MESSAGE_TEXT_LENGTH) {
      throw new BadRequestException(
        `Message is too long (max ${this.MAX_MESSAGE_TEXT_LENGTH} characters).`,
      );
    }

    if (attachments.length > this.MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new BadRequestException(
        `Too many attachments (max ${this.MAX_ATTACHMENTS_PER_MESSAGE} per message).`,
      );
    }

    const sizes = attachments
      .map((a) => (typeof a.size === 'number' && a.size > 0 ? a.size : 0))
      .filter((s) => s > 0);

    if (sizes.some((s) => s > this.MAX_ATTACHMENT_SIZE_BYTES)) {
      throw new BadRequestException(
        `Attachments must be smaller than ${(
          this.MAX_ATTACHMENT_SIZE_BYTES /
          (1024 * 1024)
        ).toFixed(0)} MB each.`,
      );
    }

    const totalSize = sizes.reduce((sum, s) => sum + s, 0);
    if (totalSize > this.MAX_TOTAL_ATTACHMENTS_SIZE_BYTES) {
      throw new BadRequestException(
        `Attachments are too large in total (max ${(
          this.MAX_TOTAL_ATTACHMENTS_SIZE_BYTES /
          (1024 * 1024)
        ).toFixed(0)} MB per message).`,
      );
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: trimmedContent,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Create notifications for other participants in the conversation
    try {
      const participants = await this.prisma.conversationParticipant.findMany({
        where: {
          conversationId,
          userId: { not: senderId },
        },
        select: {
          userId: true,
        },
      });

      if (participants.length > 0) {
        const participantIds = participants.map((p) => p.userId);

        // Do not send notifications to users who have blocked the sender.
        const blocks = await (this.prisma as any).block.findMany({
          where: {
            blockerId: { in: participantIds },
            blockedId: senderId,
          },
        });

        const recipients = participants.filter(
          (p) =>
            !blocks.some(
              (b: any) => b.blockerId === p.userId && b.blockedId === senderId,
            ),
        );

        if (recipients.length > 0) {
          const sender = await this.prisma.user.findUnique({
            where: { id: senderId },
            select: {
              username: true,
              displayName: true,
            },
          });

          const actorName = sender?.displayName || sender?.username || 'Someone';
          const recipientIds = recipients.map((p) => p.userId);
          const chatHref = `/(tabs)/chat?conversationId=${encodeURIComponent(conversationId)}`;

          let mentionRecipientIds = new Set<string>();
          if (conversation.type === 'group') {
            const mentionHandles = this.extractMentions(safeText);
            if (mentionHandles.length > 0) {
              const mentionedUsers = await (this.prisma as any).user.findMany({
                where: {
                  id: { in: recipientIds },
                  OR: mentionHandles.map((handle) => ({
                    username: { equals: handle, mode: 'insensitive' },
                  })),
                },
                select: { id: true, fcmToken: true },
              });
              mentionRecipientIds = new Set(mentionedUsers.map((u: any) => u.id));

              if (mentionRecipientIds.size > 0) {
                const mentionMessage = `${actorName} mentioned you in a group chat.`;
                const mentionNotifications = await this.prisma.$transaction(
                  Array.from(mentionRecipientIds).map((mentionedId) =>
                    (this.prisma as any).notification.create({
                      data: {
                        userId: mentionedId,
                        type: 'mention',
                        message: mentionMessage,
                      },
                    }),
                  ),
                );

                mentionNotifications.forEach((n: any) => {
                  this.notifications.broadcastInAppNotification(n.userId, n);
                });

                await Promise.all(
                  mentionedUsers.map((user: any) =>
                    this.notifications.sendPushNotification(
                      user.fcmToken,
                      'Mention in group chat',
                      mentionMessage,
                      {
                        data: {
                          type: 'mention',
                          href: chatHref,
                          conversationId,
                        },
                      },
                    ),
                  ),
                );
              }
            }
          }

          const messageRecipients = recipients.filter((p) => !mentionRecipientIds.has(p.userId));
          if (messageRecipients.length > 0) {
            const notificationMessage = `${actorName} sent you a message.`;
            const notifications = await this.prisma.$transaction(
              messageRecipients.map((p) =>
                (this.prisma as any).notification.create({
                  data: {
                    userId: p.userId,
                    type: 'message',
                    message: notificationMessage,
                  },
                }),
              ),
            );

            notifications.forEach((n: any) => {
              this.notifications.broadcastInAppNotification(n.userId, n);
            });

            const targetUsers = await this.prisma.user.findMany({
              where: { id: { in: messageRecipients.map((p) => p.userId) } },
              select: { id: true, fcmToken: true },
            });

            await Promise.all(
              targetUsers.map((user) =>
                this.notifications.sendPushNotification(
                  user.fcmToken,
                  'New message',
                  notificationMessage,
                  {
                    data: {
                      type: 'message',
                      href: chatHref,
                    },
                  },
                ),
              ),
            );
          }
        }
      }
    } catch {
      // ignore notification failures
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      status: message.status,
      createdAt: message.createdAt,
      sender: message.sender,
    };
  }

  async findByConversation(
    conversationId: string,
    userId: string,
    before?: string,
    limit = 50,
  ) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    const cursor = before
      ? await this.prisma.message.findUnique({
          where: { id: before, conversationId },
        })
      : null;

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      take: limit,
      ...(cursor ? { cursor: { id: before! }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return messages
      .map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content,
        status: m.status,
        createdAt: m.createdAt,
        sender: m.sender,
      }))
      .reverse();
  }
}
