import { useRef } from 'react';
import { Animated, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Polygon } from 'react-native-svg';
import { useAuthStore } from '../../store/authStore';
import { C } from '../../constants/colors';

function HexButton({ label, emoji, onPress }: { label: string; emoji: string; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={{ width: 140, height: 162, transform: [{ scale }] }}>
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={s.hexPressable}
      >
        <View style={s.hexSvgAbsolute}>
          <Svg width={140} height={162} viewBox="0 0 100 115.47">
            <Polygon points="50,0 100,25 100,75 50,100 0,75 0,25" fill={C.accent} />
          </Svg>
        </View>
        <Text style={s.hexEmoji}>{emoji}</Text>
        <Text style={s.hexLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { username, logout } = useAuthStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.logo}>koZan</Text>
          {username && <Text style={s.greeting}>Merhaba, @{username}</Text>}
        </View>

        <Text style={s.subtitle}>Ne yapmak istersin?</Text>

        <View style={s.hexRow}>
          <HexButton
            label="Kişisel Oda"
            emoji="📚"
            onPress={() => router.push('/(main)/personal-room')}
          />
          <HexButton
            label="Topluluk"
            emoji="🐝"
            onPress={() => router.push('/(main)/community')}
          />
        </View>

        <Pressable onPress={logout} style={s.logoutBtn}>
          <Text style={s.logoutText}>Çıkış Yap</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 28, justifyContent: 'center', alignItems: 'center', gap: 24 },
  header: { alignItems: 'center', gap: 4 },
  logo: { fontSize: 42, fontWeight: '900', color: C.textDark, letterSpacing: 2 },
  greeting: { fontSize: 14, color: C.textMed, fontWeight: '500' },
  subtitle: { fontSize: 16, color: C.textMed, fontWeight: '600' },
  hexRow: { flexDirection: 'row', gap: 24, marginTop: 8 },
  hexPressable: { width: 140, height: 162, alignItems: 'center', justifyContent: 'center' },
  hexSvgAbsolute: { position: 'absolute' },
  hexEmoji: { fontSize: 28, marginBottom: 4 },
  hexLabel: { fontSize: 13, fontWeight: '700', color: C.btnPrimaryText, textAlign: 'center' },
  logoutBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 28, borderWidth: 1.5, borderColor: C.border, borderRadius: 12 },
  logoutText: { fontSize: 14, color: C.textMed, fontWeight: '600' },
});
