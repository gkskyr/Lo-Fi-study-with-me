import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import BeehiveButton from '../../components/auth/BeehiveButton';
import AuthForm from '../../components/auth/AuthForm';
import { C } from '../../constants/colors';

type Screen = 'idle' | 'auth';

export default function AuthScreen() {
  const [screen, setScreen] = useState<Screen>('idle');
  const { setAuth } = useAuthStore();

  function handleSuccess(username: string, accessToken: string) {
    setAuth(username, accessToken);
    // AuthGuard in _layout.tsx handles redirect automatically
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.container}>
        {screen === 'idle' && (
          <View style={s.center}>
            <Text style={s.tagline}>Çalışmayı bir alışkanlığa dönüştür.</Text>
            <View style={{ marginTop: 40 }}>
              <BeehiveButton onPress={() => setScreen('auth')} />
            </View>
          </View>
        )}

        {screen === 'auth' && (
          <View style={s.formContainer}>
            <AuthForm onSuccess={handleSuccess} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  center: { alignItems: 'center' },
  tagline: { fontSize: 15, color: C.textMed, textAlign: 'center' },
  formContainer: { width: '100%', alignItems: 'center' },
});
