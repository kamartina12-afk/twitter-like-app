import { View, Text, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import styles from './PostCard.styles';

type PostHeaderProps = {
  post: {
    authorId?: string;
    authorDisplayName?: string;
    authorUsername?: string;
    avatarUrl?: string | null;
  };
};

export default function PostHeader({ post }: PostHeaderProps) {
  const router = useRouter();
  const avatarUri = post.avatarUrl ?? undefined;
  const displayName = post.authorDisplayName || post.authorUsername || 'Unknown user';
  const handle = post.authorUsername || 'unknown';

  const openProfile = () => {
    if (!post.authorId) return;
    router.push(`/profile/${post.authorId}`);
  };

  return (
    <Pressable
      onPress={openProfile}
      disabled={!post.authorId}
      style={styles.header}
      accessibilityRole={post.authorId ? 'button' : undefined}
      accessibilityLabel={post.authorId ? `View ${displayName} profile` : undefined}
    >
      {avatarUri && (
        <Image
          source={{ uri: avatarUri }}
          style={styles.avatar}
        />
      )}

      <View>
        <Text style={styles.username}>{displayName}</Text>

        <Text style={styles.handle}>@{handle}</Text>
      </View>
    </Pressable>
  );
}
