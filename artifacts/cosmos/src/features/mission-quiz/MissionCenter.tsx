import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  Crosshair,
  LockKeyhole,
  Orbit,
  RefreshCw,
  ShieldCheck,
  Target,
} from 'lucide-react';
import type { WalletBalance, RoyaltyCurrencyKey } from '../royalty/royalty';
import { RoyaltyCurrencyIcon } from '../royalty/RoyaltyIcons';

export type MissionStatus = 'available' | 'in_progress' | 'complete' | 'completed' | 'claimed' | 'locked' | string;

export type Mission = {
  missionId: string;
  category: string;
  objective: string;
  progress: number;
  targetCount: number;
  rewardCurrency: RoyaltyCurrencyKey;
  rewardAmount: number;
  status: MissionStatus;
  periodKey: string;
  claimedAt?: string | null;
};

export type DailyReward = {
  claimed: boolean;
  rewardDate: string;
};

export type MissionCenterProps = {
  lm?: boolean;
  missions?: Mission[] | null;
  dailyReward?: DailyReward | null;
  wallet?: WalletBalance | null;
  loading?: boolean;
  error?: string | null;
  onClaimDaily: () => void;
  onClaimMission: (missionId: string) => void;
  onBack: () => void;
  onRetry: () => void;
};

const currencyNames: Record<RoyaltyCurrencyKey, string> = {
  planetary_coins: 'Planetary Coins',
  star_tokens: 'Star Tokens',
  universal_coins: 'Universal Coins',
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return 'Today';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function statusLabel(status: MissionStatus) {
  if (status === 'in_progress') return 'In progress';
  if (status === 'complete' || status === 'completed') return 'Ready to claim';
  if (status === 'claimed') return 'Claimed';
  return status.replace(/_/g, ' ');
}

function MissionSkeleton() {
  return (
    <div className="mission-quiz-skeleton-list" aria-label="Loading missions">
      {[0, 1, 2].map((item) => <div className="mission-quiz-skeleton-row" key={item}><span /><span /><span /></div>)}
    </div>
  );
}

function MissionCard({
  mission,
  index,
  onClaim,
}: {
  mission: Mission;
  index: number;
  onClaim: (missionId: string) => void;
}) {
  const cappedProgress = Math.min(Math.max(mission.progress, 0), Math.max(mission.targetCount, 1));
  const percentage = Math.round((cappedProgress / Math.max(mission.targetCount, 1)) * 100);
  const completed = mission.status === 'complete' || mission.status === 'completed';
  const claimed = mission.status === 'claimed' || Boolean(mission.claimedAt);
  const locked = mission.status === 'locked';
  const actionable = completed && !claimed && !locked;

  return (
    <motion.article
      className={`mission-quiz-mission-card ${completed ? 'is-complete' : ''} ${claimed ? 'is-claimed' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mission-quiz-mission-card-top">
        <span className="mission-quiz-category"><Crosshair size={13} /> {mission.category}</span>
        <span className={`mission-quiz-status status-${claimed ? 'claimed' : locked ? 'locked' : completed ? 'complete' : 'active'}`}>
          {claimed ? <Check size={12} /> : locked ? <LockKeyhole size={12} /> : <span className="mission-quiz-status-dot" />}
          {statusLabel(mission.status)}
        </span>
      </div>
      <h3>{mission.objective}</h3>
      <div className="mission-quiz-progress-meta">
        <span>Signal progress</span>
        <strong>{formatNumber(cappedProgress)} <small>/ {formatNumber(mission.targetCount)}</small></strong>
      </div>
      <div className="mission-quiz-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={mission.targetCount} aria-valuenow={cappedProgress} aria-label={`${mission.objective} progress`}>
        <span style={{ transform: `scaleX(${percentage / 100})` }} />
      </div>
      <div className="mission-quiz-mission-footer">
        <span className="mission-quiz-reward">
          <RoyaltyCurrencyIcon currency={mission.rewardCurrency} size={24} />
          <span><b>+{formatNumber(mission.rewardAmount)}</b> {currencyNames[mission.rewardCurrency]}</span>
        </span>
        <button
          type="button"
          className="mission-quiz-claim-button"
          disabled={!actionable}
          onClick={() => onClaim(mission.missionId)}
          aria-label={`${actionable ? 'Claim' : 'Mission'} reward for ${mission.objective}`}
        >
          {claimed ? 'Secured' : completed ? 'Claim reward' : locked ? 'Locked' : 'Continue'}
          {!claimed && <ChevronRight size={14} />}
        </button>
      </div>
    </motion.article>
  );
}

export function MissionCenter({
  lm = false,
  missions,
  dailyReward,
  wallet,
  loading = false,
  error,
  onClaimDaily,
  onClaimMission,
  onBack,
  onRetry,
}: MissionCenterProps) {
  const [category, setCategory] = useState('daily');
  const unauthenticated = !wallet && !loading && !error;
  const availableMissions = missions ?? [];
  const categories = ['daily', 'weekly', 'exploration', 'science', 'special', 'completed'];
  const filteredMissions = useMemo(() => {
    if (category === 'completed') {
      return availableMissions.filter(mission => mission.status === 'claimed' || Boolean(mission.claimedAt));
    }
    return availableMissions.filter(mission => mission.category === category && mission.status !== 'claimed' && !mission.claimedAt);
  }, [availableMissions, category]);

  return (
    <motion.main
      className={`mission-quiz-surface ${lm ? 'mission-quiz-surface-light' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      aria-labelledby="mission-center-title"
    >
      <div className="mission-quiz-grain" aria-hidden="true" />
      <div className="mission-quiz-shell">
        <header className="mission-quiz-topbar">
          <button type="button" onClick={onBack} className="mission-quiz-back-button"><ArrowLeft size={16} /><span>Back to observatory</span></button>
          <div className="mission-quiz-wordmark"><Orbit size={17} /><span>Cosmic Ocean</span><i>Mission control</i></div>
          <div className="mission-quiz-topbar-index">CO / 04</div>
        </header>

        <section className="mission-quiz-intro">
          <div>
            <p className="mission-quiz-kicker"><span className="mission-quiz-live-dot" /> Field operations / Royalty programme</p>
            <h1 id="mission-center-title">Earn your place<br /><em>among the stars.</em></h1>
            <p className="mission-quiz-intro-copy">Small, deliberate observations compound into a deeper understanding of the universe. Complete a mission, keep the signal moving.</p>
          </div>
          <div className="mission-quiz-coordinate" aria-label="Current observatory coordinates">
            <span>OBSERVATORY STATUS</span>
            <strong>ONLINE</strong>
            <small>04° 12′ 08″ N / 12° 44′ 31″ E</small>
          </div>
        </section>

        {unauthenticated ? (
          <section className="mission-quiz-state mission-quiz-auth-state">
            <ShieldCheck size={24} />
            <div><h2>Sign in to begin a mission</h2><p>Your mission log and Royalty balance are secured to your Cosmic Ocean account.</p></div>
            <button type="button" onClick={onRetry} className="mission-quiz-secondary-button">Check access <ChevronRight size={15} /></button>
          </section>
        ) : error ? (
          <section className="mission-quiz-state mission-quiz-error-state" role="alert">
            <CircleAlert size={22} />
            <div><h2>Mission telemetry unavailable</h2><p>{error}</p></div>
            <button type="button" onClick={onRetry} className="mission-quiz-secondary-button"><RefreshCw size={14} /> Retry</button>
          </section>
        ) : (
          <>
            <section className="mission-quiz-command-grid" aria-label="Mission overview">
              <article className="mission-quiz-daily-card">
                <div className="mission-quiz-daily-orbit" aria-hidden="true"><span /><span /><span /></div>
                <div className="mission-quiz-daily-content">
                  <div className="mission-quiz-card-label"><CalendarClock size={14} /> Daily transmission</div>
                  <h2>{dailyReward?.claimed ? 'Transmission received.' : 'A daily signal awaits.'}</h2>
                  <p>{dailyReward?.claimed ? `Logged on ${formatDate(dailyReward.rewardDate)}. Return tomorrow for a new signal.` : 'Check in once a day to keep your observatory log active.'}</p>
                  <button type="button" className="mission-quiz-primary-button" disabled={loading || dailyReward?.claimed} onClick={onClaimDaily}>
                    {dailyReward?.claimed ? <><Check size={15} /> Claimed today</> : <>Claim daily signal <ChevronRight size={15} /></>}
                  </button>
                </div>
              </article>
              <aside className="mission-quiz-wallet-panel">
                <div className="mission-quiz-card-label"><Target size={14} /> Current reserve</div>
                <p className="mission-quiz-wallet-total">{formatNumber(wallet?.planetary_coins ?? 0)} <small>PC</small></p>
                <div className="mission-quiz-wallet-line"><span>Planetary Coins</span><strong>{formatNumber(wallet?.planetary_coins ?? 0)}</strong></div>
                <div className="mission-quiz-wallet-line"><span>Star Tokens</span><strong>{formatNumber(wallet?.star_tokens ?? 0)}</strong></div>
                <div className="mission-quiz-wallet-line"><span>Universal Coins</span><strong>{formatNumber(wallet?.universal_coins ?? 0)}</strong></div>
              </aside>
            </section>

            <section className="mission-quiz-missions-section" aria-labelledby="active-missions-heading">
              <div className="mission-quiz-section-heading">
                <div><p className="mission-quiz-section-index">01 / Active fieldwork</p><h2 id="active-missions-heading">Your missions</h2></div>
                 <span>{loading ? 'Syncing telemetry' : `${filteredMissions.length} ${filteredMissions.length === 1 ? 'mission' : 'missions'}`}</span>
              </div>
               <div className="mission-quiz-category-tabs" role="tablist" aria-label="Mission categories">
                 {categories.map(item => (
                   <button key={item} type="button" role="tab" aria-selected={category === item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>
                     {item}
                   </button>
                 ))}
               </div>
              <AnimatePresence mode="wait">
                 {loading ? <MissionSkeleton /> : filteredMissions.length === 0 ? (
                  <motion.div className="mission-quiz-empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                     <div className="mission-quiz-empty-mark"><Orbit size={22} /></div><h3>{category === 'completed' ? 'Nothing completed yet.' : 'The board is quiet.'}</h3><p>{category === 'completed' ? 'Claimed missions will remain in your completed log.' : 'There are no missions in this category right now.'}</p>
                  </motion.div>
                ) : (
                   <div className="mission-quiz-mission-list">{filteredMissions.map((mission, index) => <MissionCard key={`${mission.missionId}-${mission.periodKey}`} mission={mission} index={index} onClaim={onClaimMission} />)}</div>
                )}
              </AnimatePresence>
            </section>
          </>
        )}

        <footer className="mission-quiz-footer"><span><span className="mission-quiz-footer-rule" /> Royalty is server-backed and follows your account.</span><span>Cycle 07 · Quiet operations</span></footer>
      </div>
    </motion.main>
  );
}

export default MissionCenter;