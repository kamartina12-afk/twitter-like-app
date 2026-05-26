import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { Pencil } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { uploadAvatar, uploadCover } from '@/services/storage.service';
import { profileServices, type UpdateProfilePayload } from '@/services/profileServices';
import { IMAGE_MEDIA_TYPES } from '@/utils/imagePickerMediaTypes';

type EditProfileScreenProps = {
  onDone: () => void;
};

export function EditProfileScreen({ onDone }: EditProfileScreenProps) {
  const { user, profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [birthDate, setBirthDate] = useState(
    profile?.birthDate ? new Date(profile.birthDate).toISOString().slice(0, 10) : '',
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatarUrl ?? null);
  const [coverPreview, setCoverPreview] = useState<string | null>(profile?.coverUrl ?? null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();

      let avatarUrl = profile?.avatarUrl ?? null;
      let coverUrl = profile?.coverUrl ?? null;

      if (avatarBlob) {
        avatarUrl = await uploadAvatar(avatarBlob, user.uid);
      }

      if (coverBlob) {
        coverUrl = await uploadCover(coverBlob, user.uid);
      }

      const payload: UpdateProfilePayload = {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl,
        coverUrl,
        birthDate: birthDate ? new Date(birthDate).toISOString() : null,
      };

      await profileServices.updateProfile(token, payload);
      await refreshProfile();
    },
    onSuccess: () => {
      onDone();
    },
  });

  const pickImage = async (type: 'avatar' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: IMAGE_MEDIA_TYPES,
      allowsEditing: true,
      quality: 0.9,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    if (!asset.uri) return;

    const response = await fetch(asset.uri);
    const blob = await response.blob();

    if (type === 'avatar') {
      setAvatarBlob(blob);
      setAvatarPreview(asset.uri);
    } else {
      setCoverBlob(blob);
      setCoverPreview(asset.uri);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView
        style={{
          flex: 1,
          paddingHorizontal: 16,
          paddingTop: 12,
          gap: 16,
        }}
      >
        <ThemedText style={{ fontSize: 18, fontWeight: '700' }}>Edit profile</ThemedText>

        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#1f2937',
            overflow: 'hidden',
          }}
        >
          <View style={{ height: 100, backgroundColor: '#020617' }}>
            {coverPreview ? (
              <Image
                source={{ uri: coverPreview }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : null}

            <Pressable
              style={{
                position: 'absolute',
                right: 12,
                bottom: 12,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: 'rgba(15,23,42,0.8)',
              }}
              onPress={() => pickImage('cover')}
            >
              <ThemedText style={{ fontSize: 12 }}>Change cover</ThemedText>
            </Pressable>
          </View>

          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 40,
              paddingBottom: 16,
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: -32,
                left: 24,
                width: 64,
                height: 64,
                borderRadius: 999,
                borderWidth: 3,
                borderColor: '#020617',
                backgroundColor: '#0f172a',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {avatarPreview ? (
                <Image
                  source={{ uri: avatarPreview }}
                  style={{ width: '100%', height: '100%', borderRadius: 999 }}
                />
              ) : (
                <ThemedText style={{ fontSize: 26, fontWeight: '700' }}>
                  {(displayName[0] || profile?.username?.[0] || '?').toUpperCase()}
                </ThemedText>
              )}
              <Pressable
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: '#0f172a',
                }}
                onPress={() => pickImage('avatar')}
              >
                <Pencil size={12} color="#e5e7eb" />
              </Pressable>
            </View>

            <View style={{ gap: 10 }}>
              <View>
                <ThemedText style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                  Display name
                </ThemedText>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your name"
                  placeholderTextColor="#4b5563"
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#1f2937',
                    paddingHorizontal: 10,
                    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
                    color: '#f9fafb',
                  }}
                />
              </View>

              <View>
                <ThemedText style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                  Bio
                </ThemedText>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Write something about yourself"
                  placeholderTextColor="#4b5563"
                  multiline
                  numberOfLines={3}
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#1f2937',
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    color: '#f9fafb',
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              <View>
                <ThemedText style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                  Birthday
                </ThemedText>
                <TextInput
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#4b5563"
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#1f2937',
                    paddingHorizontal: 10,
                    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
                    color: '#f9fafb',
                  }}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
          <Pressable
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#1f2937',
            }}
            onPress={onDone}
            disabled={mutation.isPending}
          >
            <ThemedText style={{ color: '#9ca3af' }}>Cancel</ThemedText>
          </Pressable>
          <Pressable
            style={{
              paddingHorizontal: 18,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: '#38bdf8',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              opacity: mutation.isPending ? 0.7 : 1,
            }}
            disabled={mutation.isPending}
            onPress={() => {
              mutation.mutate();
            }}
          >
            {mutation.isPending && <ActivityIndicator size="small" color="#0f172a" />}
            <ThemedText style={{ color: '#0f172a', fontWeight: '600' }}>Save</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

