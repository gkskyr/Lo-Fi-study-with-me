import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  ScrollView, StyleSheet, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, type Question } from '../../lib/api';
import QuestionCard from './QuestionCard';
import { C } from '../../constants/colors';

interface Props {
  roomId: string;
  newQuestions: Question[];
  accessToken?: string | null;
}

export default function QASection({ roomId, newQuestions, accessToken }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionText, setQuestionText] = useState('');
  const [questionImages, setQuestionImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.getRoomQuestions(roomId)
      .then(setQuestions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (newQuestions.length === 0) return;
    setQuestions((prev) => {
      const incoming = newQuestions[0];
      if (prev.some((q) => q.id === incoming.id)) return prev;
      return [incoming, ...prev];
    });
  }, [newQuestions]);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Fotoğraf seçmek için galeri izni gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setQuestionImages((prev) => [...prev, ...result.assets]);
    }
  }

  async function handleSubmit() {
    if (!accessToken || (!questionText.trim() && questionImages.length === 0)) return;
    setSending(true);
    try {
      const q = await api.createQuestion(
        roomId,
        questionText.trim(),
        accessToken,
        questionImages.map((img) => ({ uri: img.uri, mimeType: img.mimeType ?? undefined, fileName: img.fileName ?? undefined })),
      );
      setQuestionText('');
      setQuestionImages([]);
      setQuestions((prev) => {
        if (prev.some((p) => p.id === q.id)) return prev;
        return [q, ...prev];
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  const deduped = questions.filter((q, i, arr) => arr.findIndex((x) => x.id === q.id) === i);

  return (
    <View style={s.container}>
      <Text style={s.title}>SORULAR & CEVAPLAR</Text>

      {accessToken && (
        <View style={s.form}>
          <View style={s.inputRow}>
            <TextInput
              value={questionText}
              onChangeText={setQuestionText}
              placeholder="Sorunuzu yazın…"
              placeholderTextColor={C.textLight}
              style={s.input}
              multiline
            />
            <Pressable onPress={pickImage} style={s.imgBtn}>
              <Text style={{ fontSize: 18 }}>📷</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={(!questionText.trim() && questionImages.length === 0) || sending}
              style={[s.askBtn, ((!questionText.trim() && questionImages.length === 0) || sending) && s.askBtnDisabled]}
            >
              {sending
                ? <ActivityIndicator color={C.btnPrimaryText} size="small" />
                : <Text style={s.askBtnText}>Sor</Text>
              }
            </Pressable>
          </View>

          {questionImages.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              {questionImages.map((img, i) => (
                <View key={i} style={s.previewWrap}>
                  <Image source={{ uri: img.uri }} style={s.previewImg} resizeMode="cover" />
                  <Pressable
                    style={s.previewRemove}
                    onPress={() => setQuestionImages((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {loading && (
        <ActivityIndicator color={C.accent} size="small" style={{ marginTop: 16 }} />
      )}

      {!loading && deduped.length === 0 && (
        <Text style={s.emptyText}>Bu odada henüz soru yok. İlk soruyu sen sor!</Text>
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={s.list}>
        {deduped.map((q) => (
          <QuestionCard key={q.id} q={q} accessToken={accessToken} />
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 18, fontWeight: '900', color: C.textDark, letterSpacing: 1, marginBottom: 12 },
  form: { marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: {
    flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.textDark, maxHeight: 90,
  },
  imgBtn: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, justifyContent: 'center', alignItems: 'center' },
  askBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  askBtnDisabled: { opacity: 0.4 },
  askBtnText: { fontSize: 14, fontWeight: '700', color: C.btnPrimaryText },
  previewWrap: { position: 'relative', marginRight: 8 },
  previewImg: { width: 56, height: 56, borderRadius: 8 },
  previewRemove: { position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444', borderBottomLeftRadius: 6, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: C.textLight, marginTop: 8 },
  list: { flex: 1 },
});
