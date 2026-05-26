import { StyleSheet } from 'react-native';

export const homeFeedStyles = StyleSheet.create({
  feedSection: {
    gap: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  feedCard: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderColor: '#1f2937',
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  feedMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
});

