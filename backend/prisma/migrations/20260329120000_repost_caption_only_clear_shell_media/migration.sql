-- Repost rows must not store copied media; engagement lives on the root post.
UPDATE "posts"
SET
  "imageUrl" = NULL,
  "gifUrl" = NULL,
  "videoUrl" = NULL,
  "mediaAspectRatio" = NULL
WHERE "originalPostId" IS NOT NULL;
