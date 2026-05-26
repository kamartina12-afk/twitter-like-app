import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera, Image as ImageIcon, Mic, Paperclip, X } from 'lucide-react-native';
import { Audio } from 'expo-av';

import { ThemedText } from '@/components/themed-text';
import { readLocalUriAsBlob, uploadChatFile, type ChatAttachment } from '@/services/storage.service';
import { IMAGE_MEDIA_TYPES } from '@/utils/imagePickerMediaTypes';
import { useChatColors } from './chat.utils';
import VoiceMessageBubble from './VoiceMessageBubble';
import type { MessageInputProps } from './chat.types';

const MessageInput = ({
  onSend,
  disabled,
  currentUserId,
  initialText,
  mentionCandidates = [],
}: MessageInputProps) => {
  const [value, setValue] = useState(initialText ?? '');
  const [pendingFiles, setPendingFiles] = useState<
    { blob: Blob; name: string; type: string; size: number; previewUri?: string }[]
  >([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sending, setSending] = useState(false);
  const [isMentionListOpen, setIsMentionListOpen] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<typeof mentionCandidates>([]);
  const colors = useChatColors() as any;

  useEffect(() => {
    if (!initialText) return;
    setValue((prev) => (prev.trim().length > 0 ? prev : initialText));
  }, [initialText]);

  const handleSend = async () => {
    const trimmed = value.trim();
    const hasFiles = pendingFiles.length > 0;
    if (!trimmed && !hasFiles) return;
    if (disabled || !currentUserId || sending) return;

    let attachments: ChatAttachment[] = [];
    if (hasFiles) {
      attachments = await Promise.all(
        pendingFiles.map((file) =>
          uploadChatFile(file.blob, {
            userId: currentUserId,
            name: file.name,
            type: file.type,
            size: file.size,
          }),
        ),
      );
    }

    try {
      setSending(true);
      await onSend(trimmed, attachments.length ? attachments : undefined);
      setValue('');
      setPendingFiles([]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } finally {
      setSending(false);
    }
  };

  const addImageAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.uri) return;

    // `fetch(uri).blob()` is unreliable for RN local URIs (file://, content://, ph://).
    // Reuse the project's robust helper that uses XHR + blob.
    let blob: Blob;
    try {
      blob = await readLocalUriAsBlob(asset.uri);
    } catch (e) {
      console.error('Failed to read picked image as Blob', e);
      return;
    }

    setPendingFiles((prev) => [
      ...prev,
      {
        blob,
        name: asset.fileName || 'image.jpg',
        type: asset.mimeType || 'image/jpeg',
        size: blob.size,
        previewUri: asset.uri,
      },
    ]);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: IMAGE_MEDIA_TYPES,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    await addImageAsset(asset);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: IMAGE_MEDIA_TYPES,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    await addImageAsset(asset);
  };

  const pickFile = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.uri) return;

    const blob = await readLocalUriAsBlob(asset.uri);

    setPendingFiles((prev) => [
      ...prev,
      {
        blob,
        name: asset.name || 'file',
        type: asset.mimeType || 'application/octet-stream',
        size: blob.size,
        previewUri: asset.uri,
      },
    ]);
  };

  const removeFileAtIndex = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMessageChange = (nextValue: string) => {
    setValue(nextValue);
    const match = nextValue.match(/(^|\s)@([\w]{0,32})$/);
    if (!match) {
      setMentionSuggestions([]);
      setIsMentionListOpen(false);
      return;
    }
    const query = (match[2] || '').trim().toLowerCase();
    const filtered = mentionCandidates.filter((candidate) => {
      const username = candidate.username.toLowerCase();
      const displayName = (candidate.displayName || '').toLowerCase();
      if (!query) return true;
      return username.includes(query) || displayName.includes(query);
    });
    setMentionSuggestions(filtered.slice(0, 6));
    setIsMentionListOpen(filtered.length > 0);
  };

  const insertMention = (username: string) => {
    const updated = value.replace(/(^|\s)@[\w]{0,32}$/, `$1@${username} `);
    setValue(updated);
    setMentionSuggestions([]);
    setIsMentionListOpen(false);
  };

  const toggleRecording = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        if (!uri || !currentUserId) return;

        const blob = await readLocalUriAsBlob(uri);

        setPendingFiles((prev) => [
          ...prev,
          {
            blob,
            name: `voice-message-${Date.now()}.m4a`,
            type: 'audio/m4a',
            size: blob.size,
            previewUri: uri,
          },
        ]);
      } catch {
        setRecording(null);
      }
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(newRecording);
    } catch {
      setRecording(null);
    }
  };

  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
        zIndex: 24,
        elevation: 16,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 8,
        }}
      >
        <Pressable
          onPress={() => {
            takePhoto().catch((error) => {
              console.error('Take photo failed', error);
            });
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Camera size={18} color={colors.tint} />
        </Pressable>
        <Pressable
          onPress={() => {
            pickImage().catch((error) => {
              console.error('Pick image failed', error);
            });
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ImageIcon size={18} color={colors.tint} />
        </Pressable>
        <Pressable
          onPress={pickFile}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paperclip size={18} color={colors.tint} />
        </Pressable>
        <Pressable
          onPress={toggleRecording}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: recording ? colors.tint : colors.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Mic size={18} color={recording ? colors.background : colors.tint} />
        </Pressable>
        <View
          style={{
            flex: 1,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <TextInput
            placeholder="Message..."
            placeholderTextColor={colors.muted}
            value={value}
            onChangeText={handleMessageChange}
            style={{
              color: colors.text,
              paddingVertical: 0,
            }}
            multiline
          />
          {recording ? (
            <ThemedText
              style={{
                fontSize: 11,
                marginTop: 4,
                opacity: 0.8,
                color: colors.tint,
              }}
            >
              Recording voice message… tap mic to stop
            </ThemedText>
          ) : null}
        </View>
        <Pressable
          onPress={handleSend}
          disabled={disabled || sending}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: disabled || sending ? colors.border : colors.tint,
          }}
        >
          <ThemedText
            style={{
              color: disabled || sending ? colors.muted : colors.background,
              fontWeight: '600',
            }}
          >
            {sending ? 'Sending…' : 'Send'}
          </ThemedText>
        </Pressable>
      </View>
      {pendingFiles.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {pendingFiles.map((file, index) => {
              const isImage = file.type.startsWith('image/');
              const isAudio = file.type.startsWith('audio/');
              return (
                <View
                  key={`${file.name}-${index}-${file.size}`}
                  style={{
                    marginRight: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 6,
                    backgroundColor: colors.card,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Pressable
                    onPress={() => removeFileAtIndex(index)}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#020617',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 2,
                    }}
                  >
                    <X size={12} color="#e5e7eb" />
                  </Pressable>
                  {isImage && file.previewUri ? (
                    <Image
                      source={{ uri: file.previewUri }}
                      style={{ width: 44, height: 44, borderRadius: 8 }}
                    />
                  ) : null}
                  {isAudio && file.previewUri ? (
                    <VoiceMessageBubble uri={file.previewUri} isOwn compact />
                  ) : !isImage ? (
                    <View>
                      <ThemedText
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          marginBottom: 2,
                        }}
                        numberOfLines={1}
                      >
                        Attachment
                      </ThemedText>
                      <ThemedText style={{ fontSize: 11, opacity: 0.7 }} numberOfLines={1}>
                        {file.name}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      {isMentionListOpen && mentionSuggestions.length > 0 ? (
        <View
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: colors.card,
          }}
        >
          {mentionSuggestions.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => insertMention(item.username)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              {item.avatarUrl ? (
                <Image
                  source={{ uri: item.avatarUrl }}
                  style={{ width: 30, height: 30, borderRadius: 15 }}
                />
              ) : (
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0f172a',
                  }}
                >
                  <ThemedText style={{ fontSize: 12, fontWeight: '700', color: '#e5e7eb' }}>
                    {(item.displayName || item.username || '?')[0]?.toUpperCase() ?? '?'}
                  </ThemedText>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>
                  {item.displayName || item.username}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>@{item.username}</ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

export default MessageInput;

