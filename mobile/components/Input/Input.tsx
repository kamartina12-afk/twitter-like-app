import { TextInput } from "react-native";
import { styles } from "./Input.styled";

export default function Input(props: any) {
  return <TextInput style={styles.input} {...props} />;
}
