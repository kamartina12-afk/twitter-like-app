import { memo } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import styles from './Search.styles';

interface Props {
  user: any;
  onPress?: (user: any) => void;
}

function UserSearchItem({ user, onPress }: Props) {
  const avatarUrl = user.avatarUrl || user.avatar || null;
  const displayName = user.displayName || user.username || user.email || '';
  const initials = displayName ? displayName[0].toUpperCase() : '?';

  return (
    <Pressable
      style={styles.userItem}
      onPress={() => {
        onPress?.(user);
      }}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
      )}

      <View>
        <Text style={styles.name}>{displayName}</Text>
        {user.username ? <Text style={styles.username}>@{user.username}</Text> : null}
      </View>
    </Pressable>
  );
}

export default memo(UserSearchItem);
