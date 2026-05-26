import { StyleSheet } from 'react-native';

export const exploreVideoReelStyles = StyleSheet.create({
  root: {
    backgroundColor: '#000',
  },
  videoFrame: {
    width: '100%',
    minHeight: 0,
    backgroundColor: '#000',
  },
  horizontalVideoFrame: {
    paddingVertical: 24,
  },
  video: {
    width: '100%',
    flex: 1,
    backgroundColor: '#020617',
  },
  rightRail: {
    position: 'absolute',
    right: 6,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 3,
    elevation: 3,
  },
  rightRailStack: {
    alignItems: 'center',
    gap: 10,
  },
  rightRailHiddenWhenComments: {
    opacity: 0,
    pointerEvents: 'none',
  },
  avatarOuter: {
    alignItems: 'center',
  },
  avatarPressable: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e293b',
  },
  avatarInitials: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  followPlusWrap: {
    marginTop: -10,
    zIndex: 2,
  },
  followPlusButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fe2c55',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    elevation: 2,
    paddingLeft: 14,
    paddingRight: 72,
    paddingBottom: 12,
    paddingTop: 20,
  },
  bottomHiddenWhenComments: {
    opacity: 0,
    pointerEvents: 'none',
  },
  bottomHandle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 6,
  },
  bottomHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bottomContentText: {
    color: '#e5e7eb',
    fontSize: 15,
    lineHeight: 21,
  },
  readMoreOnDark: {
    color: '#93c5fd',
  },
  repostContainer: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  repostContentText: {
    color: '#e2e8f0',
    marginBottom: 8,
  },
});
