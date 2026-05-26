import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HashtagsService {
  constructor(private prisma: PrismaService) {}

  async search(query: string) {
    const trimmed = (query ?? '').trim().toLowerCase();
    if (!trimmed) {
      return [];
    }

    return (this.prisma as any).hashtag.findMany({
      where: {
        name: {
          startsWith: trimmed,
          mode: 'insensitive',
        },
      },
      take: 8,
      orderBy: {
        name: 'asc',
      },
    });
  }

  async trending(
    limit = 10,
    daysWindow = 1,
    scope: 'global' | 'country' = 'global',
    userId?: string,
  ) {
    const now = new Date();
    const since = new Date(now.getTime() - daysWindow * 24 * 60 * 60 * 1000);

    let country: string | null = null;

    if (scope === 'country' && userId) {
      const user = await (this.prisma as any).user.findUnique({
        where: { id: userId },
        select: { country: true },
      });
      country = user?.country ?? null;
    }

    const where: any = {
      post: {
        createdAt: {
          gte: since,
        },
      },
    };

    if (scope === 'country' && country) {
      where.post.user = {
        country,
      };
    }

    const groups = await (this.prisma as any).postHashtag.groupBy({
      by: ['hashtagId'],
      where,
      _count: {
        hashtagId: true,
      },
      orderBy: {
        _count: {
          hashtagId: 'desc',
        },
      },
      take: limit,
    });

    if (!groups.length) {
      return [];
    }

    const hashtagIds = groups.map((g: any) => g.hashtagId);

    const hashtags = await (this.prisma as any).hashtag.findMany({
      where: {
        id: {
          in: hashtagIds,
        },
      },
    });

    const byId = new Map<string, any>();
    for (const h of hashtags) {
      byId.set(h.id, h);
    }

    return groups
      .map((g: any) => {
        const hashtag = byId.get(g.hashtagId);
        if (!hashtag) return null;
        return {
          id: hashtag.id,
          name: hashtag.name,
          postsCount: g._count.hashtagId as number,
        };
      })
      .filter(
        (item): item is { id: string; name: string; postsCount: number } =>
          !!item,
      );
  }
}
