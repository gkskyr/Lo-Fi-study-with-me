import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StudyMethod, StudySessionConfig } from '../../lib/api';
import { C } from '../../constants/colors';

const METHOD_PRESETS: { id: StudyMethod; label: string; desc: string; work: number; brk: number; rounds: number }[] = [
  { id: 'POMODORO',       label: 'Pomodoro',       desc: '25 dk çalış · 5 dk mola · 5 tekrar',  work: 25, brk: 5,  rounds: 5 },
  { id: 'BASLAYAMIYORUM', label: 'Başlayamıyorum',  desc: '10 dk çalış · 5 dk mola · 5 tekrar',  work: 10, brk: 5,  rounds: 5 },
  { id: 'KLASIK',         label: 'Klasik',          desc: '45 dk çalış · 15 dk mola · 5 tekrar', work: 45, brk: 15, rounds: 5 },
  { id: 'RASTGELE',       label: 'Rastgele',        desc: 'Rastgele süreler · 5 tekrar',          work: 25, brk: 10, rounds: 5 },
  { id: 'OZEL',           label: 'Özel',            desc: 'Kendi süreni belirle',                 work: 25, brk: 5,  rounds: 5 },
];

interface Props {
  onComplete: (config: StudySessionConfig) => void;
}

export default function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState('');
  const [method, setMethod] = useState<StudyMethod | null>(null);
  const [customWork, setCustomWork] = useState(25);
  const [customBreak, setCustomBreak] = useState(5);
  const [customRounds, setCustomRounds] = useState(5);

  function getConfig(): StudySessionConfig {
    const preset = METHOD_PRESETS.find((p) => p.id === method)!;
    return {
      topic,
      method: method!,
      workMinutes:  method === 'OZEL' ? customWork   : preset.work,
      breakMinutes: method === 'OZEL' ? customBreak  : preset.brk,
      totalRounds:  method === 'OZEL' ? customRounds : preset.rounds,
      monitoringType: 'NONE',
    };
  }

  const canStep1 = topic.trim().length > 0;
  const canStep2 = method !== null && (method !== 'OZEL' || (customWork >= 1 && customBreak >= 1 && customRounds >= 1));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Progress indicator */}
        <View style={s.progress}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[s.dot, step >= n && s.dotActive]}>
                <Text style={[s.dotText, step >= n && s.dotTextActive]}>{n}</Text>
              </View>
              {n < 3 && <View style={[s.line, step > n && s.lineActive]} />}
            </View>
          ))}
        </View>

        {step === 1 && (
          <View>
            <Text style={s.title}>Bugün neye çalışacaksın?</Text>
            <Text style={s.subtitle}>Konu oturum boyunca görünecek.</Text>
            <TextInput
              style={s.input}
              placeholder="ör. Matematik — Türev ve İntegral"
              placeholderTextColor={C.textLight}
              value={topic}
              onChangeText={setTopic}
            />
            <View style={s.row}>
              <WBtn disabled={!canStep1} onPress={() => setStep(2)}>İleri →</WBtn>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={s.title}>Çalışma yöntemi</Text>
            <Text style={s.subtitle}>Bir yöntem seç.</Text>
            {METHOD_PRESETS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setMethod(p.id)}
                style={[s.card, method === p.id && s.cardActive]}
              >
                <Text style={[s.cardTitle, method === p.id && { color: C.textDark }]}>{p.label}</Text>
                <Text style={s.cardDesc}>{p.desc}</Text>
              </Pressable>
            ))}

            {method === 'OZEL' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                {[
                  { label: 'Çalışma (dk)', value: customWork, set: setCustomWork },
                  { label: 'Mola (dk)',    value: customBreak, set: setCustomBreak },
                  { label: 'Tekrar',       value: customRounds, set: setCustomRounds },
                ].map(({ label, value, set }) => (
                  <View key={label} style={{ flex: 1 }}>
                    <Text style={s.label}>{label}</Text>
                    <TextInput
                      style={s.numInput}
                      keyboardType="number-pad"
                      value={String(value)}
                      onChangeText={(t) => set(Math.max(1, Number(t) || 1))}
                    />
                  </View>
                ))}
              </View>
            )}

            <View style={[s.row, { justifyContent: 'space-between' }]}>
              <WBtn secondary onPress={() => setStep(1)}>← Geri</WBtn>
              <WBtn disabled={!canStep2} onPress={() => setStep(3)}>İleri →</WBtn>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={s.title}>Hazır mısın?</Text>
            <Text style={s.subtitle}>
              İzleme bu sürümde devre dışı. Oturumunu başlatmak için devam et.
            </Text>
            <View style={[s.row, { justifyContent: 'space-between', marginTop: 24 }]}>
              <WBtn secondary onPress={() => setStep(2)}>← Geri</WBtn>
              <WBtn onPress={() => onComplete(getConfig())}>Başlat ▶</WBtn>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WBtn({ children, onPress, disabled, secondary }: {
  children: React.ReactNode; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
        backgroundColor: secondary ? 'transparent' : disabled ? C.disabled : C.accent,
        borderWidth: secondary ? 1.5 : 0, borderColor: C.border,
      }}
    >
      <Text style={{ color: secondary ? C.textMed : disabled ? C.disabledText : C.btnPrimaryText, fontWeight: '600', fontSize: 14 }}>
        {children}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, paddingTop: 8 },
  progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.card, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: C.accent, borderColor: C.accentDark },
  dotText: { fontSize: 11, fontWeight: '700', color: C.textLight },
  dotTextActive: { color: C.btnPrimaryText },
  line: { width: 36, height: 2, backgroundColor: C.border, marginHorizontal: 4 },
  lineActive: { backgroundColor: C.accent },
  title: { fontSize: 22, fontWeight: '800', color: C.textDark, marginBottom: 6 },
  subtitle: { fontSize: 13, color: C.textLight, marginBottom: 16 },
  input: { backgroundColor: C.card, borderWidth: 2, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.textDark, fontSize: 15, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  card: { backgroundColor: C.card, borderWidth: 2, borderColor: C.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  cardActive: { borderColor: C.borderActive, backgroundColor: '#fef9c3' },
  cardTitle: { fontWeight: '600', fontSize: 14, color: C.textMed },
  cardDesc: { fontSize: 12, color: C.textLight, marginTop: 2 },
  label: { fontSize: 11, color: C.textLight, marginBottom: 4 },
  numInput: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, borderRadius: 8, padding: 8, color: C.textDark, fontSize: 14, textAlign: 'center' },
});
