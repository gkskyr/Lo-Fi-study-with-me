import { useEffect } from 'react';
import { Text } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Sniglet_400Regular, Sniglet_800ExtraBold } from '@expo-google-fonts/sniglet';
import { useAuthStore } from '../store/authStore';

// Apply Sniglet as default font for all Text components
const defaultTextStyle = Text.defaultProps?.style;
Text.defaultProps = {
  ...Text.defaultProps,
  style: [defaultTextStyle, { fontFamily: 'Sniglet_400Regular' }],
};

function AuthGuard() {
  const { isLoggedIn } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuth = segments[0] === '(auth)';
    if (!isLoggedIn && !inAuth) {
      router.replace('/(auth)');
    } else if (isLoggedIn && inAuth) {
      router.replace('/(main)');
    }
  }, [isLoggedIn, segments]);

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Sniglet_400Regular, Sniglet_800ExtraBold });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <AuthGuard />
    </SafeAreaProvider>
  );
}
