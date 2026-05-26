import { StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';

export const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: 'rgba(31, 41, 55, 1)',
    backgroundColor: 'transparent',
  },
  coverContainer: {
    height: 120,
    width: '100%',
    backgroundColor: '#020617',
    marginBottom: 0,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#020617',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    marginTop: -28,
  },
  nameContainer: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  username: {
    marginTop: 2,
    fontSize: 14,
    color: 'rgba(148, 163, 184, 1)',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.7)',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarEditButton: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.7)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  bio: {
    marginTop: 4,
    fontSize: 14,
    paddingHorizontal: 16,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
    paddingHorizontal: 16,
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(148, 163, 184, 1)',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  statItemPressable: {
    marginRight: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(31, 41, 55, 1)',
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(148, 163, 184, 1)',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  tabIndicator: {
    marginTop: 6,
    height: 3,
    borderRadius: 999,
    width: '50%',
    backgroundColor: '#38bdf8',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    padding: 6,
    borderRadius: 999,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(148, 163, 184, 1)',
  },
  headerPlaceholder: {
    flex: 1,
  },
});

