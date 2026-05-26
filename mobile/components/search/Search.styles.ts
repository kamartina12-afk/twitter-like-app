import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  searchBar: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: '#2f3336',
  },

  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#202327',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  searchIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4b5563',
  },

  input: {
    flex: 1,
    color: '#fff',
    paddingVertical: 4,
  },

  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#2f3336',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarInitials: {
    color: '#e5e7eb',
    fontWeight: '600',
  },

  name: {
    color: '#fff',
    fontWeight: '600',
  },

  username: {
    color: '#71767b',
  },

  recentContainer: {
    marginTop: 12,
  },

  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 6,
  },

  recentTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },

  recentClearText: {
    color: '#3b82f6',
    fontSize: 12,
  },

  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#2f3336',
  },

  recentText: {
    color: '#fff',
  },
});
