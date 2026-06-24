import { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { useRoomSocket } from '../../../components/community/useRoomSocket';
import QASection from '../../../components/community/QASection';
import { api, type Room } from '../../../lib/api';
import { C } from '../../../constants/colors';

export default function RoomDetailScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { accessToken, username } = useAuthStore();

  const [room, setRoom] = useState<Room | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    api.getRoom(roomId, accessToken ?? undefined).then(setRoom).catch(console.error);
  }, [roomId, accessToken]);

  const { participants, toasts, newQuestions, connected } = useRoomSocket(
    roomId,
    joined ? (accessToken ?? null) : null,
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Geri</Text>
          </Pressable>
          <Text style={s.roomTitle} numberOfLines={1}>
            {room?.title ?? 'Yükleniyor…'}
          </Text>
          <View style={[s.dot, { backgroundColor: connected ? '#22c55e' : C.border }]} />
        </View>

        {/* Participants bar */}
        {joined && participants.length > 0 && (
          <View style={s.participantsBar}>
            <Text style={s.participantsLabel}>
              {participants.length} katılımcı:
            </Text>
            <Text style={s.participantNames} numberOfLines={1}>
              {participants.map((p) => `@${p.username}`).join(', ')}
            </Text>
          </View>
        )}

        {/* Join/Leave button */}
        <Pressable
          onPress={() => setJoined((j) => !j)}
          style={[s.joinBtn, joined && s.leaveBtn]}
        >
          <Text style={[s.joinBtnText, joined && s.leaveBtnText]}>
            {joined ? 'Odadan Ayrıl' : 'Odaya Katıl'}
          </Text>
        </Pressable>

        {/* Q&A */}
        <View style={s.qa}>
          <QASection
            roomId={roomId}
            newQuestions={newQuestions}
            accessToken={accessToken}
          />
        </View>
      </View>

      {/* Toasts */}
      <View style={s.toastContainer} pointerEvents="none">
        {toasts.map((t) => (
          <View key={t.id} style={s.toast}>
            <Text style={s.toastText}>{t.message}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  backBtn: { paddingRight: 4 },
  backText: { fontSize: 14, color: C.accent, fontWeight: '600' },
  roomTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.textDark },
  dot: { width: 10, height: 10, borderRadius: 5 },
  participantsBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10,
  },
  participantsLabel: { fontSize: 12, fontWeight: '700', color: C.textMed },
  participantNames: { flex: 1, fontSize: 12, color: C.textLight },
  joinBtn: {
    backgroundColor: C.accent, borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', marginBottom: 14,
  },
  leaveBtn: { backgroundColor: '#ef4444' },
  joinBtnText: { fontSize: 14, fontWeight: '700', color: C.btnPrimaryText },
  leaveBtnText: { color: '#fff' },
  qa: { flex: 1 },
  toastContainer: {
    position: 'absolute', top: 60, right: 16,
    flexDirection: 'column', gap: 6, zIndex: 50,
  },
  toast: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  toastText: { fontSize: 13, color: C.textMed },
});
