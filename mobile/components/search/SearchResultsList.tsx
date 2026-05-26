import { useCallback } from 'react';
import { FlatList, ListRenderItemInfo } from 'react-native';
import UserSearchItem from './UsersSearchItem';

interface Props {
  users: any[];
  onPress?: (user: any) => void;
}

export default function SearchResultsList({ users, onPress }: Props) {
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<(typeof users)[number]>) => (
      <UserSearchItem user={item} onPress={onPress} />
    ),
    [onPress],
  );

  return (
    <FlatList
      keyboardShouldPersistTaps="handled"
      data={users}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
    />
  );
}
