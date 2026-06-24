import { useState } from 'react';
import {
  View, Text, Pressable, TextInput, ActivityIndicator,
  StyleSheet, ScrollView, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Question, Answer } from '../../lib/api';
import { api } from '../../lib/api';
import { API_BASE_URL } from '../../constants/config';
import { C } from '../../constants/colors';
import ImageViewer from '../common/ImageViewer';

const AVATAR_COLORS = ['#ffd000', '#fb923c', '#a3e635', '#38bdf8', '#c084fc', '#f472b6'];

function colorFor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins || 1} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} sa önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
}

function mediaUrl(url: string) {
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

function HexAvatar({ name }: { name: string }) {
  return (
    <View style={[s.avatar, { backgroundColor: colorFor(name) }]}>
      <Text style={s.avatarText}>{name[0]?.toUpperCase() ?? '?'}</Text>
    </View>
  );
}

type PickedImage = ImagePicker.ImagePickerAsset;

interface Props {
  q: Question;
  accessToken?: string | null;
}

export default function QuestionCard({ q, accessToken }: Props) {
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [votes, setVotes] = useState(q.upvotes);
  const [voted, setVoted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [answers, setAnswers] = useState<Answer[] | null>(null);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [answerImages, setAnswerImages] = useState<PickedImage[]>([]);
  const [answerSending, setAnswerSending] = useState(false);
  const [answerCount, setAnswerCount] = useState(q._count?.answers ?? 0);

  async function handleVote() {
    if (!accessToken) return;
    try {
      const result = await api.voteQuestion(q.id, accessToken);
      setVotes(result.upvotes);
      setVoted(result.voted);
    } catch {
      setVotes((v) => (voted ? v - 1 : v + 1));
      setVoted((v) => !v);
    }
  }

  async function handleExpand() {
    if (!expanded && answers === null) {
      setAnswersLoading(true);
      try {
        const data = await api.getAnswers(q.id);
        setAnswers(data);
      } catch {
        setAnswers([]);
      } finally {
        setAnswersLoading(false);
      }
    }
    setExpanded((e) => !e);
  }

  async function pickAnswerImage() {
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
      setAnswerImages((prev) => [...prev, ...result.assets]);
    }
  }

  async function handleAnswerSubmit() {
    if (!accessToken || (!answerText.trim() && answerImages.length === 0)) return;
    setAnswerSending(true);
    try {
      const answer = await api.createAnswer(q.id, answerText.trim(), accessToken, answerImages.map((img) => ({ uri: img.uri, mimeType: img.mimeType ?? undefined, fileName: img.fileName ?? undefined })));
      setAnswers((prev) => [...(prev ?? []), answer]);
      setAnswerCount((c) => c + 1);
      setAnswerText('');
      setAnswerImages([]);
    } catch (err) {
      console.error(err);
    } finally {
      setAnswerSending(false);
    }
  }

  const authorName = q.author?.username ?? q.author?.name ?? 'anonim';

  return (
    <View style={s.card}>
      <View style={s.row}>
        {/* Oy kolonu */}
        <View style={s.voteCol}>
          <Pressable onPress={handleVote} style={s.voteBtn}>
            <Text style={[s.voteArrow, voted && s.voteArrowActive]}>▲</Text>
            <Text style={[s.voteCount, voted && s.voteCountActive]}>{votes}</Text>
          </Pressable>
        </View>

        {/* İçerik */}
        <View style={s.content}>
          <View style={s.meta}>
            <HexAvatar name={authorName} />
            <Text style={s.author}>@{authorName}</Text>
            <Text style={s.dot}>•</Text>
            <Text style={s.time}>{timeAgo(q.createdAt)}</Text>
          </View>

          <Text style={s.questionText}>{q.content ?? ''}</Text>

          {/* Soru görselleri */}
          {q.media && q.media.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {q.media.map((m) => (
                <Pressable key={m.id} onPress={() => setViewingImage(mediaUrl(m.url))}>
                  <Image source={{ uri: mediaUrl(m.url) }} style={s.mediaImage} resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Pressable onPress={handleExpand} style={s.expandBtn}>
            <Text style={s.expandText}>
              {answerCount} cevap {expanded ? '▲' : '▼'} • {votes} oy
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Cevaplar */}
      {expanded && (
        <View style={s.answersSection}>
          {answersLoading && (
            <ActivityIndicator color={C.accent} size="small" style={{ marginVertical: 8 }} />
          )}
          {!answersLoading && answers?.length === 0 && (
            <Text style={s.emptyText}>Henüz cevap yok. İlk cevabı sen yaz!</Text>
          )}

          {answers?.map((a) => {
            const aName = a.author?.username ?? a.author?.name ?? 'anonim';
            return (
              <View key={a.id} style={s.answerRow}>
                <HexAvatar name={aName} />
                <View style={{ flex: 1 }}>
                  <Text style={s.answerMeta}>
                    <Text style={s.author}>@{aName}</Text>
                    {'  '}
                    <Text style={s.time}>{timeAgo(a.createdAt)}</Text>
                  </Text>
                  <Text style={s.answerText}>{a.content}</Text>
                  {a.media && a.media.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {a.media.map((m) => (
                        <Pressable key={m.id} onPress={() => setViewingImage(mediaUrl(m.url))}>
                          <Image source={{ uri: mediaUrl(m.url) }} style={s.answerMediaImage} resizeMode="cover" />
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            );
          })}

          {/* Cevap formu */}
          {accessToken && (
            <View style={s.answerForm}>
              <View style={s.answerInputRow}>
                <TextInput
                  value={answerText}
                  onChangeText={setAnswerText}
                  placeholder="Cevabını yaz…"
                  placeholderTextColor={C.textLight}
                  style={s.input}
                  multiline
                />
                <Pressable onPress={pickAnswerImage} style={s.imgBtn}>
                  <Text style={{ fontSize: 18 }}>📷</Text>
                </Pressable>
                <Pressable
                  onPress={handleAnswerSubmit}
                  disabled={(!answerText.trim() && answerImages.length === 0) || answerSending}
                  style={[s.sendBtn, (!answerText.trim() && answerImages.length === 0 || answerSending) && s.sendBtnDisabled]}
                >
                  {answerSending
                    ? <ActivityIndicator color={C.btnPrimaryText} size="small" />
                    : <Text style={s.sendBtnText}>Gönder</Text>
                  }
                </Pressable>
              </View>

              {answerImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {answerImages.map((img, i) => (
                    <View key={i} style={s.previewWrap}>
                      <Image source={{ uri: img.uri }} style={s.previewImg} resizeMode="cover" />
                      <Pressable
                        style={s.previewRemove}
                        onPress={() => setAnswerImages((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      )}
      <ImageViewer uri={viewingImage} onClose={() => setViewingImage(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  row: { flexDirection: 'row', padding: 12, gap: 10 },
  voteCol: { alignItems: 'center', paddingTop: 4 },
  voteBtn: { alignItems: 'center', gap: 2 },
  voteArrow: { fontSize: 18, color: C.border },
  voteArrowActive: { color: C.accent },
  voteCount: { fontSize: 13, fontWeight: '700', color: C.textLight },
  voteCountActive: { color: C.accentDark },
  content: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  avatar: { width: 22, height: 22, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  author: { fontSize: 12, fontWeight: '700', color: C.textMed },
  dot: { fontSize: 12, color: C.textLight },
  time: { fontSize: 12, color: C.textLight },
  questionText: { fontSize: 14, fontWeight: '600', color: C.textDark, lineHeight: 20, marginBottom: 8 },
  mediaImage: { width: 120, height: 90, borderRadius: 8, marginRight: 8, backgroundColor: C.border },
  expandBtn: { paddingVertical: 2 },
  expandText: { fontSize: 12, color: C.accent },
  answersSection: { borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg, padding: 12, gap: 10 },
  emptyText: { fontSize: 12, color: C.textLight },
  answerRow: { flexDirection: 'row', gap: 8 },
  answerMeta: { fontSize: 12, marginBottom: 2 },
  answerText: { fontSize: 13, color: C.textDark, lineHeight: 18 },
  answerMediaImage: { width: 100, height: 75, borderRadius: 8, marginRight: 8, backgroundColor: C.border },
  answerForm: { marginTop: 4 },
  answerInputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: C.textDark, maxHeight: 80 },
  imgBtn: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, justifyContent: 'center', alignItems: 'center' },
  sendBtn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 13, fontWeight: '700', color: C.btnPrimaryText },
  previewWrap: { position: 'relative', marginRight: 8 },
  previewImg: { width: 56, height: 56, borderRadius: 8 },
  previewRemove: { position: 'absolute', top: 0, right: 0, backgroundColor: '#ef4444', borderBottomLeftRadius: 6, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
});
