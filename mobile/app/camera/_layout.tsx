import { Stack } from 'expo-router';

export default function CameraLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_left',
        gestureDirection: 'horizontal',
      }}
    />
  );
}
