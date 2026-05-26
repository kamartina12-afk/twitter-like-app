import {
  View,
  TextInput,
  Text,
  Pressable,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { auth } from '@/lib/firebase';
import { readLocalUriAsBlob, uploadPostMedia } from '@/services/storage.service';
import { API_URL } from '@/constants/api';

import styles from './CreatePostCard.styles';
import PollEditor from './PollEditor';
import { useCreatePost } from '@/hooks/post/useCreatePost';
import { BarChart2, ImageIcon } from 'lucide-react-native';
import ImagePreview from './ImagePreview';

interface Props {
  dialog?: boolean;
  onClose?: () => void;
  /** Opens the photo library once on mount (e.g. Create tab). */
  autoOpenMediaPicker?: boolean;
  /** Pre-fills the composer text (e.g. from notifications). */
  initialText?: string;
}

type MentionSuggestion = {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
};

export default function CreatePostCard({
  dialog,
  onClose,
  autoOpenMediaPicker = false,
  initialText,
}: Props) {
  const [text, setText] = useState(initialText ?? '');
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  /** From ImagePicker when available; used for upload Content-Type when blob.type is empty. */
  const [pickedMimeType, setPickedMimeType] = useState<string | null>(null);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);
  const [gif, setGif] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [showPoll, setShowPoll] = useState(false);

  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const [gifResults, setGifResults] = useState<
    { id: string; title: string; previewUrl: string; originalUrl: string }[]
  >([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const [, setMentionQuery] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [isMentionListOpen, setIsMentionListOpen] = useState(false);

  const router = useRouter();
  const didAutoOpenPickerRef = useRef(false);

  useEffect(() => {
    if (!initialText) return;
    setText((prev) => (prev.trim().length > 0 ? prev : initialText));
  }, [initialText]);

  const mutation = useCreatePost({
    onSuccess: () => {
      router.push('/profile');
    },
  });

  const pickMedia = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
      videoMaxDuration: 180,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const imageAssets =
      result.assets.filter((asset) => asset.type === 'image' || !asset.type) ??
      [];
    const videoAssets =
      result.assets.filter((asset) => asset.type === 'video') ?? [];

    // If there are any images selected, prefer them and ignore videos for this post.
    if (imageAssets.length > 0) {
      const first = imageAssets[0];
      const ar =
        first.width && first.height && first.height > 0
          ? first.width / first.height
          : 1;
      setMediaAspectRatio(ar);
      setGif(null);
      setPickedMimeType(first.mimeType ?? null);
      setImages(imageAssets.map((asset) => asset.uri));
      setVideo(null);
      return;
    }

    // Fallback: allow a single video when no images were selected.
    const asset = videoAssets[0];
    if (!asset) return;
    const ar =
      asset.width && asset.height && asset.height > 0
        ? asset.width / asset.height
        : 1;
    setMediaAspectRatio(ar);
    setGif(null);
    setPickedMimeType(asset.mimeType ?? null);
    setVideo(asset.uri);
    setImages([]);
  }, []);

  useEffect(() => {
    if (!autoOpenMediaPicker || dialog || didAutoOpenPickerRef.current) {
      return;
    }
    didAutoOpenPickerRef.current = true;
    let cancelled = false;
    void (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (cancelled || status !== 'granted') {
        return;
      }
      await new Promise((r) => setTimeout(r, 350));
      if (cancelled) {
        return;
      }
      await pickMedia();
    })();
    return () => {
      cancelled = true;
    };
  }, [autoOpenMediaPicker, dialog, pickMedia]);

  const clearSelectedMedia = () => {
    setImages([]);
    setVideo(null);
    setGif(null);
    setPickedMimeType(null);
    setMediaAspectRatio(null);
  };

  const removeImageAtIndex = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setMediaAspectRatio(null);
        setPickedMimeType(null);
      }
      return next;
    });
  };

  const submit = async () => {
    if (mutation.isPending) {
      return;
    }

    const hasPoll =
      showPoll &&
      (pollQuestion.trim().length > 0 ||
        pollOptions.some((option) => option && option.trim().length > 0));
    const hasContent =
      text.trim() || images.length > 0 || video || gif || hasPoll;

    if (!hasContent) {
      return;
    }

    let pollPayload:
      | {
          question?: string;
          options: string[];
          expiresAt: string;
        }
      | undefined;

    if (hasPoll) {
      const options = pollOptions
        .map((option) => option.trim())
        .filter((option) => option.length > 0);

      if (options.length >= 2) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        pollPayload = {
          question: pollQuestion.trim() || undefined,
          options,
          expiresAt: expiresAt.toISOString(),
        };
      }
    }

    let imageUrl: string | string[] | undefined;
    let videoUrl: string | undefined;

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }

      if (video) {
        const blob = await readLocalUriAsBlob(video);
        const contentType =
          blob.type && blob.type.length > 0
            ? blob.type
            : pickedMimeType && pickedMimeType.length > 0
              ? pickedMimeType
              : 'video/mp4';
        videoUrl = await uploadPostMedia(blob, user.uid, { contentType });
      } else if (images.length > 0) {
        const uploaded: string[] = [];
        for (const localUri of images) {
          const blob = await readLocalUriAsBlob(localUri);
          const contentType =
            blob.type && blob.type.length > 0
              ? blob.type
              : pickedMimeType && pickedMimeType.length > 0
                ? pickedMimeType
                : undefined;
          const url = await uploadPostMedia(
            blob,
            user.uid,
            contentType ? { contentType } : undefined,
          );
          uploaded.push(url);
        }
        imageUrl = uploaded;
      }
    } catch (error) {
      console.error('Failed to upload post media', error);
      return;
    }

    mutation.mutate(
      {
        content: text.trim(),
        imageUrl,
        videoUrl,
        mediaAspectRatio: mediaAspectRatio ?? undefined,
        gifUrl: gif || undefined,
        poll: pollPayload,
      },
      {
        onSuccess: () => {
          setText('');
          setImages([]);
          setVideo(null);
          setPickedMimeType(null);
          setMediaAspectRatio(null);
          setGif(null);
          setShowPoll(false);
          setPollQuestion('');
          setPollOptions(['', '']);
        },
      },
    );
  };

  const handleGifSearch = async () => {
    const term = gifSearchTerm.trim();
    if (!term) return;

    const apiKey = process.env.EXPO_PUBLIC_GIPHY_API_KEY;
    if (!apiKey) {
      console.error('GIPHY API key is not configured');
      return;
    }

    try {
      setIsSearchingGifs(true);
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
          term,
        )}&limit=24&rating=pg-13`,
      );
      const json = await response.json();
      const items =
        json?.data?.map((item: any) => ({
          id: item.id as string,
          title: (item.title as string) || 'GIF',
          previewUrl:
            (item.images?.fixed_height_small_still?.url as string) ||
            (item.images?.fixed_height_small?.url as string) ||
            (item.images?.downsized_still?.url as string) ||
            (item.images?.downsized?.url as string),
          originalUrl:
            (item.images?.original?.url as string) ||
            (item.images?.downsized_large?.url as string) ||
            (item.images?.downsized?.url as string),
        })) ?? [];
      setGifResults(items.filter((g: any) => g.previewUrl && g.originalUrl));
    } catch (error) {
      console.error('Failed to search GIFs', error);
    } finally {
      setIsSearchingGifs(false);
    }
  };

  const loadMentionSuggestions = async (rawQuery: string) => {
    if (!API_URL) {
      setMentionSuggestions([]);
      setIsMentionListOpen(false);
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      const query = rawQuery.trim();
      if (query) params.set('q', query);
      const response = await fetch(`${API_URL}/users/mentions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch mention suggestions');
      }
      const data = (await response.json()) as MentionSuggestion[];
      setMentionSuggestions(Array.isArray(data) ? data : []);
      setIsMentionListOpen(true);
    } catch (error) {
      console.error('Failed to load mention suggestions', error);
      setMentionSuggestions([]);
      setIsMentionListOpen(false);
    }
  };

  const handleTextChange = (value: string) => {
    setText(value);
    const match = value.match(/(^|\s)@([\w]{0,32})$/);
    if (!match) {
      setMentionQuery('');
      setMentionSuggestions([]);
      setIsMentionListOpen(false);
      return;
    }
    const query = match[2];
    setMentionQuery(query);
    void loadMentionSuggestions(query);
  };

  const insertMention = (username: string) => {
    const updated = text.replace(/(^|\s)@[\w]{0,32}$/, `$1@${username} `);
    setText(updated);
    setMentionQuery('');
    setMentionSuggestions([]);
    setIsMentionListOpen(false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
      {mutation.isPending && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1D9BF0" />
          <Text style={styles.loadingText}>Posting…</Text>
        </View>
      )}
      {dialog && (
        <Pressable style={styles.close} onPress={onClose}>
          <Text style={{ color: 'white' }}>✕</Text>
        </Pressable>
      )}

      <TextInput
        placeholder="What's happening?"
        placeholderTextColor="#777"
        multiline
        value={text}
        onChangeText={handleTextChange}
        style={styles.textarea}
      />
      {isMentionListOpen && mentionSuggestions.length > 0 ? (
        <View style={styles.mentionList}>
          {mentionSuggestions.slice(0, 6).map((item) => (
            <Pressable
              key={item.id}
              style={styles.mentionItem}
              onPress={() => insertMention(item.username)}
            >
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.mentionAvatar} />
              ) : (
                <View style={[styles.mentionAvatar, styles.mentionAvatarFallback]}>
                  <Text style={styles.mentionAvatarFallbackText}>
                    {(item.displayName || item.username || '?')[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              <View style={styles.mentionTextWrap}>
                <Text style={styles.mentionPrimary}>{item.displayName || item.username}</Text>
                <Text style={styles.mentionSecondary}>@{item.username}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {images.length > 0 &&
        (images.length === 1 ? (
          <ImagePreview
            uri={images[0]}
            kind="image"
            aspectRatio={mediaAspectRatio}
            onRemove={clearSelectedMedia}
          />
        ) : (
          <View style={[styles.imageContainer, { height: 150 }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 8,
                alignItems: 'center',
              }}
            >
              {images.map((uri, index) => (
                <View
                  key={uri}
                  style={{
                    width: 120,
                    height: 120,
                    marginRight: 8,
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: '#020617',
                  }}
                >
                  <Image
                    source={{ uri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => removeImageAtIndex(index)}
                    style={[
                      styles.removeMediaButton,
                      { top: 6, right: 6, width: 24, height: 24, borderRadius: 12 },
                    ]}
                  >
                    <Text style={[styles.removeMediaText, { fontSize: 14 }]}>x</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        ))}
      {video && (
        <ImagePreview
          uri={video}
          kind="video"
          aspectRatio={mediaAspectRatio}
          onRemove={clearSelectedMedia}
        />
      )}
      {gif && <ImagePreview uri={gif} kind="image" onRemove={clearSelectedMedia} />}

      <View style={styles.toolbar}>
        <Pressable onPress={pickMedia}>
          <ImageIcon size={20} color={'#1D9BF0'} />
        </Pressable>

        <Pressable
          onPress={() => {
            setIsGifPickerOpen(true);
          }}
        >
          <Text style={{ color: '#1D9BF0' }}>GIF</Text>
        </Pressable>

        <Pressable onPress={() => setShowPoll(!showPoll)}>
          <BarChart2 size={20} color={'#1D9BF0'} />
        </Pressable>
      </View>

      {showPoll && (
        <PollEditor
          question={pollQuestion}
          setQuestion={setPollQuestion}
          options={pollOptions}
          setOptions={setPollOptions}
        />
      )}

      <Pressable
        style={[
          styles.postButton,
          mutation.isPending && styles.postButtonDisabled,
        ]}
        onPress={submit}
        disabled={mutation.isPending}
      >
        <Text style={styles.postButtonText}>
          {mutation.isPending ? 'Posting...' : 'Post'}
        </Text>
      </Pressable>

      <Modal
        visible={isGifPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGifPickerOpen(false)}
      >
        <View style={styles.gifModalOverlay}>
          <View style={styles.gifModalContent}>
            <View style={styles.gifModalHeader}>
              <Text style={styles.gifModalTitle}>Select a GIF</Text>
              <Pressable onPress={() => setIsGifPickerOpen(false)}>
                <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.gifSearchRow}>
              <TextInput
                placeholder="Search GIFs"
                placeholderTextColor="#777"
                value={gifSearchTerm}
                onChangeText={setGifSearchTerm}
                style={styles.gifSearchInput}
                returnKeyType="search"
                onSubmitEditing={handleGifSearch}
              />
              <Pressable
                style={styles.gifSearchButton}
                onPress={handleGifSearch}
                disabled={isSearchingGifs}
              >
                {isSearchingGifs ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.gifSearchButtonText}>Search</Text>
                )}
              </Pressable>
            </View>

            {gifResults.length === 0 && !isSearchingGifs ? (
              <Text style={styles.gifEmptyText}>
                Try searching for a reaction like {'"'}happy{'"'} or {'"'}wow{'"'}.
              </Text>
            ) : null}

            <FlatList
              data={gifResults}
              keyExtractor={(item) => item.id}
              numColumns={3}
              style={styles.gifGrid}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.gifItem}
                  onPress={() => {
                    setGif(item.originalUrl);
                  setImages([]);
                    setVideo(null);
                    setPickedMimeType(null);
                    setMediaAspectRatio(null);
                    setIsGifPickerOpen(false);
                  }}
                >
                  <Image
                    source={{ uri: item.previewUrl }}
                    style={styles.gifImage}
                    resizeMode="cover"
                  />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}
