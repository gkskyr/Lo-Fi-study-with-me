import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../constants/colors';

interface Props {
  topic: string;
  completedRounds: number;
  totalRounds: number;
  totalMinutes: number;
  xpAwarded: number;
  leveledUp: boolean;
  onNewSession: () => void;
  onGoHome: () => void;
}

export default function SessionSummary({
  topic, completedRounds, totalRounds, totalMinutes,
  xpAwarded, leveledUp, onNewSession, onGoHome,
}: Props) {
  const early = completedRounds < totalRounds;
  const [displayXp, setDisplayXp] = useState(0);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    if (xpAwarded === 0) return;
    const duration = 1500;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayXp(Math.round(eased * xpAwarded));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [xpAwarded]);

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const durationLabel = hours > 0 ? `${hours}s ${mins}dk` : `${mins} dk`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>{early ? '⏹️' : '🎉'}</Text>
          <Text style={s.title}>{early ? 'Erken Bitirilen Oturum' : 'Oturum Tamamlandı!'}</Text>
          <Text style={s.topic} numberOfLines={1}>{topic}</Text>
        </View>

        <View style={s.stats}>
          <StatCard label="Tekrar" value={`${completedRounds}/${totalRounds}`} />
          <StatCard label="Süre" value={durationLabel} />
          <StatCard label="Denetim" value="—" />
        </View>

        <View style={s.xpCard}>
          <Text style={s.xpLabel}>KAZANILAN XP</Text>
          <Text style={s.xpValue}>+{displayXp}</Text>
          {leveledUp && <Text style={s.levelUp}>🏆 Seviye atladın!</Text>}
        </View>

        <Pressable style={s.btnPrimary} onPress={onNewSession}>
          <Text style={{ color: C.btnPrimaryText, fontWeight: '700', fontSize: 15 }}>Yeni Oturum Başlat</Text>
        </Pressable>
        <Pressable style={s.btnSecondary} onPress={onGoHome}>
          <Text style={{ color: C.textMed, fontWeight: '600', fontSize: 15 }}>Ana Sayfaya Dön</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, alignItems: 'center' }}>
      <Text style={{ fontSize: 11, color: C.textLight, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: C.textMed }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  header: { alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: C.textDark, textAlign: 'center' },
  topic: { fontSize: 13, color: C.textLight, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 8 },
  xpCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20, alignItems: 'center' },
  xpLabel: { fontSize: 10, letterSpacing: 2, color: C.textLight, marginBottom: 4 },
  xpValue: { fontSize: 56, fontWeight: '900', color: '#f59e0b', lineHeight: 64 },
  levelUp: { fontSize: 14, fontWeight: '600', color: C.textMed, marginTop: 8 },
  btnPrimary: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnSecondary: { borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
});
