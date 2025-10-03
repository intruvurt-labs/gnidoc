import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <AlertTriangle color={Colors.Colors.red.primary} size={64} />
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
        <Text style={styles.subtitle}>
          The page you&apos;re looking for couldn&apos;t be found in the gnidoC Terces system.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.Colors.background.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
    paddingHorizontal: 24,
    backgroundColor: Colors.Colors.cyan.primary,
    borderRadius: 12,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Colors.text.inverse,
  },
});