import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Atom,
  Check,
  CircleAlert,
  Clock3,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  X,
} from 'lucide-react';
import { RoyaltyCurrencyIcon } from '../royalty/RoyaltyIcons';

export type PhysicsQuizOption = string | { id: string; label: string; correct?: boolean; selected?: boolean };

export type PhysicsQuizState = {
  status: string;
  cycleNumber: number;
  level: number;
  questionId: string;
  prompt: string;
  options: PhysicsQuizOption[];
  cooldownUntil?: string | null;
  runId?: string | null;
  questionTotal: number;
  planetaryCoins: number;
  starTokens: number;
};

export type PhysicsQuizProps = {
  lm?: boolean;
  state?: PhysicsQuizState | null;
  loading?: boolean;
  error?: string | null;
  submitting?: boolean;
  backgroundInvalidated?: boolean;
  onAnswer: (answer: string) => void;
  onRetry: () => void;
  onBack: () => void;
};

function optionId(option: PhysicsQuizOption, index: number) {
  return typeof option === 'string' ? option : option.id || `option-${index}`;
}

function optionLabel(option: PhysicsQuizOption) {
  return typeof option === 'string' ? option : option.label;
}

function isCooldown(value?: string | null) {
  if (!value) return false;
  const date = new Date(value).getTime();
  return !Number.isNaN(date) && date > Date.now();
}

function cooldownLabel(value?: string | null) {
  if (!value) return 'Please return when the next cycle opens.';
  const delta = Math.max(0, new Date(value).getTime() - Date.now());
  const minutes = Math.floor(delta / 60000);
  const seconds = Math.floor((delta % 60000) / 1000);
  return `Next attempt in ${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function QuizSkeleton() {
  return <div className="physics-quiz-skeleton" aria-label="Loading quiz"><span /><span /><span /><span /></div>;
}

export function PhysicsQuiz({
  lm = false,
  state,
  loading = false,
  error,
  submitting = false,
  backgroundInvalidated = false,
  onAnswer,
  onRetry,
  onBack,
}: PhysicsQuizProps) {
  const unauthenticated = !state && !loading && !error;
  const cooldown = isCooldown(state?.cooldownUntil);
  const status = state?.status ?? 'ready';
  // The server returns `correct` and `wrong` together with the next
  // authoritative question. Only an explicit answered state should lock the
  // current options.
  const answered = status === 'answered';
  const completed = status === 'completed' || status === 'complete' || status === 'cycle_completed';

  return (
    <motion.main className={`mission-quiz-surface physics-quiz-surface ${lm ? 'mission-quiz-surface-light' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-labelledby="physics-quiz-title">
      <div className="mission-quiz-grain" aria-hidden="true" />
      <div className="mission-quiz-shell physics-quiz-shell">
        <header className="mission-quiz-topbar">
          <button type="button" onClick={onBack} className="mission-quiz-back-button"><ArrowLeft size={16} /><span>Back to observatory</span></button>
          <div className="mission-quiz-wordmark"><Atom size={17} /><span>Conceptual physics</span><i>Assessment chamber</i></div>
          <div className="mission-quiz-topbar-index">QP / {state?.cycleNumber ?? '—'}</div>
        </header>

        <section className="physics-quiz-heading">
          <div><p className="mission-quiz-kicker"><span className="mission-quiz-live-dot" /> Rigorous knowledge / Cycle {state?.cycleNumber ?? '—'}</p><h1 id="physics-quiz-title">The universe rewards<br /><em>clear thinking.</em></h1></div>
          <p className="physics-quiz-heading-note">No memorisation. No shortcuts.<br />Read the model. Test the idea.</p>
        </section>

        {unauthenticated ? (
          <section className="mission-quiz-state mission-quiz-auth-state"><LockKeyhole size={23} /><div><h2>Sign in to enter the chamber</h2><p>Your attempts and earned Royalty are recorded to your Cosmic Ocean account.</p></div><button type="button" onClick={onRetry} className="mission-quiz-secondary-button">Check access <ArrowLeft size={14} className="rotate-180" /></button></section>
        ) : error ? (
          <section className="mission-quiz-state mission-quiz-error-state" role="alert"><CircleAlert size={22} /><div><h2>Question stream interrupted</h2><p>{error}</p></div><button type="button" onClick={onRetry} className="mission-quiz-secondary-button"><RefreshCw size={14} /> Retry</button></section>
        ) : loading ? <QuizSkeleton /> : state ? (
          <>
            <section className="physics-quiz-status-bar" aria-label="Quiz progress">
              <div><span>Cycle</span><strong>{String(state.cycleNumber).padStart(2, '0')}</strong></div>
              <div><span>Level</span><strong>{String(state.level).padStart(2, '0')}</strong></div>
              <div className="physics-quiz-question-progress"><span>Question / {state.questionTotal}</span><strong>{String(state.level).padStart(2, '0')}</strong></div>
              <div className="physics-quiz-coins"><span>Earned this run</span><strong><RoyaltyCurrencyIcon currency="planetary_coins" size={20} /> {state.planetaryCoins}<RoyaltyCurrencyIcon currency="star_tokens" size={20} /> {state.starTokens}</strong></div>
            </section>

            <AnimatePresence mode="wait">
              {backgroundInvalidated ? (
                <motion.section className="mission-quiz-state mission-quiz-error-state physics-quiz-invalidated" key="invalidated" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><RotateCcw size={21} /><div><h2>This run has moved on.</h2><p>The question was updated elsewhere. Refresh to receive the current assessment.</p></div><button type="button" onClick={onRetry} className="mission-quiz-secondary-button"><RefreshCw size={14} /> Refresh run</button></motion.section>
              ) : completed ? (
                <motion.section className="physics-quiz-complete" key="complete" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><div className="physics-quiz-complete-mark"><Check size={26} /></div><p className="mission-quiz-section-index">Assessment complete / Cycle {state.cycleNumber}</p><h2>Good observation.</h2><p>Your reasoning has been logged. The next challenge will open with the next cycle.</p><div className="physics-quiz-earned"><span><RoyaltyCurrencyIcon currency="planetary_coins" size={27} /> <b>+500</b> Planetary Coins</span><span><RoyaltyCurrencyIcon currency="star_tokens" size={27} /> <b>+50</b> Star Tokens</span></div><p className="physics-quiz-cooldown-copy"><Clock3 size={14} /> {cooldownLabel(state.cooldownUntil)}</p></motion.section>
              ) : cooldown ? (
                <motion.section className="physics-quiz-cooldown" key="cooldown" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><div className="physics-quiz-cooldown-mark"><Clock3 size={25} /></div><p className="mission-quiz-section-index">Assessment chamber / Hold</p><h2>Let the result settle.</h2><p>{cooldownLabel(state.cooldownUntil)}</p><div className="physics-quiz-cooldown-line" /></motion.section>
              ) : (
                <motion.section className="physics-quiz-question" key={state.questionId} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <div className="physics-quiz-question-meta"><span>Question {String(state.level).padStart(2, '0')} / {state.questionTotal}</span><span>Run {state.runId ? state.runId.slice(0, 8).toUpperCase() : 'LOCAL'}</span></div>
                  <h2>{state.prompt}</h2>
                  <div className="physics-quiz-options" role="radiogroup" aria-label="Answer options">
                    {state.options.map((option, index) => {
                      const id = optionId(option, index);
                      const selected = typeof option !== 'string' && option.selected;
                      const correct = typeof option !== 'string' && option.correct;
                      const resultClass = answered ? (correct ? 'is-correct' : selected ? 'is-wrong' : '') : '';
                      return <button type="button" role="radio" aria-checked={Boolean(selected)} disabled={submitting || answered} key={id} className={`physics-quiz-option ${selected ? 'is-selected' : ''} ${resultClass}`} onClick={() => onAnswer(id)}><span className="physics-quiz-option-index">{String.fromCharCode(65 + index)}</span><span>{optionLabel(option)}</span>{answered && correct && <Check size={16} />}{answered && selected && !correct && <X size={16} />}</button>;
                    })}
                  </div>
                  {submitting && <p className="physics-quiz-submitting" role="status">Recording your reasoning…</p>}
                </motion.section>
              )}
            </AnimatePresence>
          </>
        ) : null}
        <footer className="mission-quiz-footer"><span><span className="mission-quiz-footer-rule" /> One question at a time. Full attention.</span><span>Physics division · Secure run</span></footer>
      </div>
    </motion.main>
  );
}

export default PhysicsQuiz;