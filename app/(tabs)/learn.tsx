import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../theme';

export default function Learn() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Learn — coming next</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  text: {
    ...Typography.h2,
    color: Colors.text,
  },
});