import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  card: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },

  header: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  username: {
    color: '#fff',
    fontWeight: '600',
  },

  handle: {
    color: '#71767b',
  },

  text: {
    color: '#fff',
    fontSize: 16,
    marginTop: 6,
    marginBottom: 8,
    lineHeight: 22,
  },

  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },

  mediaImage: {
    width: '48%',
    backgroundColor: '#020617',
  },

  mediaItem: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#020617',
  },

  singleMediaContainer: {
    marginTop: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    width: '100%',
  },

  singleMediaImage: {
    width: '100%',
    marginTop: 12,
    backgroundColor: '#020617',
  },

  poll: {
    marginTop: 8,
    gap: 6,
  },

  pollOption: {
    borderWidth: 1,
    borderColor: '#2f3336',
    padding: 8,
    borderRadius: 10,
  },

  pollQuestionText: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '600',
  },

  pollOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  pollOptionText: {
    color: '#e5e7eb',
    flexShrink: 1,
  },

  pollOptionMeta: {
    color: '#9ca3af',
    fontSize: 12,
    marginLeft: 8,
  },

  pollOptionBarBackground: {
    marginTop: 2,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#1f2933',
    overflow: 'hidden',
  },

  pollOptionBarFill: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#1D9BF0',
  },

  pollOptionSelected: {
    borderColor: '#1D9BF0',
  },

  pollFooterText: {
    color: '#9ca3af',
    fontSize: 12,
  },

  metrics: {
    marginTop: 8,
  },
  metricsText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  reelMetricsContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.55)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reelMetricsText: {
    color: '#f8fafc',
    fontWeight: '700',
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    width: '100%',
    gap: 4,
  },
  reelActions: {
    marginTop: 12,
    rowGap: 8,
    columnGap: 8,
  },

  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reelActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
  reelActionButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  actionReposted: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 186, 124, 0.12)',
  },

  actionCount: {
    color: '#71767b',
    fontSize: 13,
  },

  repostContainer: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
  },

  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },

  repostAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },

  repostLabel: {
    color: '#9ca3af',
    fontSize: 11,
  },

  repostHandle: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '600',
  },

  repostText: {
    color: '#e5e7eb',
    marginTop: 2,
    marginBottom: 0,
  },
  blockedText: {
    color: '#71767b',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  followButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  followButtonActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  followButtonInactive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(148, 163, 184, 0.6)',
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  followButtonTextActive: {
    color: '#020617',
  },
  followButtonTextInactive: {
    color: '#e5e7eb',
  },
  repostLabelText: {
    color: '#71767b',
    fontSize: 12,
    marginBottom: 4,
  },
  repostContentText: {
    color: '#e5e7eb',
    marginBottom: 8,
    lineHeight: 20,
  },
  readMoreText: {
    color: '#1D9BF0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: -2,
  },

  mediaWrap: {
    position: 'relative',
    marginTop: 12,
  },
  expandReelFab: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    padding: 10,
  },

  reelSidebarActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 18,
    marginTop: 4,
  },
  reelSidebarActionCol: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    minWidth: 44,
  },
  reelSidebarIconBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 999,
  },
  reelSidebarIconBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  reelSidebarCount: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  reelRowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 14,
    marginBottom: 8,
  },
  reelRowActionCol: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    minWidth: 40,
  },
  carouselDotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(249, 249, 250, 0.9)',
  },
  carouselDotActive: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#ffffff',
  },
});

export const commentsModalStyles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  sheetBackdropWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheetBackdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetOuter: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
  },
  sheetKeyboard: {
    flex: 1,
    width: '100%',
  },
  sheetInner: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  sheetGrabberWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sheetGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3f3f46',
  },
  sheetTitle: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    minHeight: 120,
  },
  emptyText: {
    color: '#9ca3af',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  commentsFlatList: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 280,
  },
  commentsFlatListContent: {
    paddingBottom: 8,
  },
  commentItem: {
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    paddingBottom: 10,
  },
  commentAuthor: {
    color: '#fafafa',
    fontWeight: '600',
    marginBottom: 2,
    fontSize: 14,
  },
  commentHandle: {
    color: '#71717a',
    fontSize: 12,
  },
  commentBody: {
    color: '#e4e4e7',
    marginTop: 6,
    fontSize: 15,
    lineHeight: 20,
  },
  commentRowHighlighted: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  commentActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentLikeCount: {
    color: '#a1a1aa',
    fontSize: 13,
  },
  commentReplyButton: {
    paddingVertical: 2,
  },
  commentReplyLabel: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  replyToBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  replyToBannerText: {
    color: '#a1a1aa',
    fontSize: 13,
    flex: 1,
  },
  replyToBannerClear: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  inputBlock: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    paddingTop: 12,
  },
  input: {
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fafafa',
    marginBottom: 10,
    fontSize: 15,
  },
  submitButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#1D9BF0',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export const saveModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    backgroundColor: '#020617',
    borderRadius: 18,
    padding: 16,
    maxHeight: '85%',
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#f9fafb',
    fontSize: 17,
    fontWeight: '600',
  },
  closeText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 12,
  },
  hint: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 10,
  },
  scroll: {
    maxHeight: 280,
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 8,
  },
  chipDefault: {
    borderColor: '#374151',
    backgroundColor: '#020617',
  },
  chipSelected: {
    borderColor: '#1D9BF0',
    backgroundColor: 'rgba(29,155,240,0.12)',
  },
  chipLabel: {
    color: '#e5e7eb',
    fontSize: 14,
  },
  newLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 6,
  },
  newInput: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f9fafb',
    fontSize: 14,
    marginBottom: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryBtnLabel: {
    color: '#e5e7eb',
    fontWeight: '600',
    fontSize: 14,
  },
  dangerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  dangerBtnLabel: {
    color: '#f87171',
    fontWeight: '600',
    fontSize: 14,
  },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#1D9BF0',
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

