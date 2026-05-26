import { View, Text, Pressable } from 'react-native';
import UserSearchItem from './UsersSearchItem';
import styles from './Search.styles';
import type { ExploreSearchHistoryEntry } from '@/types/searchHistory.types';

type Props = {
  history: ExploreSearchHistoryEntry[];
  onSelect: (entry: ExploreSearchHistoryEntry) => void;
  onDelete: (historyId: string) => void;
};

export default function RecentSearches({ history, onSelect, onDelete }: Props) {
  if (!history || history.length === 0) return null;

  return (
    <View style={styles.recentContainer}>
      <View style={styles.recentHeaderRow}>
        <Text style={styles.recentTitle}>Recent</Text>
      </View>

      {history.map((item) =>
        item.type === 'user' ? (
          <View
            key={item.historyId}
            style={[styles.recentItem, { paddingHorizontal: 0 }]}
          >
            <View style={{ flex: 1 }}>
              <UserSearchItem user={item} onPress={() => onSelect(item)} />
            </View>
            <Pressable
              onPress={() => onDelete(item.historyId)}
              style={{ paddingHorizontal: 12 }}
            >
              <Text style={{ color: 'red' }}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <View key={item.historyId} style={styles.recentItem}>
            <Pressable style={{ flex: 1 }} onPress={() => onSelect(item)}>
              <Text style={styles.recentText}>{item.query}</Text>
            </Pressable>

            <Pressable onPress={() => onDelete(item.historyId)}>
              <Text style={{ color: 'red' }}>✕</Text>
            </Pressable>
          </View>
        ),
      )}
    </View>
  );
}
