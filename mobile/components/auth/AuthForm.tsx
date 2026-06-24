import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { api } from '../../lib/api';
import { C } from '../../constants/colors';

type FormMode = 'login' | 'register' | 'otp';

interface Props {
  onSuccess: (username: string, accessToken: string) => void;
}

const inputStyle = {
  backgroundColor: C.card,
  borderWidth: 1.5,
  borderColor: C.border,
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 12,
  color: C.textDark,
  fontSize: 15,
  marginBottom: 10,
} as const;

const btnStyle = {
  backgroundColor: C.accent,
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: 'center' as const,
  marginTop: 4,
};

export default function AuthForm({ onSuccess }: Props) {
  const [mode, setMode] = useState<FormMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [otp, setOtp] = useState('');

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(loginEmail, loginPassword);
      onSuccess(res.username, res.access_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setError(null);
    setLoading(true);
    try {
      await api.register({ email: regEmail, username: regUsername, name: regName, password: regPassword });
      setPendingEmail(regEmail);
      setMode('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyEmail(pendingEmail, otp);
      onSuccess(res.username, res.access_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Doğrulama kodu geçersiz.');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    setError(null);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ width: '100%', maxWidth: 400 }}
    >
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {mode !== 'otp' && (
          <View style={{
            flexDirection: 'row', backgroundColor: C.card,
            borderWidth: 1.5, borderColor: C.border, borderRadius: 16,
            padding: 4, marginBottom: 16,
          }}>
            {(['login', 'register'] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => switchMode(tab)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 12,
                  backgroundColor: mode === tab ? C.accent : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontWeight: '600', fontSize: 14,
                  color: mode === tab ? C.btnPrimaryText : C.textLight,
                }}>
                  {tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {mode === 'login' && (
          <View>
            <TextInput
              style={inputStyle} placeholder="E-posta" placeholderTextColor={C.textLight}
              value={loginEmail} onChangeText={setLoginEmail}
              keyboardType="email-address" autoCapitalize="none"
            />
            <TextInput
              style={inputStyle} placeholder="Şifre" placeholderTextColor={C.textLight}
              value={loginPassword} onChangeText={setLoginPassword} secureTextEntry
            />
            {error && <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{error}</Text>}
            <Pressable style={btnStyle} onPress={handleLogin} disabled={loading}>
              {loading
                ? <ActivityIndicator color={C.btnPrimaryText} />
                : <Text style={{ color: C.btnPrimaryText, fontWeight: '700', fontSize: 15 }}>Giriş Yap</Text>
              }
            </Pressable>
          </View>
        )}

        {mode === 'register' && (
          <View>
            <TextInput
              style={inputStyle} placeholder="E-posta" placeholderTextColor={C.textLight}
              value={regEmail} onChangeText={setRegEmail}
              keyboardType="email-address" autoCapitalize="none"
            />
            <TextInput
              style={inputStyle} placeholder="@kullanici_adi" placeholderTextColor={C.textLight}
              value={regUsername}
              onChangeText={(t) => setRegUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
            />
            <TextInput
              style={inputStyle} placeholder="Ad Soyad" placeholderTextColor={C.textLight}
              value={regName} onChangeText={setRegName}
            />
            <TextInput
              style={inputStyle}
              placeholder="Şifre (min. 8 kar., 1 büyük, 1 rakam, 1 özel)"
              placeholderTextColor={C.textLight}
              value={regPassword} onChangeText={setRegPassword} secureTextEntry
            />
            {error && <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{error}</Text>}
            <Pressable style={btnStyle} onPress={handleRegister} disabled={loading}>
              {loading
                ? <ActivityIndicator color={C.btnPrimaryText} />
                : <Text style={{ color: C.btnPrimaryText, fontWeight: '700', fontSize: 15 }}>Kayıt Ol</Text>
              }
            </Pressable>
          </View>
        )}

        {mode === 'otp' && (
          <View>
            <Text style={{ textAlign: 'center', color: C.textMed, marginBottom: 16, fontSize: 14 }}>
              <Text style={{ fontWeight: '700' }}>{pendingEmail}</Text>
              {' '}adresine 6 haneli kod gönderildi.
            </Text>
            <TextInput
              style={[inputStyle, { textAlign: 'center', fontSize: 28, fontWeight: '700', letterSpacing: 8 }]}
              placeholder="000000" placeholderTextColor={C.textLight}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad" maxLength={6}
            />
            {error && <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{error}</Text>}
            <Pressable
              style={[btnStyle, { opacity: otp.length !== 6 ? 0.5 : 1 }]}
              onPress={handleVerify}
              disabled={loading || otp.length !== 6}
            >
              {loading
                ? <ActivityIndicator color={C.btnPrimaryText} />
                : <Text style={{ color: C.btnPrimaryText, fontWeight: '700', fontSize: 15 }}>Doğrula</Text>
              }
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
