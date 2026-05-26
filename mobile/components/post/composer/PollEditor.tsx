import { View, TextInput } from 'react-native';
import styles from './CreatePostCard.styles';

interface Props {
  question: string;
  setQuestion: (value: string) => void;
  options: string[];
  setOptions: (v: string[]) => void;
}

export default function PollEditor({
  question,
  setQuestion,
  options,
  setOptions,
}: Props) {
  const update = (text: string, index: number) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  return (
    <View style={styles.pollContainer}>
      <TextInput
        placeholder="Ask a question"
        value={question}
        onChangeText={setQuestion}
        style={styles.pollQuestionInput}
        placeholderTextColor="#777"
      />
      {options.map((o, i) => (
        <TextInput
          key={i}
          placeholder={`Option ${i + 1}`}
          value={o}
          onChangeText={(t) => update(t, i)}
          style={styles.pollInput}
        />
      ))}
    </View>
  );
}
