import { StyleProp, ViewStyle } from "react-native";

export type ExpoVideoPlayerProps = {
    uri: string;
    style: StyleProp<ViewStyle>;
    contentFit?: 'contain' | 'cover' | 'fill';
    nativeControls?: boolean;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    onPlaybackStatusUpdate?: (status: any) => void;
    onPress?: () => void;
    onDoublePress?: () => void;
    onPlayToEnd?: () => void;
    feedControls?: boolean;
  };