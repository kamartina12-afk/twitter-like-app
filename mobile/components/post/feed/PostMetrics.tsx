import { View, Text } from 'react-native';
import styles from './PostCard.styles';

export default function PostMetrics({
  post,
  variant = 'default',
}: {
  post: { viewsCount?: number };
  variant?: 'default' | 'reel';
}) {
  const isReelVariant = variant === 'reel';

  return (
    <View style={[styles.metrics, isReelVariant && styles.reelMetricsContainer]}>
      <Text style={[styles.metricsText, isReelVariant && styles.reelMetricsText]}>
        {post.viewsCount ?? 0} Views
      </Text>
    </View>
  );
}
