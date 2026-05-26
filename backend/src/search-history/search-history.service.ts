import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateHistoryInput {
  userId: string;
  query: string;
  targetId?: string | null;
  type: 'user' | 'hashtag' | 'post';
}

@Injectable()
export class SearchHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getHistoryForUser(userId: string, limit = 25) {
    const items = await (this.prisma as any).searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const userTargetIds = items
      .filter((item: any) => item.type === 'user' && item.targetId)
      .map((item: any) => item.targetId as string);

    const uniqueUserIds = Array.from(new Set(userTargetIds));

    const users =
      uniqueUserIds.length > 0
        ? await (this.prisma as any).user.findMany({
            where: { id: { in: uniqueUserIds } },
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          })
        : [];

    const userMap = new Map<
      string,
      {
        id: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
      }
    >(users.map((u: any) => [u.id, u]));

    return items
      .map((item: any) => {
        if (item.type === 'user') {
          if (!item.targetId) {
            return null;
          }
          const user = userMap.get(item.targetId);
          if (!user) {
            return null;
          }
          return {
            type: 'user' as const,
            historyId: item.id,
            query: item.query,
            id: user.id,
            username: user.username,
            displayName: user.displayName ?? undefined,
            avatarUrl: user.avatarUrl ?? undefined,
          };
        }

        if (item.type === 'hashtag') {
          return {
            type: 'hashtag' as const,
            historyId: item.id,
            query: item.query,
          };
        }

        if (item.type === 'post' && item.targetId) {
          return {
            type: 'post' as const,
            historyId: item.id,
            query: item.query,
            targetId: item.targetId,
          };
        }

        return null;
      })
      .filter(
        (
          item,
        ): item is
          | {
              type: 'user';
              historyId: string;
              query: string;
              id: string;
              username: string;
              displayName?: string;
              avatarUrl?: string | null;
            }
          | { type: 'hashtag'; historyId: string; query: string }
          | { type: 'post'; historyId: string; query: string; targetId: string } => !!item,
      );
  }

  async addEntry(input: CreateHistoryInput) {
    const { userId, query, targetId, type } = input;

    // Ensure we only keep a single entry per (userId, type, targetId) pair
    const dedupeWhere: any = {
      userId,
      type,
      targetId: targetId == null ? null : targetId,
    };

    await (this.prisma as any).searchHistory.deleteMany({
      where: dedupeWhere,
    });

    const created = await (this.prisma as any).searchHistory.create({
      data: {
        userId,
        query,
        targetId: targetId ?? null,
        type,
      },
    });

    return { id: created.id };
  }

  async deleteEntry(userId: string, historyId: string) {
    const result = await (this.prisma as any).searchHistory.deleteMany({
      where: {
        id: historyId,
        userId,
      },
    });

    return { success: true, deleted: result.count };
  }

  async clearHistory(userId: string) {
    const result = await (this.prisma as any).searchHistory.deleteMany({
      where: { userId },
    });

    return { success: true, deleted: result.count };
  }
}
