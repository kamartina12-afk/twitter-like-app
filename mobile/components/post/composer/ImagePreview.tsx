import { Pressable, Image, Text, View } from 'react-native';
import { ExpoVideoPlayer } from '@/components/media/ExpoVideoPlayer';
import styles from './CreatePostCard.styles';

export default function ImagePreview({
  uri,
  kind = 'image',
  aspectRatio,
  onRemove,
}: {
  uri: string;
  kind?: 'image' | 'video';
  aspectRatio?: number | null;
  onRemove?: () => void;
}) {
  return (
    <View style={styles.imageContainer}>
      {onRemove ? (
        <Pressable style={styles.removeMediaButton} onPress={onRemove}>
          <Text style={styles.removeMediaText}>x</Text>
        </Pressable>
      ) : null}
      {kind === 'video' ? (
        <ExpoVideoPlayer
          key={uri}
          uri={uri}
          style={[styles.image, aspectRatio ? { aspectRatio, height: undefined } : null]}
          contentFit="contain"
          nativeControls
          autoplay={false}
        />
      ) : (
        <Image
          source={{ uri }}
          style={[styles.image, aspectRatio ? { aspectRatio, height: undefined } : null]}
          resizeMode="contain"
        />
      )}
    </View>
  );
}
