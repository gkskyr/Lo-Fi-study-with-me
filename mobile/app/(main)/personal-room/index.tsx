import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { api, type StudySessionConfig, type StudySession } from '../../../lib/api';
import SetupWizard from '../../../components/personal-room/SetupWizard';
import StudySessionView from '../../../components/personal-room/StudySessionView';
import SessionSummary from '../../../components/personal-room/SessionSummary';

type Screen = 'setup' | 'session' | 'summary';

interface SummaryData {
  session: StudySession;
  xpResult: { xp: number; role: string; leveledUp: boolean };
}

export default function PersonalRoomScreen() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [screen, setScreen] = useState<Screen>('setup');
  const [session, setSession] = useState<StudySession | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  async function handleSetupComplete(config: StudySessionConfig) {
    if (!accessToken) return;
    try {
      const s = await api.createStudySession(config, accessToken);
      setSession(s);
      setScreen('session');
    } catch (e) {
      console.error(e);
    }
  }

  function handleSessionEnd(ended: StudySession & { xpResult: { xp: number; role: string; leveledUp: boolean } }) {
    setSummary({ session: ended, xpResult: ended.xpResult });
    setScreen('summary');
  }

  if (screen === 'setup') {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  if (screen === 'session' && session && accessToken) {
    return (
      <StudySessionView
        session={session}
        token={accessToken}
        onSessionEnd={handleSessionEnd}
      />
    );
  }

  if (screen === 'summary' && summary) {
    const s = summary.session;
    const started = new Date(s.startedAt);
    const ended = s.endedAt ? new Date(s.endedAt) : new Date();
    const totalMinutes = Math.max(1, Math.round((ended.getTime() - started.getTime()) / 60000));

    return (
      <SessionSummary
        topic={s.topic}
        completedRounds={s.completedRounds}
        totalRounds={s.totalRounds}
        totalMinutes={totalMinutes}
        xpAwarded={summary.xpResult.xp}
        leveledUp={summary.xpResult.leveledUp}
        onNewSession={() => { setSession(null); setSummary(null); setScreen('setup'); }}
        onGoHome={() => router.replace('/(main)')}
      />
    );
  }

  return null;
}
