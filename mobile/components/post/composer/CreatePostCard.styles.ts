import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    backgroundColor: '#000',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#2f3336',
  },

  textarea: {
    color: '#fff',
    fontSize: 18,
    minHeight: 80,
  },

  mentionList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2f3336',
    borderRadius: 12,
    overflow: 'hidden',
  },

  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#2f3336',
  },

  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  mentionAvatarFallback: {
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },

  mentionAvatarFallbackText: {
    color: '#e5e7eb',
    fontWeight: '700',
  },

  mentionTextWrap: {
    flex: 1,
  },

  mentionPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  mentionSecondary: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 1,
  },

  toolbar: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 14,
  },

  postButton: {
    backgroundColor: '#1D9BF0',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-end',
    marginTop: 12,
  },

  postButtonDisabled: {
    opacity: 0.6,
  },

  postButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  pollContainer: {
    marginTop: 12,
    gap: 8,
  },

  pollQuestionInput: {
    borderWidth: 1,
    borderColor: '#2f3336',
    padding: 8,
    borderRadius: 8,
    color: '#fff',
    fontWeight: '600',
  },

  pollInput: {
    borderWidth: 1,
    borderColor: '#2f3336',
    padding: 8,
    borderRadius: 8,
    color: '#fff',
  },

  imageContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#111',
  },

  image: {
    width: '100%',
    height: 220,
  },

  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  removeMediaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: -1,
  },

  gifModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  gifModalContent: {
    width: '90%',
    maxHeight: '75%',
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 16,
  },

  gifModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  gifModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  gifSearchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  gifSearchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2f3336',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
  },

  gifSearchButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1D9BF0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  gifSearchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  gifGrid: {
    marginTop: 4,
  },

  gifItem: {
    flex: 1 / 3,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },

  gifImage: {
    width: '100%',
    aspectRatio: 1,
  },

  gifEmptyText: {
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },

  close: {
    alignSelf: 'flex-end',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  loadingText: {
    marginTop: 8,
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
  },
});
