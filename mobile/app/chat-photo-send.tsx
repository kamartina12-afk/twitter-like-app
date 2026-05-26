import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { chatService } from '@/services/chat.service';
import { useSearchUsers } from '@/hooks/search/useSearchUsers';
import { auth } from '@/lib/firebase';
import { readLocalUriAsBlob, uploadChatFile } from '@/services/storage.service';
import { useChatSocket } from '@/contexts/ChatSocketContext';
import { IMAGE_MEDIA_TYPES } from '@/utils/imagePickerMediaTypes';

type FriendOption = {
  id: string;
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export default function ChatPhotoSendScreen() {
  const router = useRouter();
  const { sendMessage } = useChatSocket();
  const [selectedImageUri, setSelectedImageUri] = React.useState<string | null>(null);
  const [selectedImageMime, setSelectedImageMime] = React.useState('image/jpeg');
  const [selectedImageAspectRatio, setSelectedImageAspectRatio] = React.useState<number>(4 / 3);
  const [selectedFriendId, setSelectedFriendId] = React.useState<string | null>(null);
  const [caption, setCaption] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const hasOpenedCameraRef = React.useRef(false);

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

  const openCamera = React.useCallback(async (withEditing = false) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: IMAGE_MEDIA_TYPES,
      quality: 0.85,
      allowsEditing: withEditing,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.uri) {
      return;
    }

    setSelectedImageUri(asset.uri);
    setSelectedImageMime(asset.mimeType || 'image/jpeg');
    const aspectRatio =
      asset.width && asset.height && asset.height > 0 ? asset.width / asset.height : 4 / 3;
    setSelectedImageAspectRatio(aspectRatio);
  }, []);

  const openGallery = React.useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: IMAGE_MEDIA_TYPES,
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.uri) {
      return;
    }

    setSelectedImageUri(asset.uri);
    setSelectedImageMime(asset.mimeType || 'image/jpeg');
    const aspectRatio =
      asset.width && asset.height && asset.height > 0 ? asset.width / asset.height : 4 / 3;
    setSelectedImageAspectRatio(aspectRatio);
  }, []);

  React.useEffect(() => {
    if (hasOpenedCameraRef.current) {
      return;
    }
    hasOpenedCameraRef.current = true;
    openCamera().catch(() => {});
  }, [openCamera]);

  const handleSend = React.useCallback(async () => {
    if (!selectedImageUri || !selectedFriendId || isSending) {
      return;
    }

    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      return;
    }

    try {
      setIsSending(true);
      const blob = await readLocalUriAsBlob(selectedImageUri);
      const attachment = await uploadChatFile(blob, {
        userId: currentUserId,
        name: `snap-${Date.now()}.jpg`,
        type: selectedImageMime,
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
  }, [caption, isSending, router, selectedFriendId, selectedImageMime, selectedImageUri, sendMessage]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ThemedText style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
              Close
            </ThemedText>
          </Pressable>
          <ThemedText style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>
            Chat photo
          </ThemedText>
          <View style={{ width: 44 }} />
        </View>

        <View
          style={{
            minHeight: 180,
            maxHeight: 360,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#111827',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selectedImageUri ? (
            <Image
              source={{ uri: selectedImageUri }}
              style={{ width: '100%', height: undefined, aspectRatio: selectedImageAspectRatio }}
              resizeMode="contain"
            />
          ) : (
            <ThemedText style={{ color: '#9ca3af' }}>
              Take a photo or pick from gallery
            </ThemedText>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Pressable
            onPress={() => openCamera(false)}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 999,
              backgroundColor: '#2563eb',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThemedText style={{ color: '#ffffff', fontWeight: '700' }}>Take photo</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => openCamera(true)}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 999,
              backgroundColor: '#1f2937',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThemedText style={{ color: '#ffffff', fontWeight: '700' }}>Take + crop</ThemedText>
          </Pressable>
        </View>

        <Pressable
          onPress={openGallery}
          style={{
            marginTop: 10,
            height: 42,
            borderRadius: 999,
            backgroundColor: '#1f2937',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ThemedText style={{ color: '#ffffff', fontWeight: '700' }}>Choose photo</ThemedText>
        </Pressable>

        <TextInput
          placeholder="Add a caption (optional)"
          placeholderTextColor="#94a3b8"
          value={caption}
          onChangeText={setCaption}
          style={{
            marginTop: 12,
            color: '#e5e7eb',
            borderWidth: 1,
            borderColor: '#334155',
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 42,
          }}
        />

        <TextInput
          placeholder="Search friend..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          style={{
            marginTop: 12,
            color: '#e5e7eb',
            borderWidth: 1,
            borderColor: '#334155',
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 42,
          }}
        />

        <ThemedText style={{ marginTop: 10, color: '#cbd5e1', fontWeight: '600' }}>
          Send to
        </ThemedText>

        <FlatList
          data={displayedFriends}
          keyExtractor={(item) => item.id}
          style={{ marginTop: 8, flex: 1 }}
          contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
          ListEmptyComponent={
            <ThemedText style={{ color: '#94a3b8', marginTop: 10 }}>
              No friends found yet. Start a chat first or search by username.
            </ThemedText>
          }
          renderItem={({ item }) => {
            const selected = selectedFriendId === item.id;
            const label = item.displayName || item.username || 'User';
            const handleSelect = () => setSelectedFriendId(item.id);
            const initials = label.slice(0, 1).toUpperCase();
            return (
              <Pressable
                onPress={handleSelect}
                style={{
                  borderWidth: 1,
                  borderColor: selected ? '#2563eb' : '#1f2937',
                  backgroundColor: selected ? '#0f172a' : '#020617',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      overflow: 'hidden',
                      backgroundColor: '#1e293b',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.avatarUrl ? (
                      <Image
                        source={{ uri: item.avatarUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <ThemedText style={{ color: '#e2e8f0', fontWeight: '700' }}>
                        {initials}
                      </ThemedText>
                    )}
                  </View>
                  <View>
                    <ThemedText style={{ color: '#f8fafc', fontSize: 15, fontWeight: '600' }}>
                      {label}
                    </ThemedText>
                    {item.username ? (
                      <ThemedText style={{ color: '#94a3b8', fontSize: 12 }}>
                        @{item.username}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
                {selected ? (
                  <ThemedText style={{ color: '#60a5fa', fontWeight: '700' }}>Selected</ThemedText>
                ) : null}
              </Pressable>
            );
          }}
        />

        <Pressable
          onPress={handleSend}
          disabled={!selectedImageUri || !selectedFriendId || isSending}
          style={{
            height: 46,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
              !selectedImageUri || !selectedFriendId || isSending ? '#334155' : '#22c55e',
          }}
        >
          {isSending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
              Send photo
            </ThemedText>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
