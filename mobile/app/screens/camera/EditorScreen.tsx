import React, { useRef, useState } from 'react';
import { View, Image, TouchableOpacity, TextInput } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import DrawingCanvas from '@/components/camera/DrawingCanvas';
import DraggableText from '@/components/camera/DraggableText';
import { TextItem } from '@/types/camera.types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Editor: { photoUri: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Editor'>;

export default function EditorScreen({ route }: Props) {
  const { photoUri } = route.params;
  const viewRef = useRef<View>(null);

  const [texts, setTexts] = useState<TextItem[]>([]);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputText, setInputText] = useState('');

  const addText = () => {
    if (!inputText.trim()) return;

    setTexts((prev) => [
      ...prev,
      {
        id: Date.now(),
        value: inputText,
        x: 100,
        y: 100,
      },
    ]);

    setInputText('');
    setInputVisible(false);
  };

  const saveImage = async () => {
    if (!viewRef.current) return;

    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
    });

    console.log(uri);
  };

  return (
    <View style={{ flex: 1 }}>
      <View ref={viewRef} style={{ flex: 1 }} collapsable={false}>
        <Image source={{ uri: photoUri }} style={{ flex: 1 }} />

        <DrawingCanvas />

        {texts.map((t) => (
          <DraggableText key={t.id} data={t} />
        ))}
      </View>

      <TouchableOpacity
        onPress={() => setInputVisible(true)}
        style={{ position: 'absolute', bottom: 100, left: 20 }}
      />

      <TouchableOpacity
        onPress={saveImage}
        style={{ position: 'absolute', bottom: 100, right: 20 }}
      />

      {inputVisible && (
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={addText}
          style={{
            position: 'absolute',
            top: 100,
            left: 20,
            right: 20,
            backgroundColor: 'white',
          }}
        />
      )}
    </View>
  );
}
