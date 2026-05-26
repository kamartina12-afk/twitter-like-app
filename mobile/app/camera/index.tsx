import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Image as ImageIcon, RefreshCw, X } from 'lucide-react-native';

import { IMAGE_MEDIA_TYPES } from '@/utils/imagePickerMediaTypes';

export default function CameraCaptureScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const goToEditor = useCallback(
    (uri: string) => {
      router.push({
        pathname: '/camera/editor',
        params: { photoUri: encodeURIComponent(uri) },
      } as never);
    },
    [router],
  );

  const takePicture = useCallback(async () => {
    if (!cameraRef.current || !cameraReady) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.92 });
      goToEditor(photo.uri);
    } catch {
      // Camera not ready or capture failed
    }
  }, [cameraReady, goToEditor]);

  const openGallery = useCallback(async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: IMAGE_MEDIA_TYPES,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) return;
    const uri = result.assets[0].uri;
    if (uri) goToEditor(uri);
  }, [goToEditor]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (
        _: GestureResponderEvent,
        gesture: PanResponderGestureState,
      ) => Math.abs(gesture.dy) > 16 && Math.abs(gesture.dy) > Math.abs(gesture.dx),

      onPanResponderRelease: async (
        _: GestureResponderEvent,
        gesture: PanResponderGestureState,
      ) => {
        if (gesture.dy < -72) {
          await openGallery();
        }
      },
    }),
  ).current;

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionRoot}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
          <X color="#fff" size={28} />
        </Pressable>
        <Text style={styles.permissionTitle}>Camera access</Text>
        <Text style={styles.permissionBody}>
          Allow camera access to take photos to send in chat.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => requestPermission()}>
          <Text style={styles.primaryBtnText}>Continue</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="picture"
        onCameraReady={() => setCameraReady(true)}
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable style={styles.iconHit} onPress={() => router.back()} hitSlop={12}>
            <X color="#fff" size={28} />
          </Pressable>
          <Text style={styles.title}>Camera</Text>
          <Pressable
            style={styles.iconHit}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            hitSlop={12}
          >
            <RefreshCw color="#fff" size={26} />
          </Pressable>
        </View>

        <View style={styles.bottomArea}>
          <Text style={styles.hint}>Swipe up for gallery</Text>
          <View style={styles.bottomRow}>
            <Pressable style={styles.sideControl} onPress={openGallery}>
              <ImageIcon color="#fff" size={28} />
            </Pressable>

            <Pressable
              style={[styles.shutterOuter, !cameraReady && styles.shutterDisabled]}
              onPress={takePicture}
              disabled={!cameraReady}
            >
              <View style={styles.shutterInner} />
            </Pressable>

            <View style={styles.sideControl} />
          </View>
        </View>
      </SafeAreaView>

      {!cameraReady ? (
        <View style={styles.warming} pointerEvents="none">
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  iconHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomArea: {
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  hint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideControl: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  shutterDisabled: {
    opacity: 0.45,
  },
  warming: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  permissionRoot: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  closeBtn: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  permissionBody: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
