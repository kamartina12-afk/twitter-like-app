import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextStyle, View } from 'react-native';
import styles from './PostCard.styles';

export type PostContentProps = {
  text?: string;
  collapsedLines?: number;
  textStyle?: TextStyle;
  readMoreTextStyle?: TextStyle;
};

function PostContentView({
  text,
  collapsedLines = 2,
  textStyle,
  readMoreTextStyle: readMoreLinkStyle,
}: PostContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fullLineCount, setFullLineCount] = useState(0);
  const mergedTextStyle = useMemo(() => [styles.text, textStyle], [textStyle]);
  const toggleExpanded = () => setIsExpanded((prev) => !prev);

  useEffect(() => {
    setIsExpanded(false);
    setFullLineCount(0);
  }, [text, collapsedLines]);

  if (!text) return null;

  const isTruncated = fullLineCount > collapsedLines;

  return (
    <View>
      <Pressable disabled={!isTruncated} onPress={toggleExpanded}>
        <Text
          style={mergedTextStyle}
          numberOfLines={isExpanded ? undefined : collapsedLines}
          ellipsizeMode="tail"
        >
          {text}
        </Text>
      </Pressable>

      {/* Hidden full-text measurement; avoids Android line-count issues with numberOfLines */}
      {fullLineCount === 0 && (
        <Text
          style={[mergedTextStyle, { position: 'absolute', opacity: 0, zIndex: -1 }]}
          onTextLayout={(event) => {
            setFullLineCount(event.nativeEvent.lines.length);
          }}
        >
          {text}
        </Text>
      )}

      {isTruncated && (
        <Pressable onPress={toggleExpanded}>
          <Text style={[styles.readMoreText, readMoreLinkStyle]}>
            {isExpanded ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export const PostContent = memo(PostContentView);
PostContent.displayName = 'PostContent'