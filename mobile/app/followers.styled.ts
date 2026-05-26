import { StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';

export const followersStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 12,
    paddingLeft: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#0f172a',
  },
  tabLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  tabLabelActive: {
    color: '#e5e7eb',
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9ca3af',
    paddingVertical: 24,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9ca3af',
    paddingVertical: 24,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  userInfoPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  userTextContainer: {
    flex: 1,
  },
  displayName: {
    fontSize: 14,
    fontWeight: '600',
  },
  username: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  followButtonPrimary: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  followButtonText: {
    fontSize: 12,
    color: '#e5e7eb',
  },
  followButtonTextPrimary: {
    color: '#0f172a',
    fontWeight: '600',
  },
  blockButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  blockButtonText: {
    fontSize: 12,
    color: '#f97373',
  },
});

export default function FollowersStyledRoute() {
  return null;
}

