import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '../../hooks/use-toast';
import { useAuthStore } from '../../store/authStore';
import { EMPTY_WALLET, type WalletBalance } from '../royalty/royalty';
import { MissionCenter, type DailyReward, type Mission } from './MissionCenter';
import { PhysicsQuiz, type PhysicsQuizState } from './PhysicsQuiz';
import {
  claimDailyReward,
  claimMission,
  fetchMissionCenter,
  fetchPhysicsQuiz,
  invalidatePhysicsRun,
  submitPhysicsAnswer,
} from './api';

const BACKGROUND_INVALIDATION_THRESHOLD_MS = 30_000;

export function MissionQuizController({
  mode,
  lm,
  onBack,
}: {
  mode: 'missions' | 'quiz';
  lm: boolean;
  onBack: () => void;
}) {
  const { isAuthenticated, user } = useAuthStore();
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [dailyReward, setDailyReward] = useState<DailyReward | null>(null);
  const [wallet, setWallet] = useState<WalletBalance>(EMPTY_WALLET);
  const [quiz, setQuiz] = useState<PhysicsQuizState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [backgroundInvalidated, setBackgroundInvalidated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hiddenAtRef = useRef<number | null>(null);
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      setMissions(null);
      setDailyReward(null);
      setQuiz(null);
      return;
    }
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      if (mode === 'missions') {
        const result = await fetchMissionCenter();
        if (requestId !== requestRef.current) return;
        setMissions(result.missions);
        setDailyReward(result.dailyReward);
        setWallet(result.wallet);
      } else {
        const result = await fetchPhysicsQuiz();
        if (requestId !== requestRef.current) return;
        setQuiz(result);
        setWallet({
          planetary_coins: result.planetaryCoins,
          star_tokens: result.starTokens,
          universal_coins: 0,
        });
        setBackgroundInvalidated(false);
      }
    } catch (reason) {
      if (requestId !== requestRef.current) return;
      setError(reason instanceof Error ? reason.message : 'The mission signal is unavailable.');
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [isAuthenticated, mode, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleClaimDaily = useCallback(async () => {
    setSubmitting(true);
    try {
      const result = await claimDailyReward();
      setDailyReward(result.dailyReward);
      setWallet(result.wallet);
      toast({ title: 'Daily signal secured', description: '+3,000 Planetary Coins added to your reserve.' });
      const refreshed = await fetchMissionCenter();
      setMissions(refreshed.missions);
    } catch (reason) {
      toast({ title: 'Daily signal unavailable', description: reason instanceof Error ? reason.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, []);

  const handleClaimMission = useCallback(async (missionId: string) => {
    setSubmitting(true);
    try {
      const nextWallet = await claimMission(missionId);
      setWallet(nextWallet);
      const refreshed = await fetchMissionCenter();
      setMissions(refreshed.missions);
      toast({ title: 'Mission reward secured', description: 'Your Royalty reserve has been updated.' });
    } catch (reason) {
      toast({ title: 'Mission cannot be claimed', description: reason instanceof Error ? reason.message : 'Complete the objective first.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, []);

  const handleAnswer = useCallback(async (answerId: string) => {
    if (!quiz || submitting || quiz.status === 'cooldown' || !quiz.questionId) return;
    const answerIndex = quiz.options.findIndex((option, index) => (typeof option === 'string' ? `option-${index}` : option.id) === answerId);
    if (answerIndex < 0) return;
    setSubmitting(true);
    try {
      const nextQuiz = await submitPhysicsAnswer(quiz.questionId, answerIndex);
      setQuiz(nextQuiz);
      setWallet(previous => ({ ...previous, planetary_coins: nextQuiz.planetaryCoins, star_tokens: nextQuiz.starTokens }));
      if (nextQuiz.status === 'wrong') {
        toast({ title: 'Run reset', description: 'That relationship did not hold. The next run begins at Level 1.' });
      } else if (nextQuiz.status === 'cycle_completed') {
        toast({ title: 'Cycle complete', description: '+50 Star Tokens secured. The next cycle opens in four days.' });
      }
    } catch (reason) {
      toast({ title: 'Answer not recorded', description: reason instanceof Error ? reason.message : 'Refresh the question and try again.', variant: 'destructive' });
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }, [quiz, refresh, submitting]);

  useEffect(() => {
    if (mode !== 'quiz' || !isAuthenticated) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenFor = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;
      if (hiddenFor < BACKGROUND_INVALIDATION_THRESHOLD_MS || !quiz || quiz.status !== 'active') return;
      setBackgroundInvalidated(true);
      void invalidatePhysicsRun()
        .then(nextQuiz => {
          setQuiz(nextQuiz);
          setBackgroundInvalidated(false);
        })
        .catch(() => setError('The current run could not be invalidated. Refresh before continuing.'));
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isAuthenticated, mode, quiz]);

  if (mode === 'missions') {
    return (
      <MissionCenter
        lm={lm}
        missions={isAuthenticated ? missions : null}
        dailyReward={isAuthenticated ? dailyReward : null}
        wallet={isAuthenticated ? wallet : null}
        loading={loading || submitting}
        error={error}
        onClaimDaily={() => void handleClaimDaily()}
        onClaimMission={missionId => void handleClaimMission(missionId)}
        onBack={onBack}
        onRetry={() => void refresh()}
      />
    );
  }

  return (
    <PhysicsQuiz
      lm={lm}
      state={quiz}
      loading={loading}
      submitting={submitting}
      backgroundInvalidated={backgroundInvalidated}
      error={error}
      onAnswer={answer => void handleAnswer(answer)}
      onRetry={() => void refresh()}
      onBack={onBack}
    />
  );
}

export default MissionQuizController;