import { View, Pressable, Text, Alert } from 'react-native';
import SavePlusSingleIcon from '../../../assets/icons/SavePlusSingle.svg';
import SaveMinusMultipleIcon from '../../../assets/icons/SaveMinusMultiple.svg';
import { Repeat2, Heart, MessageCircle, Trash2 } from 'lucide-react-native';
import styles from './PostCard.styles';
import { usePostActions } from '@/hooks/post/usePostActions';
import { PostActionsProps } from './types/types';
import { useAuth } from '@/contexts/AuthContext';

const SIDEBAR_ICON = '#f8fafc';

export default function PostActions({
  post,
  onCommentPress,
  onBookmarkPress,
  variant = 'default',
}: PostActionsProps) {
  const { user } = useAuth();
  const { likeMutation, repostMutation, deleteMutation } = usePostActions();
  const isOwnPost = !!post.authorId && user?.uid === post.authorId;
  const isReelVariant = variant === 'reel';
  const isSidebar = variant === 'reelSidebar';
  const isReelRow = variant === 'reelRow';

  const replies = post.repliesCount ?? 0;
  const reposts = post.repostsCount ?? 0;
  const likes = post.likesCount ?? 0;
  const isSaved = !!post.isSaved;
  const isReposted = !!post.isReposted;
  const isUserRepostHighlighted = isReposted && reposts > 0;
  const repostTargetId =
    post.isRepost && post.originalPostId ? post.originalPostId : post.id;

  if (isReelRow) {
    return (
      <View style={styles.reelRowActions}>
        <Pressable
          style={({ pressed }) => [
            styles.reelRowActionCol,
            pressed && styles.reelSidebarIconBtnPressed,
          ]}
          onPress={() =>
            likeMutation.mutate({
              postId: post.id,
              isLiked: !!post.isLiked,
            })
          }
          disabled={likeMutation.isPending}
          hitSlop={10}
        >
          <View style={styles.reelSidebarIconBtn}>
            <Heart
              size={26}
              color={post.isLiked ? '#e0245e' : SIDEBAR_ICON}
              fill={post.isLiked ? '#e0245e' : 'transparent'}
            />
          </View>
          <Text
            style={[
              styles.reelSidebarCount,
              post.isLiked && { color: '#fda4af' },
            ]}
          >
            {likes}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.reelRowActionCol,
            pressed && styles.reelSidebarIconBtnPressed,
          ]}
          onPress={onCommentPress}
          hitSlop={10}
        >
          <View style={styles.reelSidebarIconBtn}>
            <MessageCircle size={24} color={SIDEBAR_ICON} />
          </View>
          <Text style={styles.reelSidebarCount}>{replies}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.reelRowActionCol,
            pressed && styles.reelSidebarIconBtnPressed,
          ]}
          onPress={() =>
            repostMutation.mutate({
              postId: repostTargetId,
              isReposted: !!post.isReposted,
            })
          }
          disabled={repostMutation.isPending}
          hitSlop={10}
        >
          <View style={styles.reelSidebarIconBtn}>
            <Repeat2
              size={24}
              color={isUserRepostHighlighted ? '#4ade80' : SIDEBAR_ICON}
            />
          </View>
          <Text
            style={[
              styles.reelSidebarCount,
              isUserRepostHighlighted && { color: '#86efac' },
            ]}
          >
            {reposts}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.reelRowActionCol,
            pressed && styles.reelSidebarIconBtnPressed,
          ]}
          onPress={onBookmarkPress}
          hitSlop={10}
        >
          <View style={styles.reelSidebarIconBtn}>
            {isSaved ? (
              <SaveMinusMultipleIcon
                width={24}
                height={24}
                fill="#4ade80"
              />
            ) : (
              <SavePlusSingleIcon width={24} height={24} fill={SIDEBAR_ICON} />
            )}
          </View>
        </Pressable>

        {isOwnPost && (
          <Pressable
            style={({ pressed }) => [
              styles.reelRowActionCol,
              pressed && styles.reelSidebarIconBtnPressed,
            ]}
            onPress={() =>
              Alert.alert('Delete post', 'This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteMutation.mutate({ postId: post.id }),
                },
              ])
            }
            disabled={deleteMutation.isPending}
            hitSlop={10}
          >
            <View style={styles.reelSidebarIconBtn}>
              <Trash2 size={22} color="#fca5a5" />
            </View>
          </Pressable>
        )}
      </View>
    );
  }

  if (isSidebar) {
    return (
      <View style={styles.reelSidebarActions}>
        <Pressable
          style={({ pressed }) => [
            styles.reelSidebarActionCol,
            pressed && styles.reelSidebarIconBtnPressed,
          ]}
          onPress={() =>
            likeMutation.mutate({
              postId: post.id,
              isLiked: !!post.isLiked,
            })
          }
          disabled={likeMutation.isPending}
          hitSlop={10}
        >
          <View style={styles.reelSidebarIconBtn}>
            <Heart
              size={28}
              color={post.isLiked ? '#e0245e' : SIDEBAR_ICON}
              fill={post.isLiked ? '#e0245e' : 'transparent'}
            />
          </View>
          <Text
            style={[
              styles.reelSidebarCount,
              post.isLiked && { color: '#fda4af' },
            ]}
          >
            {likes}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.reelSidebarActionCol,
            pressed && styles.reelSidebarIconBtnPressed,
          ]}
          onPress={onCommentPress}
          hitSlop={10}
        >
          <View style={styles.reelSidebarIconBtn}>
            <MessageCircle size={26} color={SIDEBAR_ICON} />
          </View>
          <Text style={styles.reelSidebarCount}>{replies}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.reelSidebarActionCol,
            pressed && styles.reelSidebarIconBtnPressed,
          ]}
          onPress={() =>
            repostMutation.mutate({
              postId: repostTargetId,
              isReposted: !!post.isReposted,
            })
          }
          disabled={repostMutation.isPending}
          hitSlop={10}
        >
          <View style={styles.reelSidebarIconBtn}>
            <Repeat2
              size={26}
              color={isUserRepostHighlighted ? '#4ade80' : SIDEBAR_ICON}
            />
          </View>
          <Text
            style={[
              styles.reelSidebarCount,
              isUserRepostHighlighted && { color: '#86efac' },
            ]}
          >
            {reposts}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.reelSidebarActionCol,
            pressed && styles.reelSidebarIconBtnPressed,
          ]}
          onPress={onBookmarkPress}
          hitSlop={10}
        >
          <View style={styles.reelSidebarIconBtn}>
            {isSaved ? (
              <SaveMinusMultipleIcon
                width={26}
                height={26}
                fill="#4ade80"
              />
            ) : (
              <SavePlusSingleIcon width={26} height={26} fill={SIDEBAR_ICON} />
            )}
          </View>
        </Pressable>

        {isOwnPost && (
          <Pressable
            style={({ pressed }) => [
              styles.reelSidebarActionCol,
              pressed && styles.reelSidebarIconBtnPressed,
            ]}
            onPress={() =>
              Alert.alert('Delete post', 'This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteMutation.mutate({ postId: post.id }),
                },
              ])
            }
            disabled={deleteMutation.isPending}
            hitSlop={10}
          >
            <View style={styles.reelSidebarIconBtn}>
              <Trash2 size={24} color="#fca5a5" />
            </View>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.actions, isReelVariant && styles.reelActions]}>
      <Pressable
        style={({ pressed }) => [
          styles.action,
          isReelVariant && styles.reelActionButton,
          isReelVariant && pressed && styles.reelActionButtonPressed,
        ]}
        onPress={onCommentPress}
        hitSlop={10}
      >
        <MessageCircle size={18} color="#71767b" />
        <Text style={styles.actionCount}>{replies}</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.action,
          isReelVariant && styles.reelActionButton,
          isReelVariant && pressed && styles.reelActionButtonPressed,
        ]}
        onPress={() =>
          repostMutation.mutate({
            postId: repostTargetId,
            isReposted: !!post.isReposted,
          })
        }
        disabled={repostMutation.isPending}
        hitSlop={10}
      >
        <Repeat2
          size={18}
          color={isUserRepostHighlighted ? '#00ba7c' : '#71767b'}
        />
        <Text
          style={[
            styles.actionCount,
            isUserRepostHighlighted ? { color: '#00ba7c' } : { color: '#71767b' },
          ]}
        >
          {reposts}
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.action,
          isReelVariant && styles.reelActionButton,
          isReelVariant && pressed && styles.reelActionButtonPressed,
        ]}
        onPress={() =>
          likeMutation.mutate({
            postId: post.id,
            isLiked: !!post.isLiked,
          })
        }
        disabled={likeMutation.isPending}
        hitSlop={10}
      >
        <Heart
          size={18}
          color={post.isLiked ? '#e0245e' : '#71767b'}
          fill={post.isLiked ? '#e0245e' : 'transparent'}
        />
        <Text
          style={[
            styles.actionCount,
            post.isLiked && { color: '#e0245e' },
          ]}
        >
          {likes}
        </Text>
      </Pressable>

      {isOwnPost && (
        <Pressable
          style={({ pressed }) => [
            styles.action,
            isReelVariant && styles.reelActionButton,
            isReelVariant && pressed && styles.reelActionButtonPressed,
          ]}
          onPress={() =>
            Alert.alert('Delete post', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteMutation.mutate({ postId: post.id }),
              },
            ])
          }
          disabled={deleteMutation.isPending}
          hitSlop={10}
        >
          <Trash2 size={18} color="#f87171" />
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.action,
          isReelVariant && styles.reelActionButton,
          isReelVariant && pressed && styles.reelActionButtonPressed,
        ]}
        onPress={onBookmarkPress}
        hitSlop={10}
      >
        {isSaved ? (
          <SaveMinusMultipleIcon width={18} height={18} fill={isSaved ? '#00ba7c' : '#71767b'} />
        ) : (
          <SavePlusSingleIcon width={18} height={18} fill={isSaved ? '#00ba7c' : '#71767b'}  />
        )}
      </Pressable>
    </View>
  );
}
