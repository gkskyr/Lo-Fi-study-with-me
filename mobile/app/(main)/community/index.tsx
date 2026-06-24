import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { api, type Room } from '../../../lib/api';
import HexGrid from '../../../components/community/HexGrid';
import { C } from '../../../constants/colors';

export default function CommunityScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRooms(accessToken ?? undefined)
      .then((all) => setRooms(all.filter((r) => r.type === 'COMMUNITY')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [accessToken]);

  function handleRoomPress(room: Room) {
    router.push(`/(main)/community/${room.slug ?? room.id}`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.container}>
        <Text style={s.title}>TOPLULUK ODALARI</Text>
        <Text style={s.subtitle}>Bir odaya gir, sorularını sor ve cevapla.</Text>

        {loading && (
          <ActivityIndicator color={C.accent} size="large" style={{ marginTop: 40 }} />
        )}

        {!loading && rooms.length === 0 && (
          <Text style={{ color: C.textMed, marginTop: 20 }}>Henüz topluluk odası yok.</Text>
        )}

        {!loading && rooms.length > 0 && (
          <HexGrid rooms={rooms} onRoomPress={handleRoomPress} />
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 26, fontWeight: '900', color: C.textDark, letterSpacing: 1 },
  subtitle: { fontSize: 13, color: C.textMed, marginTop: 4, marginBottom: 20 },
});
