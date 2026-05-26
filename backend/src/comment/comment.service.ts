import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../geminiAi/ai.service';
import { NotificationsService } from '../notifications/notification.service';

type CommentRow = {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  postId: string;
  parentId: string | null;
  user: {
    id: string;
    username: string;
    displayName: string | null;
  };
  _count: { likes: number };
};

type CommentLikeDelegate = {
  findFirst: (args: {
    where: { userId: string; commentId: string };
  }) => Promise<{ id: string } | null>;
  findMany: (args: {
    where: { userId: string; commentId: { in: string[] } };
    select: { commentId: true };
  }) => Promise<{ commentId: string }[]>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
  create: (args: {
    data: {
      user: { connect: { id: string } };
      comment: { connect: { id: string } };
    };
  }) => Promise<unknown>;
};

/** `comment_likes` delegate — align with runtime Prisma client when generated `.d.ts` is stale in the IDE. */
function commentLikes(db: PrismaService): CommentLikeDelegate {
  return (db as unknown as { commentLike: CommentLikeDelegate }).commentLike;
}

export type CommentThreadNode = {
  id: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  user: { id: string; username: string; displayName: string | null };
  likesCount: number;
  isLikedByMe: boolean;
  replies: CommentThreadNode[];
};

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(
    userId: string,
    postId: string,
    content: string,
    parentId?: string | null,
  ) {
    const shell = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!shell) {
      throw new NotFoundException('Post not found');
    }

    if (parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: parentId, postId },
        select: { id: true, userId: true },
      });
      if (!parent) {
        throw new BadRequestException('Parent comment not found on this post');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content,
        user: { connect: { id: userId } },
        post: { connect: { id: postId } },
        ...(parentId ? { parent: { connect: { id: parentId } } } : undefined),
      },
      include: {
        user: true,
      },
    });

    await this.notifyForNewComment({
      userId,
      postId,
      commentId: comment.id,
      parentId: parentId ?? null,
    });

    const mentionsKittyBot = /@kittybot\b/i.test(content);

    if (mentionsKittyBot) {
      await this.handleKittyBotReply(postId, content);
    }

    return this.formatOneComment(comment.id, userId);
  }

  private async notifyForNewComment(params: {
    userId: string;
    postId: string;
    commentId: string;
    parentId: string | null;
  }) {
    const { userId, postId, commentId, parentId } = params;

    try {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: { userId: true },
      });

      const commenter = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          username: true,
          displayName: true,
        },
      });

      const actorName =
        commenter?.displayName || commenter?.username || 'Someone';

      if (parentId) {
        const parent = await this.prisma.comment.findUnique({
          where: { id: parentId },
          select: { userId: true },
        });
        if (parent && parent.userId !== userId) {
          const message = `${actorName} replied to your comment.`;
          const notification = await this.prisma.notification.create({
            data: {
              userId: parent.userId,
              type: 'comment_reply',
              message,
              postId,
              commentId,
            } as Prisma.NotificationUncheckedCreateInput,
          });
          this.notifications.broadcastInAppNotification(
            notification.userId,
            notification,
          );
          const targetUser = await this.prisma.user.findUnique({
            where: { id: parent.userId },
            select: { fcmToken: true },
          });
          await this.notifications.sendPushNotification(
            targetUser?.fcmToken,
            'New reply',
            message,
            {
              data: this.pushDataForPostComment(postId, commentId),
            },
          );
        }
        return;
      }

      if (post && post.userId !== userId) {
        const notificationMessage = `${actorName} commented on your post.`;

        const notification = await this.prisma.notification.create({
          data: {
            userId: post.userId,
            type: 'comment',
            message: notificationMessage,
            postId,
            commentId,
          } as Prisma.NotificationUncheckedCreateInput,
        });

        this.notifications.broadcastInAppNotification(
          notification.userId,
          notification,
        );

        const targetUser = await this.prisma.user.findUnique({
          where: { id: post.userId },
          select: { fcmToken: true },
        });

        await this.notifications.sendPushNotification(
          targetUser?.fcmToken,
          'New comment',
          notificationMessage,
          {
            data: this.pushDataForPostComment(postId, commentId),
          },
        );
      }
    } catch {
      // ignore notification failures
    }
  }

  private pushDataForPostComment(postId: string, commentId: string) {
    return {
      type: 'comment',
      href: `/post/${postId}?focusCommentId=${commentId}`,
      postId,
      commentId,
    };
  }

  async findByPost(
    postId: string,
    currentUserId: string,
  ): Promise<CommentThreadNode[]> {
    const shell = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!shell) {
      throw new NotFoundException('Post not found');
    }

    const rows = (await this.prisma.comment.findMany({
      where: { postId },
      include: {
        user: {
          select: { id: true, username: true, displayName: true },
        },
        _count: { select: { likes: true } },
      },
    } as Parameters<PrismaClient['comment']['findMany']>[0])) as CommentRow[];

    const ids = rows.map((r) => r.id);
    const likedRows =
      ids.length === 0
        ? []
        : await commentLikes(this.prisma).findMany({
            where: {
              userId: currentUserId,
              commentId: { in: ids },
            },
            select: { commentId: true },
          });
    const likedSet = new Set(likedRows.map((l) => l.commentId));

    const map = new Map<string, CommentRow>();
    for (const r of rows) {
      map.set(r.id, {
        id: r.id,
        content: r.content,
        createdAt: r.createdAt,
        userId: r.userId,
        postId: r.postId,
        parentId: r.parentId,
        user: r.user,
        _count: { likes: r._count.likes },
      });
    }

    const toNode = (row: CommentRow): CommentThreadNode => ({
      id: row.id,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      parentId: row.parentId,
      user: row.user,
      likesCount: row._count.likes,
      isLikedByMe: likedSet.has(row.id),
      replies: [],
    });

    const byParent = new Map<string | null, CommentRow[]>();
    for (const row of map.values()) {
      const k = row.parentId;
      if (!byParent.has(k)) byParent.set(k, []);
      byParent.get(k)!.push(row);
    }

    for (const arr of byParent.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }

    const buildTree = (parentKey: string | null): CommentThreadNode[] => {
      const children = byParent.get(parentKey) ?? [];
      return children.map((row) => {
        const node = toNode(row);
        node.replies = buildTree(row.id);
        return node;
      });
    };

    const roots = buildTree(null);
    roots.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return roots;
  }

  async toggleLike(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: { select: { id: true, userId: true } },
        user: { select: { id: true } },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existing = await commentLikes(this.prisma).findFirst({
      where: { userId, commentId },
    });

    if (existing) {
      await commentLikes(this.prisma).delete({ where: { id: existing.id } });
      return { liked: false };
    }

    await commentLikes(this.prisma).create({
      data: {
        user: { connect: { id: userId } },
        comment: { connect: { id: commentId } },
      },
    });

    try {
      if (comment.userId !== userId) {
        const liker = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, displayName: true },
        });
        const actorName = liker?.displayName || liker?.username || 'Someone';
        const message = `${actorName} liked your comment.`;

        const notification = await this.prisma.notification.create({
          data: {
            userId: comment.userId,
            type: 'comment_like',
            message,
            postId: comment.postId,
            commentId,
          } as Prisma.NotificationUncheckedCreateInput,
        });

        this.notifications.broadcastInAppNotification(
          notification.userId,
          notification,
        );

        const targetUser = await this.prisma.user.findUnique({
          where: { id: comment.userId },
          select: { fcmToken: true },
        });

        await this.notifications.sendPushNotification(
          targetUser?.fcmToken,
          'Comment liked',
          message,
          {
            data: {
              type: 'comment_like',
              href: `/post/${comment.postId}?focusCommentId=${commentId}`,
              postId: comment.postId,
              commentId,
            },
          },
        );
      }
    } catch {
      // ignore notification failures
    }

    return { liked: true };
  }

  private async formatOneComment(commentId: string, currentUserId: string) {
    const row = (await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: { select: { id: true, username: true, displayName: true } },
        _count: { select: { likes: true } },
      },
    } as Parameters<
      PrismaClient['comment']['findUnique']
    >[0])) as CommentRow | null;
    if (!row) {
      throw new NotFoundException('Comment not found');
    }
    const liked = await commentLikes(this.prisma).findFirst({
      where: { userId: currentUserId, commentId },
    });
    return {
      id: row.id,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      parentId: row.parentId,
      user: row.user,
      likesCount: row._count.likes,
      isLikedByMe: !!liked,
      replies: [],
    };
  }

  private async handleKittyBotReply(postId: string, userText: string) {
    const kittyUser = await this.prisma.user.upsert({
      where: { id: 'kitty-bot' },
      update: {},
      create: {
        id: 'kitty-bot',
        email: 'kitty-bot@example.local',
        username: 'KittyBot',
        displayName: 'Kitty Bot',
      },
    });

    let replyText: string;
    try {
      replyText = await this.aiService.chat(`User: ${userText}\nKitty Bot:`);
      replyText =
        replyText.trim() ||
        'Meow! My whiskers got a bit tangled there. Try asking me again in a slightly different way.';
    } catch (error) {
      console.error(
        'Failed to generate Kitty Bot reply for comment mention',
        error,
      );
      replyText =
        'Meow! I tried to reply but something went wrong. Please tag me again in a moment.';
    }

    await this.prisma.comment.create({
      data: {
        content: replyText,
        user: { connect: { id: kittyUser.id } },
        post: { connect: { id: postId } },
      },
    });
  }
}
