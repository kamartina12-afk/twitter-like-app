import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Eye, Play } from 'lucide-react-native';
import { ExpoVideoPlayer } from '@/components/media/ExpoVideoPlayer';
import type { FeedPost } from '@/components/post/feed/types/types';
import {
  buildMasonryColumns,
  getExploreGridMedia,
  GRID_COLUMNS,
} from '@/components/explore/exploreGrid.utils';
import { exploreMasonryStyles } from '@/components/explore/ExploreMasonryGrid.styled';
import { exploreMasonryLabels } from '@/components/explore/ExploreMasonryGrid.labels';

type ExploreMasonryGridProps = {
  posts: FeedPost[];
  horizontalPadding?: number;
  gap?: number;
  onPressCell: (post: FeedPost, isVideo: boolean) => void;
  onNearEnd?: () => void;
};

export const ExploreMasonryGrid: React.FC<ExploreMasonryGridProps> = ({
  posts,
  horizontalPadding = 6,
  gap = 6,
  onPressCell,
  onNearEnd,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [previewPostId, setPreviewPostId] = useState<string | null>(null);

  const innerWidth = windowWidth - horizontalPadding * 2;
  const columnWidth = Math.floor(
    (innerWidth - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  );

  const columns = useMemo(
    () => buildMasonryColumns(posts, columnWidth, gap, GRID_COLUMNS),
    [posts, columnWidth, gap],
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!onNearEnd) return;
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const paddingToBottom = 240;
      const near =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;
      if (near) {
        onNearEnd();
      }
    },
    [onNearEnd],
  );

  const handleCellPress = useCallback(
    (post: FeedPost, isVideo: boolean) => {
      onPressCell(post, isVideo);
    },
    [onPressCell],
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={400}
      contentContainerStyle={[
        exploreMasonryStyles.scrollContent,
        { paddingHorizontal: horizontalPadding },
      ]}
    >
      <View style={exploreMasonryStyles.row}>
        {columns.map((column, colIdx) => (
          <View
            key={`col-${colIdx}`}
            style={[
              exploreMasonryStyles.column,
              { width: columnWidth },
              colIdx < columns.length - 1 ? { marginRight: gap } : null,
            ]}
          >
            {column.map(({ post, height }, cellIdx) => {
              const media = getExploreGridMedia(post);
              if (!media.uri) {
                return null;
              }

              const cellKey = `${post.id}-${colIdx}-${cellIdx}-${media.isVideo ? 'video' : 'image'}`;

              return (
                <Pressable
                  key={cellKey}
                  onPress={() => handleCellPress(post, media.isVideo)}
                  onLongPress={
                    media.isVideo ? () => setPreviewPostId(post.id) : undefined
                  }
                  onPressOut={
                    media.isVideo ? () => setPreviewPostId(null) : undefined
                  }
                  delayLongPress={140}
                  hitSlop={6}
                  style={({ pressed }) => [
                    exploreMasonryStyles.cell,
                    {
                      width: '100%',
                      height,
                      marginBottom: cellIdx < column.length - 1 ? gap : 0,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  {media.isVideo ? (
                    <>
                      <ExpoVideoPlayer
                        uri={media.uri}
                        style={exploreMasonryStyles.cellImage}
                        contentFit="cover"
                        nativeControls={false}
                        autoplay={previewPostId === post.id}
                        loop
                        muted
                      />
                      <View
                        style={exploreMasonryStyles.videoOverlay}
                        accessibilityLabel={exploreMasonryLabels.videoCellHint}
                        pointerEvents="none"
                      >
                        <View style={exploreMasonryStyles.playButtonCircle}>
                          <Play size={22} color="#fff" fill="#fff" />
                        </View>
                        {previewPostId === post.id ? (
                          <View style={exploreMasonryStyles.previewViewsPill}>
                            <Eye size={14} color="#e2e8f0" />
                            <Text style={exploreMasonryStyles.previewViewsText}>
                              {post.viewsCount ?? 0}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </>
                  ) : (
                    <Image
                      source={{ uri: media.uri }}
                      style={exploreMasonryStyles.cellImage}
                      resizeMode="cover"
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};
