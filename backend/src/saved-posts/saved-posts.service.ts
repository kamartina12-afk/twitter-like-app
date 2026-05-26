import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SavedPostsService {
  constructor(private readonly prisma: PrismaService) {}

  async toggleSavedPost(
    userId: string,
    postId: string,
    collectionName?: string | null,
  ) {
    const trimmedName = collectionName?.trim() ?? null;

    // If no collection name is provided at all, treat as "global" toggle:
    // - If the post is saved in any collection (or unsorted), remove all entries.
    // - Otherwise create a single unsorted saved post (no collection).
    if (trimmedName === null) {
      const existingAny = await (this.prisma as any).savedPost.findFirst({
        where: { userId, postId },
      });

      if (existingAny) {
        await (this.prisma as any).savedPost
          .deleteMany({
            where: { userId, postId },
          })
          .catch(() => null);

        return { saved: false };
      }

      await (this.prisma as any).savedPost.create({
        data: {
          user: { connect: { id: userId } },
          post: { connect: { id: postId } },
        },
      });

      return { saved: true };
    }

    // Special token for "no collection" from the UI dialog – only toggle the unsorted entry
    if (trimmedName === '__NO_COLLECTION__') {
      const existingUnsorted = await (this.prisma as any).savedPost.findFirst({
        where: { userId, postId, collectionId: null },
      });

      if (existingUnsorted) {
        await (this.prisma as any).savedPost
          .delete({
            where: { id: existingUnsorted.id },
          })
          .catch(() => null);
      } else {
        await (this.prisma as any).savedPost.create({
          data: {
            user: { connect: { id: userId } },
            post: { connect: { id: postId } },
          },
        });
      }

      const stillSaved = await (this.prisma as any).savedPost.count({
        where: { userId, postId },
      });

      return { saved: stillSaved > 0 };
    }

    // Normal named collection: toggle membership in that specific collection only
    const collection = await (this.prisma as any).savedCollection.upsert({
      where: {
        userId_name: {
          userId,
          name: trimmedName,
        },
      },
      update: {},
      create: {
        userId,
        name: trimmedName,
      },
    });

    const existingInCollection = await (this.prisma as any).savedPost.findFirst(
      {
        where: { userId, postId, collectionId: collection.id },
      },
    );

    if (existingInCollection) {
      await (this.prisma as any).savedPost
        .delete({
          where: { id: existingInCollection.id },
        })
        .catch(() => null);
    } else {
      await (this.prisma as any).savedPost.create({
        data: {
          user: { connect: { id: userId } },
          post: { connect: { id: postId } },
          collection: { connect: { id: collection.id } },
        },
      });
    }

    const stillSaved = await (this.prisma as any).savedPost.count({
      where: { userId, postId },
    });

    return { saved: stillSaved > 0 };
  }

  async getSavedPostsForUser(userId: string) {
    const saved = await (this.prisma as any).savedPost.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            user: true,
            likes: true,
            views: true,
            comments: true,
            reposts: true,
            originalPost: {
              include: {
                user: true,
                likes: true,
                views: true,
                comments: true,
                reposts: true,
              },
            },
          },
        },
        collection: true,
      },
    });

    // Group by post id so each post appears once, with all its collections
    const byPostId = new Map<
      string,
      { post: any; collectionNames: string[]; inUnsorted: boolean }
    >();
    for (const item of saved) {
      const existing = byPostId.get(item.postId);
      const collectionName = item.collection?.name ?? null;
      const inUnsorted = !collectionName;
      if (existing) {
        if (collectionName) existing.collectionNames.push(collectionName);
        existing.inUnsorted = existing.inUnsorted || inUnsorted;
      } else {
        byPostId.set(item.postId, {
          post: item.post,
          collectionNames: collectionName ? [collectionName] : [],
          inUnsorted,
        });
      }
    }

    return Array.from(byPostId.values()).map(({ post, collectionNames, inUnsorted }) => ({
      ...this.formatPost(post, userId),
      isSaved: true,
      collectionName: collectionNames[0] ?? null,
      collectionNames,
      inUnsorted,
    }));
  }

  async getCollectionsForUser(userId: string) {
    const collections = await (this.prisma as any).savedCollection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        savedPosts: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            post: {
              include: {
                user: true,
                likes: true,
                views: true,
                comments: true,
                reposts: true,
                originalPost: {
              include: {
                user: true,
                likes: true,
                views: true,
                comments: true,
                reposts: true,
              },
            },
              },
            },
          },
        },
      },
    });

    return collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      coverPost:
        collection.savedPosts.length > 0
          ? this.formatPost(collection.savedPosts[0].post, userId)
          : null,
    }));
  }

  async renameCollection(
    userId: string,
    collectionId: string,
    newName: string,
  ) {
    const trimmed = newName.trim();
    if (!trimmed) {
      throw new NotFoundException('Collection name cannot be empty');
    }

    const existing = await (this.prisma as any).savedCollection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Collection not found');
    }

    const updated = await (this.prisma as any).savedCollection.update({
      where: { id: collectionId },
      data: { name: trimmed },
    });

    return { id: updated.id, name: updated.name };
  }

  async deleteCollection(userId: string, collectionId: string) {
    const existing = await (this.prisma as any).savedCollection.findFirst({
      where: { id: collectionId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Collection not found');
    }

    await (this.prisma as any).savedCollection.delete({
      where: { id: collectionId },
    });

    return { success: true };
  }

  private formatPost(post: any, currentUserId?: string) {
    const root = post.originalPost;
    const repostEngagementSource = root ?? post;

    const isReposted =
      !!currentUserId &&
      (repostEngagementSource.reposts?.some((r: any) => r.userId === currentUserId) ||
        (post.userId === currentUserId && !!post.originalPostId));

    const reposterId = root ? post.user?.id : undefined;
    const reposterUsername = root ? post.user?.username : undefined;

    return {
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      gifUrl: post.gifUrl,
      videoUrl: post.videoUrl,
      mediaAspectRatio: post.mediaAspectRatio,
      createdAt: post.createdAt,

      authorId: post.user?.id,
      authorUsername: post.user?.username,
      authorDisplayName: post.user?.displayName ?? post.user?.username,
      avatarUrl: post.user?.avatarUrl,

      likesCount: post.likes?.length ?? 0,
      viewsCount: post.views?.length ?? 0,
      repliesCount: post.comments?.length ?? 0,
      repostsCount: post.reposts?.length ?? 0,

      isLiked: currentUserId
        ? post.likes?.some((l: any) => l.userId === currentUserId)
        : false,
      isReposted,

      isRepost: !!post.originalPost,
      reposterId,
      reposterUsername,
      originalPostId: post.originalPost?.id,
      originalAuthorId: post.originalPost?.user?.id,
      originalAuthorUsername: post.originalPost?.user?.username,
      originalPostContent: post.originalPost?.content,
      originalPostImageUrl: post.originalPost?.imageUrl,
      originalPostGifUrl: post.originalPost?.gifUrl,
      originalPostVideoUrl: post.originalPost?.videoUrl,
      originalPostMediaAspectRatio: post.originalPost?.mediaAspectRatio,
    };
  }
}
