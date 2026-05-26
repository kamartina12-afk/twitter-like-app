import { View, TextInput } from 'react-native';
import styles from './Search.styles';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export default function SearchBar({ value, onChange, onFocus, onBlur }: Props) {
  return (
    <View style={styles.searchBar}>
      <View style={styles.searchInputWrapper}>
        <TextInput
          placeholder="Search"
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChange}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </View>
    </View>
  );
}
