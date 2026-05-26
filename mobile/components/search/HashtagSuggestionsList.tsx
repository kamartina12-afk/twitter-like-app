import { View, Text, Pressable } from 'react-native';
import type { HashtagRecord } from '@/services/hashtag.service';
import styles from './Search.styles';

type Props = {
  suggestions: HashtagRecord[];
  onSelect: (name: string) => void;
};

export default function HashtagSuggestionsList({ suggestions, onSelect }: Props) {
  if (!suggestions.length) {
    return null;
  }

  return (
    <View style={styles.recentContainer}>
      <View style={styles.recentHeaderRow}>
        <Text style={styles.recentTitle}>Hashtags</Text>
      </View>
      {suggestions.map((h) => (
        <Pressable
          key={h.id}
          style={styles.recentItem}
          onPress={() => onSelect(h.name)}
        >
          <Text style={styles.recentText}>#{h.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}
