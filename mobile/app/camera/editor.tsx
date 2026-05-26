import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  ChevronLeft,
  Pencil,
  Send,
  Type,
} from 'lucide-react-native';

import DrawingCanvas from '@/components/camera/DrawingCanvas';
import DraggableText from '@/components/camera/DraggableText';
import { ThemedText } from '@/components/themed-text';
import { auth } from '@/lib/firebase';
import { chatService } from '@/services/chat.service';
import { createPost } from '@/services/post.service';
import { readLocalUriAsBlob, uploadChatFile, uploadPostMedia } from '@/services/storage.service';
import { useChatSocket } from '@/contexts/ChatSocketContext';
import { useSearchUsers } from '@/hooks/search/useSearchUsers';
import { QUERY_KEYS } from '@/constants/queryKeys';
import type { TextItem } from '@/types/camera.types';

type FriendOption = {
  id: string;
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type Step = 'edit' | 'publish';

export default function CameraEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { photoUri: encoded } = useLocalSearchParams<{ photoUri: string }>();
  const photoUri = encoded ? decodeURIComponent(encoded) : '';

  const { sendMessage } = useChatSocket();
  const viewRef = useRef<View>(null);

  const [step, setStep] = useState<Step>('edit');
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [drawMode, setDrawMode] = useState(false);
  const [caption, setCaption] = useState('');
  const [search, setSearch] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [publishChoice, setPublishChoice] = useState<'post' | 'send' | null>(null);
  const [captureSize, setCaptureSize] = useState({ w: 1, h: 1 });
  /** Snapshot taken when leaving the editor so share step still has flattened image + drawings + text. */
  const [flattenedUri, setFlattenedUri] = useState<string | null>(null);
  const [isCapturingNext, setIsCapturingNext] = useState(false);

  const postMutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXPLORE_FEED });
      queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
      router.replace('/(tabs)');
    },
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.listConversations(),
  });
  const { data: searchResults = [] } = useSearchUsers(search, {
    enabled: search.trim().length > 1,
  });

  const quickFriends = React.useMemo<FriendOption[]>(() => {
    const currentUserId = auth.currentUser?.uid;
    const map = new Map<string, FriendOption>();

    for (const conversation of conversations) {
      for (const participant of conversation.participants) {
        if (!participant.userId || participant.userId === currentUserId) {
          continue;
        }
        if (!map.has(participant.userId)) {
          map.set(participant.userId, {
            id: participant.userId,
            username: participant.username,
            displayName: participant.displayName,
            avatarUrl: participant.avatarUrl,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [conversations]);

  const displayedFriends = search.trim().length > 1 ? searchResults : quickFriends;

  const toggleDrawMode = () => {
    setDrawMode((d) => !d);
    setInputVisible(false);
  };

  const openText = () => {
    setDrawMode(false);
    setInputVisible(true);
  };

  const addText = () => {
    if (!inputText.trim()) return;

    setTexts((prev) => [
      ...prev,
      {
        id: Date.now(),
        value: inputText.trim(),
        x: 40,
        y: 160,
      },
    ]);

    setInputText('');
    setInputVisible(false);
  };

  const captureEditedImage = async (): Promise<{ uri: string; mime: string } | null> => {
    if (!viewRef.current) return null;
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
    });
    return { uri, mime: 'image/png' };
  };

  const mediaUriForShare = flattenedUri ?? photoUri;

  const aspectRatio =
    captureSize.h > 0 ? Math.min(Math.max(captureSize.w / captureSize.h, 0.25), 4) : 1;

  const handlePublishPost = useCallback(async () => {
    if (postMutation.isPending) return;
    const user = auth.currentUser;
    if (!user || !mediaUriForShare) return;

    try {
      const blob = await readLocalUriAsBlob(mediaUriForShare);
      const imageUrl = await uploadPostMedia(blob, user.uid, { contentType: 'image/png' });

      postMutation.mutate({
        content: caption.trim(),
        imageUrl,
        mediaAspectRatio: aspectRatio,
      });
    } catch (e) {
      console.error('Publish post failed', e);
    }
  }, [aspectRatio, caption, mediaUriForShare, postMutation]);

  const handleSendToFriend = useCallback(async () => {
    if (!mediaUriForShare || !selectedFriendId || isSending) {
      return;
    }

    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      return;
    }

    try {
      setIsSending(true);
      const mime = flattenedUri ? 'image/png' : 'image/jpeg';

      const blob = await readLocalUriAsBlob(mediaUriForShare);
      const attachment = await uploadChatFile(blob, {
        userId: currentUserId,
        name: `snap-${Date.now()}.${mime.includes('png') ? 'png' : 'jpg'}`,
        type: mime,
        size: blob.size,
      });

      const conversation = await chatService.getOrCreateDirect(selectedFriendId);
      const payload = JSON.stringify({
        text: caption.trim() || undefined,
        attachments: [attachment],
      });

      const result = await sendMessage(conversation.id, payload);
      if (result.error) {
        throw new Error(result.error);
      }

      router.push({
        pathname: '/(tabs)/chat',
        params: { conversationId: conversation.id },
      });
    } finally {
      setIsSending(false);
    }
  }, [caption, flattenedUri, isSending, mediaUriForShare, router, selectedFriendId, sendMessage]);

  const goBackFromPublish = () => {
    setStep('edit');
    setPublishChoice(null);
    setFlattenedUri(null);
  };

  const goToPublish = async () => {
    if (isCapturingNext) return;
    setInputVisible(false);
    setDrawMode(false);
    setIsCapturingNext(true);
    try {
      const captured = await captureEditedImage();
      setFlattenedUri(captured?.uri ?? photoUri);
    } catch {
      setFlattenedUri(photoUri);
    } finally {
      setIsCapturingNext(false);
    }
    setStep('publish');
  };

  if (!photoUri) {
    return (
      <SafeAreaView style={styles.emptyRoot}>
        <Pressable onPress={() => router.back()} style={styles.emptyBack} hitSlop={12}>
          <ChevronLeft color="#fff" size={28} />
          <ThemedText style={styles.emptyBackLabel}>Back</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (step === 'publish') {
    return (
      <SafeAreaView style={styles.publishRoot}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.publishHeader}>
            <Pressable onPress={goBackFromPublish} hitSlop={12} style={styles.headerBtn}>
              <ChevronLeft color="#fff" size={28} />
            </Pressable>
            <ThemedText style={styles.publishTitle}>Share</ThemedText>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.publishScroll}
            keyboardShouldPersistTaps="handled"
          >
            {mediaUriForShare ? (
              <Image
                source={{ uri: mediaUriForShare }}
                style={styles.publishThumb}
                resizeMode="cover"
              />
            ) : null}
            <ThemedText style={styles.publishHint}>
              Choose where to send your photo.
            </ThemedText>

            <View style={styles.choiceRow}>
              <Pressable
                onPress={() => setPublishChoice('post')}
                style={[
                  styles.choiceCard,
                  publishChoice === 'post' && styles.choiceCardActive,
                ]}
              >
                <ThemedText style={styles.choiceCardTitle}>Post</ThemedText>
                <ThemedText style={styles.choiceCardSub}>Share on your feed</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setPublishChoice('send')}
                style={[
                  styles.choiceCard,
                  publishChoice === 'send' && styles.choiceCardActive,
                ]}
              >
                <ThemedText style={styles.choiceCardTitle}>Send</ThemedText>
                <ThemedText style={styles.choiceCardSub}>Message a friend</ThemedText>
              </Pressable>
            </View>

            {publishChoice === 'post' ? (
              <View style={styles.formBlock}>
                <TextInput
                  placeholder="Write a caption…"
                  placeholderTextColor="#94a3b8"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  style={styles.captionInput}
                />
                <Pressable
                  onPress={handlePublishPost}
                  disabled={postMutation.isPending}
                  style={[
                    styles.primaryBtn,
                    postMutation.isPending && styles.primaryBtnDisabled,
                  ]}
                >
                  {postMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.primaryBtnText}>Publish</ThemedText>
                  )}
                </Pressable>
              </View>
            ) : null}

            {publishChoice === 'send' ? (
              <View style={styles.formBlock}>
                <TextInput
                  placeholder="Add a message (optional)"
                  placeholderTextColor="#94a3b8"
                  value={caption}
                  onChangeText={setCaption}
                  style={styles.singleLineInput}
                />
                <TextInput
                  placeholder="Search friend…"
                  placeholderTextColor="#94a3b8"
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                  style={styles.singleLineInput}
                />
                <ThemedText style={styles.sendToLabel}>Send to</ThemedText>
                <FlatList
                  data={displayedFriends}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.friendList}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <ThemedText style={styles.muted}>
                      No friends found. Start a chat or search by username.
                    </ThemedText>
                  }
                  renderItem={({ item }) => {
                    const selected = selectedFriendId === item.id;
                    const label = item.displayName || item.username || 'User';
                    const initials = label.slice(0, 1).toUpperCase();
                    return (
                      <Pressable
                        onPress={() => setSelectedFriendId(item.id)}
                        style={[styles.friendRow, selected && styles.friendRowSelected]}
                      >
                        <View style={styles.friendAvatar}>
                          {item.avatarUrl ? (
                            <Image
                              source={{ uri: item.avatarUrl }}
                              style={styles.friendAvatarImg}
                              resizeMode="cover"
                            />
                          ) : (
                            <ThemedText style={styles.friendInitials}>{initials}</ThemedText>
                          )}
                        </View>
                        <View style={styles.flex}>
                          <ThemedText style={styles.friendName}>{label}</ThemedText>
                          {item.username ? (
                            <ThemedText style={styles.friendUsername}>@{item.username}</ThemedText>
                          ) : null}
                        </View>
                        {selected ? (
                          <ThemedText style={styles.selectedPill}>Selected</ThemedText>
                        ) : null}
                      </Pressable>
                    );
                  }}
                />
                <Pressable
                  onPress={handleSendToFriend}
                  disabled={!selectedFriendId || isSending}
                  style={[
                    styles.primaryBtn,
                    (!selectedFriendId || isSending) && styles.primaryBtnDisabled,
                  ]}
                >
                  {isSending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Send color="#fff" size={18} />
                      <ThemedText style={styles.primaryBtnText}>Send photo</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.editRoot}>
      <View
        ref={viewRef}
        style={styles.captureArea}
        collapsable={false}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setCaptureSize({ w: width, h: height });
        }}
      >
        <Image source={{ uri: photoUri }} style={styles.captureImage} resizeMode="cover" />
        <View style={styles.captureOverlay} pointerEvents="box-none">
          <View
            style={[StyleSheet.absoluteFill, { zIndex: drawMode ? 1 : 12 }]}
            pointerEvents={drawMode ? 'none' : 'auto'}
          >
            {texts.map((t) => (
              <DraggableText key={t.id} data={t} />
            ))}
          </View>
          <DrawingCanvas
            enabled={drawMode}
            strokeColor="#ffffff"
            strokeWidth={4}
            style={{ zIndex: drawMode ? 14 : 1 }}
          />
        </View>
      </View>

      <SafeAreaView style={[styles.overlaySafe, styles.chromeLayer]} pointerEvents="box-none">
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
          <Pressable onPress={() => router.back()} hitSlop={14} style={styles.circleBtn}>
            <ChevronLeft color="#fff" size={28} />
          </Pressable>
        </View>

        <View style={[styles.bottomTools, { paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.toolCluster}>
            <Pressable
              onPress={openText}
              style={[styles.toolBtn, inputVisible && styles.toolBtnActive]}
            >
              <Type color="#fff" size={26} />
            </Pressable>
            <Pressable
              onPress={toggleDrawMode}
              style={[styles.toolBtn, drawMode && styles.toolBtnActive]}
            >
              <Pencil color="#fff" size={26} />
            </Pressable>
          </View>

          <Pressable
            onPress={goToPublish}
            disabled={isCapturingNext}
            style={[styles.nextBtn, isCapturingNext && styles.nextBtnDisabled]}
          >
            {isCapturingNext ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <ThemedText style={styles.nextLabel}>Next</ThemedText>
                <ArrowRight color="#fff" size={22} />
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      {inputVisible ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.igComposerRoot}
        >
          <Pressable
            style={styles.igComposerBackdrop}
            onPress={() => {
              Keyboard.dismiss();
              if (inputText.trim()) {
                addText();
              } else {
                setInputVisible(false);
              }
            }}
          />
          <View style={styles.igComposerCenter} pointerEvents="box-none">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={addText}
              placeholder="Tap to type"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoFocus
              style={styles.igTextInput}
              returnKeyType="done"
              blurOnSubmit
              multiline
              maxLength={220}
              textAlign="center"
            />
          </View>
          <View
            style={[styles.igComposerTopRow, { paddingTop: Math.max(insets.top, 12) }]}
            pointerEvents="box-none"
          >
            <View style={styles.igComposerTopSpacer} />
            <Pressable
              onPress={() => {
                if (inputText.trim()) {
                  addText();
                } else {
                  setInputVisible(false);
                }
              }}
              hitSlop={12}
              style={styles.igDoneHit}
            >
              <ThemedText style={styles.igDoneLabel}>Done</ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  emptyRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  emptyBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  emptyBackLabel: { color: '#fff', fontSize: 16 },
  editRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  captureArea: {
    flex: 1,
    backgroundColor: '#111',
  },
  captureImage: {
    width: '100%',
    height: '100%',
  },
  captureOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlaySafe: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  chromeLayer: {
    zIndex: 20,
    elevation: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  igComposerRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 200,
  },
  igComposerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  igComposerCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  igTextInput: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    minHeight: 120,
  },
  igComposerTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  igComposerTopSpacer: { flex: 1 },
  igDoneHit: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  igDoneLabel: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  bottomTools: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  toolCluster: {
    flexDirection: 'row',
    gap: 14,
  },
  toolBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnActive: {
    backgroundColor: 'rgba(37,99,235,0.85)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  nextLabel: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  nextBtnDisabled: {
    opacity: 0.7,
  },
  publishRoot: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  publishHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  headerBtn: { padding: 8 },
  headerSpacer: { width: 44 },
  publishTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  publishScroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  publishThumb: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
  },
  publishHint: {
    color: '#94a3b8',
    fontSize: 15,
    marginBottom: 16,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  choiceCard: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  choiceCardActive: {
    borderColor: '#2563eb',
    backgroundColor: '#0f172a',
  },
  choiceCardTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  choiceCardSub: {
    color: '#94a3b8',
    fontSize: 13,
  },
  formBlock: { gap: 12 },
  captionInput: {
    minHeight: 88,
    color: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  singleLineInput: {
    color: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  sendToLabel: {
    color: '#cbd5e1',
    fontWeight: '600',
    marginTop: 4,
  },
  friendList: { gap: 8 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
  },
  friendRowSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#0f172a',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  friendAvatarImg: { width: '100%', height: '100%' },
  friendInitials: { color: '#e2e8f0', fontWeight: '700' },
  friendName: { color: '#f8fafc', fontSize: 15, fontWeight: '600' },
  friendUsername: { color: '#94a3b8', fontSize: 12 },
  selectedPill: { color: '#60a5fa', fontWeight: '700' },
  muted: { color: '#94a3b8', marginTop: 8 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  primaryBtnDisabled: {
    backgroundColor: '#334155',
    opacity: 0.85,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
