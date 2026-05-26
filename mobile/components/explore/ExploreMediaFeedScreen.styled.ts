import { StyleSheet } from 'react-native';

export const exploreMediaFeedStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#000',
  },
  backText: {
    color: '#e5e7eb',
    fontSize: 16,
  },
  title: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 8,
  },
});
