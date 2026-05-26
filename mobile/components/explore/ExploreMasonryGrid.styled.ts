import { StyleSheet } from 'react-native';

export const exploreMasonryStyles = StyleSheet.create({
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
  },
  cell: {
    overflow: 'hidden',
    backgroundColor: '#020617',
    borderRadius: 12,
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  previewViewsPill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  previewViewsText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  /** Instagram-style disc + play on grid thumbnails. */
  playButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
});
