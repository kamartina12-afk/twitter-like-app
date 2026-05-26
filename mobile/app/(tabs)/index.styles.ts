import { StyleSheet } from 'react-native';

export const homeStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerContainer: {
    paddingBottom: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#000',
    zIndex: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabLabelActive: {
    color: '#020617',
  },
  tabIndicator: {
    height: 2,
    marginTop: 4,
    borderRadius: 999,
    width: '100%',
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: '#020617',
  },
  feedSection: {
    paddingTop: 112,
    paddingBottom: 88,
    paddingHorizontal: 0,
  },
  feedScroll: {
    flex: 1,
    backgroundColor: '#000',
  },
});
