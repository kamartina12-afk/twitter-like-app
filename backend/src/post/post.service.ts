import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../geminiAi/ai.service';
import { FirebaseService, parseFirebaseStorageDownloadUrl } from '../firebase/firebase.service';
import { NotificationsService } from '../notifications/notification.service';

export interface CreatePostDto {
  content?: string;
  /** Single image URL or an array of image URLs (stored as JSON when multiple). */
  imageUrl?: string | string[];
  gifUrl?: string;
  videoUrl?: string;
  mediaAspectRatio?: number;
  originalPostId?: string;
  poll?: {
    question?: string;
    options: string[];
    expiresAt: string; // ISO string
  };
}

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly firebaseService: FirebaseService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Nested include for embedded original content on repost shells. */
  private originalPostInclude() {
    return {
      user: true,
      likes: true,
      views: true,
      comments: true,
      reposts: true,
      poll: {
        include: {
          options: {
            include: {
              votes: true,
            },
          },
        },
      },
    };
  }

  async create(userId: string, dto: CreatePostDto) {
    const { content, imageUrl, gifUrl, videoUrl, mediaAspectRatio, originalPostId, poll } =
      dto;

    const normalizedImageUrl: string | null =
      Array.isArray(imageUrl) && imageUrl.length > 0
        ? JSON.stringify(imageUrl)
        : !Array.isArray(imageUrl)
          ? imageUrl ?? null
          : null;

    if (
      !originalPostId &&
      !content &&
      !normalizedImageUrl &&
      !gifUrl &&
      !videoUrl &&
      !poll
    ) {
      throw new BadRequestException(
        'Post must have content, image, GIF, video or poll',
      );
    }

    if (!originalPostId) {
      const post = await this.prisma.$transaction(async (tx) => {
        const createdPost = await (tx as any).post.create({
          data: {
            content: content ?? null,
            imageUrl: normalizedImageUrl,
            gifUrl: gifUrl ?? null,
            videoUrl: videoUrl ?? null,
            mediaAspectRatio:
              mediaAspectRatio != null && !Number.isNaN(mediaAspectRatio)
                ? mediaAspectRatio
                : null,
            userId,
          } as any,
        });

        if (poll) {
          const trimmedOptions = (poll.options ?? [])
            .map((o) => o.trim())
            .filter(Boolean);
          if (trimmedOptions.length < 2) {
            throw new BadRequestException('Poll must have at least 2 options');
          }

          const expiresAt = new Date(poll.expiresAt);
          if (Number.isNaN(expiresAt.getTime())) {
            throw new BadRequestException('Invalid poll expiry time');
          }

          if (expiresAt <= new Date()) {
            throw new BadRequestException(
              'Poll expiry time must be in the future',
            );
          }

          const createdPoll = await (tx as any).poll.create({
            data: {
              question: poll.question ?? null,
              expiresAt,
              postId: createdPost.id,
            },
          });

          await (tx as any).pollOption.createMany({
            data: trimmedOptions.map((text) => ({
              text,
              pollId: createdPoll.id,
            })),
          });
        }

        return createdPost;
      });

      if (content) {
        await this.syncPostHashtags(post.id, content);
      }

      try {
        await this.handleMentionsForPost(post.id, userId, content);
      } catch {
        // Mentions are best-effort; do not break post creation.
      }

      const mentionsKittyBot = !!content && /@kittybot\b/i.test(content);
      if (mentionsKittyBot) {
        // Fire and forget; errors are handled inside
        void this.handleKittyBotReplyForPost(post.id, content);
      }

      return post;
    }

    const original = await (this.prisma as any).post.findUnique({
      where: { id: originalPostId },
      include: { originalPost: true },
    });

    if (!original) {
      throw new BadRequestException('Original post not found');
    }

    const root = original.originalPost ?? original;

    const alreadyReposted = await (this.prisma as any).post.findFirst({
      where: {
        userId,
        originalPostId: root.id,
      },
    });

    if (alreadyReposted) {
      throw new BadRequestException('Already reposted');
    }

    if (
      imageUrl != null ||
      gifUrl != null ||
      videoUrl != null ||
      poll != null ||
      (mediaAspectRatio != null && !Number.isNaN(mediaAspectRatio))
    ) {
      throw new BadRequestException(
        'Reposts may only include an optional caption; media and polls are not allowed',
      );
    }

    const repost = await (this.prisma as any).post.create({
      data: {
        content: content ?? null,
        imageUrl: null,
        gifUrl: null,
        videoUrl: null,
        mediaAspectRatio: null,
        userId,
        originalPostId: root.id,
      } as any,
    });

    if (content) {
      await this.syncPostHashtags(repost.id, content);
    }

    const mentionText = content ?? root.content ?? undefined;
    try {
      await this.handleMentionsForPost(repost.id, userId, mentionText);
    } catch {
      // Mentions are best-effort; do not break repost creation.
    }

    const mentionsKittyBot =
      !!mentionText && /@kittybot\b/i.test(mentionText);
    if (mentionsKittyBot) {
      // Fire and forget; errors are handled inside
      void this.handleKittyBotReplyForPost(repost.id, mentionText!);
    }

    return repost;
  }

  async findAll(page: number, limit: number, currentUserId?: string) {
    const skip = (page - 1) * limit;

    const userFilter =
      currentUserId != null
        ? {
            user: {
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
            },
          }
        : {};

    const [posts, total] = await Promise.all([
      (this.prisma as any).post.findMany({
        where: userFilter,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: true,
          likes: true,
          views: true,
          comments: true,
          reposts: true,
          originalPost: {
            include: this.originalPostInclude(),
          },
          poll: {
            include: {
              options: {
                include: {
                  votes: true,
                },
              },
            },
          },
          hashtags: {
            include: {
              hashtag: true,
            },
          },
        },
      }),
      (this.prisma as any).post.count({
        where: userFilter,
      }),
    ]);

    const data = posts.map((post) => this.formatPost(post, currentUserId));
    if (currentUserId) {
      await this.attachIsSavedToPosts(currentUserId, data);
    }

    return {
      data,
      page,
      limit,
      total,
      hasMore: skip + posts.length < total,
    };
  }

  async getFeed(
    userId: string,
    page: number,
    limit: number,
    type: 'for_you' | 'following' = 'for_you',
  ) {
    if (type === 'for_you') {
      return this.getForYouFeed(userId, page, limit);
    }

    const skip = (page - 1) * limit;

    // following: posts from the current user + users they follow, sorted by time
    const whereCondition = {
      OR: [
        { userId },
        {
          user: {
            followers: {
              some: { followerId: userId },
            },
          },
        },
      ],
      user: {
        blockedBy: {
          none: {
            blockerId: userId,
          },
        },
        blockedUsers: {
          none: {
            blockedId: userId,
          },
        },
      },
    };

    const [posts, total] = await Promise.all([
      (this.prisma as any).post.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: true,
          likes: true,
          views: true,
          comments: true,
          reposts: true,
          originalPost: {
            include: this.originalPostInclude(),
          },
          poll: {
            include: {
              options: {
                include: {
                  votes: true,
                },
              },
            },
          },
          hashtags: {
            include: {
              hashtag: true,
            },
          },
        },
      }),
      (this.prisma as any).post.count({ where: whereCondition }),
    ]);

    const data = posts.map((post) => this.formatPost(post, userId));
    await this.attachIsSavedToPosts(userId, data);

    return {
      data,
      page,
      limit,
      total,
      hasMore: skip + posts.length < total,
    };
  }

  async findByUser(username: string, currentUserId?: string) {
    const profileUser = await (this.prisma as any).user.findFirst({
      where: {
        OR: [{ username }, { id: username }],
      },
      select: { id: true },
    });

    if (!profileUser) {
      return [];
    }

    const posts = await (this.prisma as any).post.findMany({
      where: { userId: profileUser.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        likes: true,
        views: true,
        comments: true,
        reposts: true,
        originalPost: {
          include: this.originalPostInclude(),
        },
        poll: {
          include: {
            options: {
              include: {
                votes: true,
              },
            },
          },
        },
        hashtags: {
          include: {
            hashtag: true,
          },
        },
      },
    });

    const formatted = posts.map((post) => this.formatPost(post, currentUserId));
    if (currentUserId) {
      await this.attachIsSavedToPosts(currentUserId, formatted);
    }
    return formatted;
  }

  async findByMentions(username: string, currentUserId?: string) {
    const mentionHandle = `@${username.toLowerCase()}`;

    const whereCondition: any = {
      OR: [
        {
          content: {
            contains: mentionHandle,
            mode: 'insensitive',
          },
        },
        {
          // Reposts may not have their own `content` set; match against the original post too.
          originalPost: {
            content: {
              contains: mentionHandle,
              mode: 'insensitive',
            },
          },
        },
      ],
    };

    if (currentUserId != null) {
      whereCondition.user = {
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
    }

    const posts = await (this.prisma as any).post.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        likes: true,
        views: true,
        comments: true,
        reposts: true,
        originalPost: {
          include: this.originalPostInclude(),
        },
        poll: {
          include: {
            options: {
              include: {
                votes: true,
              },
            },
          },
        },
        hashtags: {
          include: {
            hashtag: true,
          },
        },
      },
    });

    const formatted = posts.map((post: any) =>
      this.formatPost(post, currentUserId),
    );

    if (currentUserId) {
      await this.attachIsSavedToPosts(currentUserId, formatted);
    }

    return formatted;
  }

  async findOne(id: string, currentUserId?: string) {
    const post = await (this.prisma as any).post.findUnique({
      where: { id },
      include: {
        user: true,
        likes: true,
        views: true,
        comments: true,
        reposts: true,
        originalPost: {
          include: this.originalPostInclude(),
        },
        poll: {
          include: {
            options: {
              include: {
                votes: true,
              },
            },
          },
        },
        hashtags: {
          include: {
            hashtag: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const formatted = this.formatPost(post, currentUserId);
    if (currentUserId) {
      await this.attachIsSavedToPosts(currentUserId, [formatted]);
    }
    return formatted;
  }

  async voteOnPoll(postId: string, userId: string, optionId: string) {
    const shell = await (this.prisma as any).post.findUnique({
      where: { id: postId },
      select: { originalPostId: true },
    });

    if (!shell) {
      throw new NotFoundException('Post not found');
    }

    const effectivePostId = shell.originalPostId ?? postId;

    const post = await (this.prisma as any).post.findUnique({
      where: { id: effectivePostId },
      include: {
        poll: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!post || !post.poll) {
      throw new NotFoundException('Poll not found for this post');
    }

    const now = new Date();
    if (new Date(post.poll.expiresAt) <= now) {
      throw new BadRequestException('Poll is no longer active');
    }

    const option = post.poll.options.find((opt: any) => opt.id === optionId);
    if (!option) {
      throw new BadRequestException('Invalid poll option');
    }

    const existingVote = await (this.prisma as any).pollVote.findFirst({
      where: {
        pollId: post.poll.id,
        userId,
      },
    });

    if (existingVote) {
      if (existingVote.optionId === optionId) {
        return this.findOne(postId, userId);
      }

      await (this.prisma as any).pollVote.update({
        where: { id: existingVote.id },
        data: { optionId },
      });
    } else {
      await (this.prisma as any).pollVote.create({
        data: {
          pollId: post.poll.id,
          optionId,
          userId,
        },
      });
    }

    return this.findOne(postId, userId);
  }

  async recordView(requestedPostId: string, userId: string) {
    const post = await (this.prisma as any).post.findUnique({
      where: { id: requestedPostId },
      select: {
        id: true,
        userId: true,
        originalPostId: true,
        videoUrl: true,
        originalPost: {
          select: { id: true, videoUrl: true, userId: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const videoUrl = post.videoUrl ?? post.originalPost?.videoUrl;
    const contentAuthorId = post.originalPost?.userId ?? post.userId;
    /** Repost shells have no media; count views on the original post. */
    const viewTargetPostId =
      post.originalPostId && post.originalPost?.id
        ? post.originalPost.id
        : post.id;

    // Count only reel/video views and avoid inflating with self-views.
    if (!videoUrl || contentAuthorId === userId) {
      return { recorded: false };
    }

    const result = await (this.prisma as any).postView.createMany({
      data: {
        userId,
        postId: viewTargetPostId,
      },
      skipDuplicates: true,
    });

    return { recorded: result.count > 0 };
  }

  async remove(id: string, userId: string) {
    const post = await (this.prisma as any).post.findUnique({
      where: { id },
    });

    if (!post || post.userId !== userId) {
      throw new BadRequestException('Not allowed to delete this post');
    }

    const mediaUrls: string[] = [];

    if (post.imageUrl) {
      if (typeof post.imageUrl === 'string' && post.imageUrl.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(post.imageUrl);
          if (Array.isArray(parsed)) {
            for (const u of parsed) {
              if (typeof u === 'string' && u) {
                mediaUrls.push(u);
              }
            }
          }
        } catch {
          mediaUrls.push(post.imageUrl);
        }
      } else if (typeof post.imageUrl === 'string') {
        mediaUrls.push(post.imageUrl);
      }
    }

    if (post.gifUrl) {
      mediaUrls.push(post.gifUrl);
    }

    if (post.videoUrl) {
      mediaUrls.push(post.videoUrl);
    }
    const uniqueUrls = [...new Set(mediaUrls)];

    const urlsSafeToDeleteFromStorage: string[] = [];
    for (const url of uniqueUrls) {
      if (!parseFirebaseStorageDownloadUrl(url)) {
        continue;
      }
      const otherRefs = await (this.prisma as any).post.count({
        where: {
          id: { not: id },
          OR: [{ imageUrl: url }, { gifUrl: url }, { videoUrl: url }],
        },
      });
      if (otherRefs === 0) {
        urlsSafeToDeleteFromStorage.push(url);
      }
    }

    await (this.prisma as any).post.delete({
      where: { id },
    });

    await Promise.all(
      urlsSafeToDeleteFromStorage.map((url) =>
        this.firebaseService.deleteStorageObjectByDownloadUrl(url),
      ),
    );

    return { deleted: true };
  }

  async getByHashtag(
    hashtag: string,
    page: number,
    limit: number,
    currentUserId?: string,
  ) {
    const skip = (page - 1) * limit;
    const normalized = hashtag.toLowerCase();

    const whereCondition: any = {
      hashtags: {
        some: {
          hashtag: {
            name: normalized,
          },
        },
      },
    };

    if (currentUserId) {
      whereCondition.user = {
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
    }

    const [posts, total] = await Promise.all([
      (this.prisma as any).post.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: true,
          likes: true,
          views: true,
          comments: true,
          reposts: true,
          originalPost: {
            include: this.originalPostInclude(),
          },
          poll: {
            include: {
              options: {
                include: {
                  votes: true,
                },
              },
            },
          },
          hashtags: {
            include: {
              hashtag: true,
            },
          },
        },
      }),
      (this.prisma as any).post.count({ where: whereCondition }),
    ]);

    const data = posts.map((post) => this.formatPost(post, currentUserId));
    if (currentUserId) {
      await this.attachIsSavedToPosts(currentUserId, data);
    }

    return {
      data,
      page,
      limit,
      total,
      hasMore: skip + posts.length < total,
    };
  }

  private async syncPostHashtags(postId: string, content: string) {
    const hashtags = this.extractHashtags(content);
    if (hashtags.length === 0) {
      await (this.prisma as any).postHashtag.deleteMany({
        where: { postId },
      });
      return;
    }

    const uniqueNames = Array.from(
      new Set(hashtags.map((tag) => tag.toLowerCase())),
    );

    await this.prisma.$transaction(async (tx) => {
      const existing = await (tx as any).hashtag.findMany({
        where: {
          name: {
            in: uniqueNames,
          },
        },
      });

      const existingNames = new Set(existing.map((h: any) => h.name));
      const toCreate = uniqueNames.filter((name) => !existingNames.has(name));

      if (toCreate.length > 0) {
        await (tx as any).hashtag.createMany({
          data: toCreate.map((name) => ({ name })),
          skipDuplicates: true,
        });
      }

      const allHashtags = await (tx as any).hashtag.findMany({
        where: {
          name: {
            in: uniqueNames,
          },
        },
      });

      await (tx as any).postHashtag.deleteMany({
        where: { postId },
      });

      if (allHashtags.length > 0) {
        await (tx as any).postHashtag.createMany({
          data: allHashtags.map((h: any) => ({
            postId,
            hashtagId: h.id,
          })),
          skipDuplicates: true,
        });
      }
    });
  }

  private extractHashtags(text: string | undefined): string[] {
    if (!text) return [];
    const matches = text.match(/#([\p{L}\p{N}_]+)\b/gu);
    if (!matches) return [];
    return matches.map((tag) => tag.replace(/^#/, ''));
  }

  private extractMentions(text: string | undefined): string[] {
    if (!text) return [];
    const matches = Array.from(
      text.matchAll(/@([\p{L}\p{N}_]+)\b/gu),
      (m) => m[1],
    );
    if (matches.length === 0) return [];
    return matches;
  }

  private async handleMentionsForPost(
    postId: string,
    actorId: string,
    contentText?: string,
  ) {
    if (!contentText) return;

    const mentionHandles = this.extractMentions(contentText)
      .map((h) => h.toLowerCase())
      .filter(Boolean);
    const uniqueHandles = Array.from(new Set(mentionHandles));
    if (uniqueHandles.length === 0) return;

    // Ensure KittyBot user exists so notifications can be created consistently.
    const mentionsKittyBot = uniqueHandles.includes('kittybot');
    if (mentionsKittyBot) {
      await (this.prisma as any).user.upsert({
        where: { id: 'kitty-bot' },
        update: {},
        create: {
          id: 'kitty-bot',
          email: 'kitty-bot@example.local',
          username: 'KittyBot',
          displayName: 'Kitty Bot',
        },
      });
    }

    const actor = await (this.prisma as any).user.findUnique({
      where: { id: actorId },
      select: { username: true, displayName: true },
    });
    const actorName = actor?.displayName || actor?.username || 'Someone';

    // Resolve mention handles to actual users.
    const mentionedUsers = await (this.prisma as any).user.findMany({
      where: {
        OR: uniqueHandles.map((handle: string) => ({
          username: { equals: handle, mode: 'insensitive' },
        })),
      },
      select: { id: true, username: true, displayName: true, fcmToken: true },
    });

    const receivers = mentionedUsers.filter((u: any) => u.id !== actorId);
    if (receivers.length === 0) return;

    const receiverIds = receivers.map((u: any) => u.id);

    // Respect blocks (match the same rules used when filtering feed/profile results).
    const blocks = await (this.prisma as any).block.findMany({
      where: {
        OR: [
          { blockerId: actorId, blockedId: { in: receiverIds } },
          { blockerId: { in: receiverIds }, blockedId: actorId },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });

    const blockedReceiverIds = new Set<string>();
    for (const b of blocks) {
      const receiverId = b.blockerId === actorId ? b.blockedId : b.blockerId;
      blockedReceiverIds.add(receiverId);
    }

    const href = '/(tabs)/profile?tab=mentions';
    const notificationMessage = `${actorName} mentioned you in a post.`;

    await Promise.all(
      receivers
        .filter((u: any) => !blockedReceiverIds.has(u.id))
        .map(async (receiver: any) => {
          const notification = await (this.prisma as any).notification.create({
            data: {
              userId: receiver.id,
              // Store the actor + post so clients can deep-link from the notification.
              actorId,
              type: 'mention',
              message: notificationMessage,
              postId,
            },
          });

          this.notifications.broadcastInAppNotification(
            notification.userId,
            notification,
          );

          await this.notifications.sendPushNotification(
            receiver.fcmToken,
            'New mention',
            notificationMessage,
            {
              data: {
                type: 'mention',
                href,
                postId,
              },
            },
          );
        }),
    );
  }

  private async handleKittyBotReplyForPost(postId: string, userText: string) {
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
        'Failed to generate Kitty Bot reply for post mention',
        error,
      );
      replyText =
        'Meow! I tried to reply but something went wrong. Please try tagging me again in a moment.';
    }

    await this.prisma.comment.create({
      data: {
        content: replyText,
        user: { connect: { id: kittyUser.id } },
        post: { connect: { id: postId } },
      },
    });
  }

  private async getForYouFeed(userId: string, page: number, limit: number) {
    const now = new Date();
    const baseSkip = (page - 1) * limit;

    // Target mix per page
    const percentages = {
      following: 0.4,
      recommended: 0.3,
      trending: 0.2,
      random: 0.1,
    } as const;

    const followingTarget = Math.round(limit * percentages.following);
    const recommendedTarget = Math.round(limit * percentages.recommended);
    const trendingTarget = Math.round(limit * percentages.trending);
    let randomTarget =
      limit - followingTarget - recommendedTarget - trendingTarget;

    if (randomTarget < 0) {
      randomTarget = 0;
    }

    // Fetch relationships and interests up front
    const [followingEdges, userLikedHashtags, userOwnPostHashtags] =
      await Promise.all([
        (this.prisma as any).follow.findMany({
          where: { followerId: userId },
          select: { followingId: true },
        }),
        (this.prisma as any).like.findMany({
          where: { userId },
          select: {
            post: {
              select: {
                hashtags: {
                  select: { hashtag: { select: { name: true } } },
                },
              },
            },
          },
        }),
        (this.prisma as any).post.findMany({
          where: { userId },
          select: {
            hashtags: {
              select: { hashtag: { select: { name: true } } },
            },
          },
        }),
      ]);

    const followingIds = new Set(
      followingEdges.map((f: { followingId: string }) => f.followingId),
    );

    const interestHashtags = new Set<string>();
    for (const like of userLikedHashtags as any[]) {
      for (const rel of like.post?.hashtags ?? []) {
        if (rel.hashtag?.name) {
          interestHashtags.add(rel.hashtag.name);
        }
      }
    }
    for (const post of userOwnPostHashtags as any[]) {
      for (const rel of post.hashtags ?? []) {
        if (rel.hashtag?.name) {
          interestHashtags.add(rel.hashtag.name);
        }
      }
    }

    const userFilter = {
      user: {
        blockedBy: {
          none: {
            blockerId: userId,
          },
        },
        blockedUsers: {
          none: {
            blockedId: userId,
          },
        },
      },
    };

    // We fetch a slightly larger pool for each bucket so we can de-duplicate and still hit targets.
    const oversampleFactor = 2;

    const trendingSince = new Date(now.getTime() - 1000 * 60 * 60 * 48); // last 48h

    const [followingPosts, recommendedPosts, trendingPosts, randomPosts] =
      await Promise.all([
        // Following (including own posts)
        (this.prisma as any).post.findMany({
          where: {
            OR: [
              { userId },
              {
                user: {
                  followers: {
                    some: { followerId: userId },
                  },
                },
              },
            ],
            ...userFilter,
          },
          orderBy: { createdAt: 'desc' },
          skip: baseSkip,
          take: followingTarget * oversampleFactor,
          include: {
            user: true,
            likes: true,
            views: true,
            comments: true,
            reposts: true,
            originalPost: {
              include: this.originalPostInclude(),
            },
            poll: {
              include: {
                options: {
                  include: {
                    votes: true,
                  },
                },
              },
            },
            hashtags: {
              include: {
                hashtag: true,
              },
            },
          },
        }),

        // Recommended: not followed and not self, but sharing interest hashtags
        (this.prisma as any).post.findMany({
          where: {
            userId: {
              notIn: [...followingIds, userId],
            },
            ...(interestHashtags.size
              ? {
                  hashtags: {
                    some: {
                      hashtag: {
                        name: {
                          in: Array.from(interestHashtags),
                        },
                      },
                    },
                  },
                }
              : {}),
            ...userFilter,
          },
          orderBy: { createdAt: 'desc' },
          skip: baseSkip,
          take: recommendedTarget * oversampleFactor,
          include: {
            user: true,
            likes: true,
            views: true,
            comments: true,
            reposts: true,
            originalPost: {
              include: this.originalPostInclude(),
            },
            poll: {
              include: {
                options: {
                  include: {
                    votes: true,
                  },
                },
              },
            },
            hashtags: {
              include: {
                hashtag: true,
              },
            },
          },
        }),

        // Trending: globally popular in last 48h (by likes/comments, then recency)
        (this.prisma as any).post.findMany({
          where: {
            createdAt: {
              gte: trendingSince,
            },
            ...userFilter,
          },
          orderBy: [
            { likes: { _count: 'desc' } } as any,
            { comments: { _count: 'desc' } } as any,
            { createdAt: 'desc' },
          ],
          skip: baseSkip,
          take: trendingTarget * oversampleFactor,
          include: {
            user: true,
            likes: true,
            views: true,
            comments: true,
            reposts: true,
            originalPost: {
              include: this.originalPostInclude(),
            },
            poll: {
              include: {
                options: {
                  include: {
                    votes: true,
                  },
                },
              },
            },
            hashtags: {
              include: {
                hashtag: true,
              },
            },
          },
        }),

        // Random discovery: posts from non-followed users (any time)
        (this.prisma as any).post.findMany({
          where: {
            userId: {
              notIn: [...followingIds, userId],
            },
            ...userFilter,
          },
          orderBy: { createdAt: 'desc' },
          skip: baseSkip,
          take: randomTarget * oversampleFactor,
          include: {
            user: true,
            likes: true,
            views: true,
            comments: true,
            reposts: true,
            originalPost: {
              include: this.originalPostInclude(),
            },
            poll: {
              include: {
                options: {
                  include: {
                    votes: true,
                  },
                },
              },
            },
            hashtags: {
              include: {
                hashtag: true,
              },
            },
          },
        }),
      ]);

    // Derive trending hashtags from the trending pool
    const trendingHashtagCounts = new Map<string, number>();
    for (const post of trendingPosts as any[]) {
      for (const rel of post.hashtags ?? []) {
        const name = rel.hashtag?.name;
        if (!name) continue;
        trendingHashtagCounts.set(
          name,
          (trendingHashtagCounts.get(name) ?? 0) + 1,
        );
      }
    }
    const trendingHashtags = new Set(
      Array.from(trendingHashtagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name]) => name),
    );

    const seen = new Set<string>();

    const scorePost = (post: any) =>
      this.scorePostForUser(
        post,
        userId,
        interestHashtags,
        trendingHashtags,
        now,
      );

    const pickFromBucket = (bucket: any[], target: number) => {
      const scored = bucket
        .filter((p) => !seen.has(p.id))
        .map((p) => ({ post: p, score: scorePost(p) }))
        .sort((a, b) => b.score - a.score);

      const picked: any[] = [];
      for (const item of scored) {
        if (picked.length >= target) break;
        seen.add(item.post.id);
        picked.push(item.post);
      }
      return picked;
    };

    const followingPicked = pickFromBucket(
      followingPosts as any[],
      followingTarget,
    );
    const recommendedPicked = pickFromBucket(
      recommendedPosts as any[],
      recommendedTarget,
    );
    const trendingPicked = pickFromBucket(
      trendingPosts as any[],
      trendingTarget,
    );
    const randomPicked = pickFromBucket(randomPosts as any[], randomTarget);

    // If some buckets are under-filled, try to top up from others
    const allBuckets = [
      followingPosts as any[],
      recommendedPosts as any[],
      trendingPosts as any[],
      randomPosts as any[],
    ];
    const combinedPicked = [
      ...followingPicked,
      ...recommendedPicked,
      ...trendingPicked,
      ...randomPicked,
    ];

    if (combinedPicked.length < limit) {
      const flatRemaining = allBuckets
        .flat()
        .filter((p) => !seen.has(p.id))
        .map((p) => ({ post: p, score: scorePost(p) }))
        .sort((a, b) => b.score - a.score);

      for (const item of flatRemaining) {
        if (combinedPicked.length >= limit) break;
        seen.add(item.post.id);
        combinedPicked.push(item.post);
      }
    }

    const data = combinedPicked.map((post) => this.formatPost(post, userId));
    await this.attachIsSavedToPosts(userId, data);

    // For now we treat "total" as approximate and infer hasMore from whether we could fill this page.
    return {
      data,
      page,
      limit,
      total: baseSkip + data.length,
      hasMore: data.length === limit,
    };
  }

  private scorePostForUser(
    post: any,
    userId: string,
    interestHashtags: Set<string>,
    trendingHashtags: Set<string>,
    now: Date,
  ): number {
    const likesCount = post.likes?.length ?? 0;
    const commentsCount = post.comments?.length ?? 0;
    const repostsCount = post.reposts?.length ?? 0;

    const createdAt = new Date(post.createdAt);
    const ageMs = now.getTime() - createdAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    let hashtagScore = 0;
    for (const rel of post.hashtags ?? []) {
      const name = rel.hashtag?.name;
      if (!name) continue;
      if (interestHashtags.has(name)) {
        hashtagScore += 8;
      }
      if (trendingHashtags.has(name)) {
        hashtagScore += 10;
      }
    }

    // Time decay: newer posts get a boost, fading after ~48h
    const freshnessWindowHours = 48;
    const freshness =
      ageHours >= freshnessWindowHours
        ? 0
        : (freshnessWindowHours - ageHours) / freshnessWindowHours;

    const engagementScore =
      likesCount * 3 + commentsCount * 5 + repostsCount * 4;

    let baseScore = engagementScore + hashtagScore + freshness * 20;

    // Slight boost if from the current user (matters when buckets overlap/topping up)
    if (post.userId === userId) {
      baseScore += 5;
    }

    return baseScore;
  }

  private formatPoll(poll: any, currentUserId?: string) {
    if (!poll) return null;
    const isActive = poll.expiresAt
      ? new Date(poll.expiresAt) > new Date()
      : false;
    const totalVotes =
      poll.options?.reduce(
        (sum: number, opt: any) => sum + (opt.votes?.length ?? 0),
        0,
      ) ?? 0;
    const currentUserVoteOptionId = currentUserId
      ? poll.options?.find((opt: any) =>
          opt.votes?.some((v: any) => v.userId === currentUserId),
        )?.id
      : undefined;
    return {
      id: poll.id,
      question: poll.question,
      expiresAt: poll.expiresAt,
      isActive,
      totalVotes,
      options:
        poll.options?.map((opt: any) => ({
          id: opt.id,
          text: opt.text,
          votesCount: opt.votes?.length ?? 0,
        })) ?? [],
      currentUserVoteOptionId: currentUserVoteOptionId,
    };
  }

  private formatPost(post: any, currentUserId?: string) {
    const decodeImageUrls = (raw: any): string[] | null => {
      if (!raw || typeof raw !== 'string') return null;
      const trimmed = raw.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            const urls = parsed.filter(
              (u) => typeof u === 'string' && u.trim().length > 0,
            );
            return urls.length ? urls : null;
          }
          return null;
        } catch {
          return null;
        }
      }
      return [trimmed];
    };

    const imageUrls = decodeImageUrls(post.imageUrl);
    const originalImageUrls = decodeImageUrls(post.originalPost?.imageUrl);

    const root = post.originalPost;
    /** Whether the current user has reposted the underlying content (tracked on the root post). */
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
      imageUrl: imageUrls,
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
      originalPostImageUrl: originalImageUrls?.[0] ?? null,
      originalPostGifUrl: post.originalPost?.gifUrl,
      originalPostVideoUrl: post.originalPost?.videoUrl,
      originalPostMediaAspectRatio: post.originalPost?.mediaAspectRatio,
      originalPostPoll: this.formatPoll(post.originalPost?.poll, currentUserId),
      hashtags:
        post.hashtags
          ?.map((relation: any) => relation.hashtag?.name)
          .filter(Boolean) ?? [],
      poll: this.formatPoll(post.poll, currentUserId),
    };
  }

  private async attachIsSavedToPosts(
    userId: string,
    posts: { id: string }[],
  ): Promise<void> {
    if (!posts.length) return;
    const ids = posts.map((p) => p.id);
    const rows = await (this.prisma as any).savedPost.findMany({
      where: { userId, postId: { in: ids } },
      select: { postId: true },
    });
    const savedIds = new Set(
      rows.map((r: { postId: string }) => r.postId),
    );
    for (const p of posts) {
      (p as { isSaved?: boolean }).isSaved = savedIds.has(p.id);
    }
  }
}
