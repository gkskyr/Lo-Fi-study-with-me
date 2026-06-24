import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStudyTimer } from './useStudyTimer';
import { api, type StudySession } from '../../lib/api';
import { C } from '../../constants/colors';

interface Props {
  session: StudySession;
  token: string;
  onSessionEnd: (ended: StudySession & { xpResult: { xp: number; role: string; leveledUp: boolean } }) => void;
}

export default function StudySessionView({ session, token, onSessionEnd }: Props) {
  const [ending, setEnding] = useState(false);

  const timer = useStudyTimer(
    {
      workMinutes: session.workMinutes,
      breakMinutes: session.breakMinutes,
      totalRounds: session.totalRounds,
      method: session.method,
    },
    {
      onRoundComplete: (round) => {
        api.incrementRound(session.id, token).catch(console.error);
      },
      onSessionDone: handleEnd,
    },
  );

  async function handleEnd() {
    if (ending) return;
    setEnding(true);
    try {
      const ended = await api.endStudySession(session.id, token);
      onSessionEnd(ended);
    } catch (e) {
      console.error(e);
      setEnding(false);
    }
  }

  const mins = String(Math.floor(timer.remaining / 60)).padStart(2, '0');
  const secs = String(timer.remaining % 60).padStart(2, '0');
  const isWork = timer.phase === 'work';
  const isDone = timer.phase === 'done';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Topic bar */}
      <View style={s.topicBar}>
        <Text style={s.topicText} numberOfLines={1}>{session.topic}</Text>
      </View>

      <View style={s.body}>
        {/* Phase badge */}
        <View style={[s.badge, { borderColor: isWork ? C.accent : C.orange }]}>
          <Text style={[s.badgeText, { color: isWork ? C.textMed : '#c2410c' }]}>
            {isDone ? 'TAMAMLANDI' : isWork ? 'ÇALIŞMA' : 'MOLA'}
          </Text>
        </View>

        {/* Timer */}
        <Text style={[s.clock, { color: isWork ? '#f59e0b' : C.orange }]}>
          {mins}:{secs}
        </Text>

        {/* Round dots */}
        <View style={s.roundsContainer}>
          <Text style={s.roundsLabel}>TUR</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
            {Array.from({ length: session.totalRounds }).map((_, i) => (
              <View
                key={i}
                style={[s.roundDot, {
                  backgroundColor:
                    i < timer.currentRound - 1 ? C.accent
                    : i === timer.currentRound - 1 ? (isWork ? C.accent : C.orange)
                    : C.border,
                  opacity: i < timer.currentRound - 1 ? 0.5 : 1,
                }]}
              />
            ))}
          </View>
          <Text style={s.roundsCount}>{timer.currentRound} / {session.totalRounds}</Text>
        </View>

        <Text style={s.durationInfo}>
          {timer.workMinutes} dk çalışma · {timer.breakMinutes} dk mola
        </Text>

        <Pressable
          onPress={handleEnd}
          disabled={ending}
          style={[s.endBtn, { opacity: ending ? 0.5 : 1 }]}
        >
          <Text style={{ color: C.red, fontWeight: '600', fontSize: 14 }}>
            {ending ? 'Bitiriliyor…' : 'Oturumu Bitir'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  topicBar: { backgroundColor: C.card, paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  topicText: { color: C.textMed, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  badge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(251,191,36,0.1)' },
  badgeText: { fontWeight: '700', fontSize: 11, letterSpacing: 2 },
  clock: { fontFamily: 'monospace', fontSize: 80, fontWeight: '900', lineHeight: 90 },
  roundsContainer: { alignItems: 'center' },
  roundsLabel: { fontSize: 10, color: C.textLight, letterSpacing: 2 },
  roundDot: { width: 12, height: 12, borderRadius: 6 },
  roundsCount: { fontSize: 13, color: C.textLight },
  durationInfo: { fontSize: 12, color: C.textMed },
  endBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.redLight },
});
