import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CircleAlert, LockKeyhole, LoaderCircle, Volume2, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { CosmicAvatarDefinition } from './cosmicAtelierCatalog';
import { formatAvatarPrice } from './cosmicAtelierCatalog';
import { primeListenAudio, TtsPlaybackQueue } from '@/lib/edgeTts';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { fetchOrCreateWallet } from '@/features/royalty/wallet';
import type { RoyaltyCurrencyKey, WalletBalance } from '@/features/royalty/royalty';

interface CosmicAvatarDetailProps {
  avatar: CosmicAvatarDefinition | null;
  lm: boolean;
  onBack: () => void;
  onClose: () => void;
}

const CosmicAvatarDetail = ({ avatar, lm, onBack, onClose }: CosmicAvatarDetailProps) => {
  const shouldReduceMotion = useReducedMotion();
  const voiceQueueRef = useRef<TtsPlaybackQueue | null>(null);
  const purchaseInFlightRef = useRef(false);
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const [purchaseState, setPurchaseState] = useState<
    'checking' | 'ready' | 'processing' | 'purchased' | 'already-owned' | 'insufficient' | 'auth-required' | 'failure'
  >('checking');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);

  useEffect(() => () => {
    voiceQueueRef.current?.stop();
  }, [avatar?.id]);

  useEffect(() => {
    let active = true;
    setPurchaseError(null);
    setPurchaseId(null);
    setWallet(null);

    if (!isAuthenticated || !user?.id) {
      setPurchaseState('auth-required');
      return () => { active = false; };
    }

    setPurchaseState('checking');
    void Promise.all([
      fetchOrCreateWallet(user.id),
      supabase
        .from('cosmic_avatar_ownerships')
        .select('ownership_id')
        .eq('user_id', user.id)
        .eq('avatar_id', avatar?.id ?? '')
        .maybeSingle(),
    ]).then(([nextWallet, ownership]) => {
      if (!active) return;
      if (ownership.error) throw ownership.error;
      setWallet(nextWallet);
      if (ownership.data?.ownership_id) {
        setPurchaseId(ownership.data.ownership_id);
        setPurchaseState('already-owned');
      } else {
        setPurchaseState('ready');
      }
    }).catch((reason: unknown) => {
      if (!active) return;
      setPurchaseState('failure');
      setPurchaseError(reason instanceof Error ? reason.message : 'Unable to verify access. Please try again.');
    });

    return () => { active = false; };
  }, [avatar?.id, isAuthenticated, user?.id]);

  if (!avatar) return null;
  const ink = lm ? '#342950' : '#f2efff';
  const muted = lm ? 'rgba(52, 41, 80, .62)' : 'rgba(232, 228, 247, .62)';
  const line = lm ? 'rgba(75, 54, 121, .16)' : 'rgba(220, 212, 255, .14)';
  const panel = lm ? 'rgba(255,255,255,.52)' : 'rgba(255,255,255,.045)';

  const previewVoice = () => {
    primeListenAudio();
    voiceQueueRef.current?.stop();
    const queue = new TtsPlaybackQueue(avatar.voice.id);
    voiceQueueRef.current = queue;
    setVoicePreviewPlaying(true);
    void queue.play(
      `Cosmic Atelier voice preview for ${avatar.name}. This is a fictional AI interpretation.`,
    ).catch(error => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('[CosmicAtelier] Voice preview failed:', error);
      }
    }).finally(() => {
      if (voiceQueueRef.current === queue) {
        voiceQueueRef.current = null;
        setVoicePreviewPlaying(false);
      }
    });
  };

  const purchaseAvatar = async () => {
    if (purchaseInFlightRef.current || purchaseState === 'processing' || purchaseState === 'purchased' || purchaseState === 'already-owned') return;
    if (!isAuthenticated || !user?.id) {
      setPurchaseState('auth-required');
      return;
    }

    purchaseInFlightRef.current = true;
    setPurchaseState('processing');
    setPurchaseError(null);

    try {
      // This read is user-scoped and gives the UI a current reserve snapshot.
      // The RPC repeats the check while locking the wallet row; the client
      // snapshot is never used to authorize or calculate the charge.
      const currentWallet = await fetchOrCreateWallet(user.id);
      setWallet(currentWallet);
      if (currentWallet[avatarCurrencyKey(avatar.currency)] < avatar.price) {
        setPurchaseState('insufficient');
        return;
      }

      const { data, error } = await supabase.rpc('purchase_cosmic_avatar', {
        p_avatar_id: avatar.id,
      });
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] as PurchaseResult | undefined : data as PurchaseResult | null;
      if (!result) throw new Error('The purchase did not return a confirmation.');

      setWallet({
        planetary_coins: Number(result.planetary_coins),
        star_tokens: Number(result.star_tokens),
        universal_coins: Number(result.universal_coins),
      });
      setPurchaseId(result.ownership_id);
      setPurchaseState(result.status === 'already_owned' ? 'already-owned' : 'purchased');
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : String(reason);
      if (message.includes('INSUFFICIENT_BALANCE')) {
        setPurchaseState('insufficient');
        return;
      }
      if (message.includes('AUTHENTICATION_REQUIRED')) {
        setPurchaseState('auth-required');
        return;
      }
      if (message.includes('AVATAR_NOT_FOUND')) {
        setPurchaseState('failure');
        setPurchaseError('This collection entry is not currently available.');
        return;
      }
      setPurchaseState('failure');
      setPurchaseError('We could not complete the purchase. No balance was changed. Please try again.');
    } finally {
      purchaseInFlightRef.current = false;
    }
  };

  const purchaseCopy = {
    checking: { title: 'Verifying access', message: 'Checking your reserve and collection record.' },
    ready: { title: 'Acquire this interpretation', message: `A one-time purchase from your ${avatar.currency} reserve.` },
    processing: { title: 'Processing purchase', message: 'Your reserve is being verified securely.' },
    purchased: { title: 'Added to your collection', message: 'Ownership has been recorded to your Cosmic Ocean account.' },
    'already-owned': { title: 'Owned', message: 'This interpretation is already part of your collection.' },
    insufficient: { title: 'Insufficient balance', message: `You need ${formatAvatarPrice(avatar)} ${avatar.currency} to continue.` },
    'auth-required': { title: 'Authentication required', message: 'Sign in to purchase and keep ownership linked to your account.' },
    failure: { title: 'Purchase unavailable', message: purchaseError ?? 'We could not verify this collection entry.' },
  }[purchaseState];

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={avatar.id}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cosmic-avatar-detail-title"
        data-testid={`detail-avatar-${avatar.id}`}
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="cosmic-avatar-detail"
        style={{ color: ink }}
      >
        <div className="cosmic-avatar-detail-topbar">
          <button type="button" data-testid="button-back-avatar-detail" onClick={onBack} className="cosmic-atelier-quiet-button">
            <ArrowLeft size={15} strokeWidth={1.5} />
            Collection
          </button>
          <div className="cosmic-avatar-detail-location">Cosmic Atelier / Study {avatar.id}</div>
          <button type="button" data-testid="button-close-avatar-detail" aria-label="Close avatar details" onClick={onClose} className="cosmic-atelier-close-button">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="cosmic-avatar-detail-grid">
          <motion.div
            initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : .97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: shouldReduceMotion ? 0 : .55, ease: [0.16, 1, 0.3, 1] }}
            className="cosmic-avatar-detail-portrait"
            style={{ borderColor: line, background: panel }}
          >
            <img src={avatar.image} alt={`${avatar.name} AI interpretation`} className="cosmic-avatar-detail-image" />
            <div className="cosmic-avatar-detail-portrait-caption">
              <span>AI interpretation</span>
              <span>{avatar.ownershipId}</span>
            </div>
          </motion.div>
          <div className="cosmic-avatar-detail-copy">
            <div className="cosmic-atelier-overline"><span className="cosmic-atelier-pulse" /> Catalog entry / 0{1 + ['marie-curie', 'brian-cox', 'isaac-newton', 'srinivasa-ramanujan', 'mr-bean'].indexOf(avatar.id)}</div>
            <h1 id="cosmic-avatar-detail-title">{avatar.name}</h1>
            <p className="cosmic-avatar-detail-intro">{avatar.personality}</p>
            <p className="cosmic-avatar-disclaimer">
              This is a fictional AI interpretation inspired by a notable figure. It does not represent the real person speaking or verified personal beliefs.
            </p>
            <div className="cosmic-avatar-specs" style={{ borderColor: line }}>
              <div><span>Model</span><strong>{avatar.model}</strong></div>
              <div data-testid={`text-avatar-voice-${avatar.id}`}>
                <span>Voice</span>
                <strong>{avatar.voice.label} <em>{avatar.voice.id}</em></strong>
              </div>
              <div><span>Catalog price</span><strong>{formatAvatarPrice(avatar)} <em>{avatar.currency}</em></strong></div>
            </div>
            <div
              className={`cosmic-avatar-purchase ${purchaseState === 'purchased' || purchaseState === 'already-owned' ? 'cosmic-avatar-purchase-success' : ''}`}
              style={{ borderColor: line, background: panel }}
              aria-live="polite"
            >
              <div className="cosmic-avatar-purchase-icon" aria-hidden="true">
                {purchaseState === 'processing' || purchaseState === 'checking'
                  ? <LoaderCircle size={15} strokeWidth={1.4} className="cosmic-avatar-spinner" />
                  : purchaseState === 'purchased' || purchaseState === 'already-owned'
                    ? <Check size={15} strokeWidth={1.7} />
                    : purchaseState === 'insufficient' || purchaseState === 'failure'
                      ? <CircleAlert size={15} strokeWidth={1.4} />
                      : <LockKeyhole size={15} strokeWidth={1.4} />}
              </div>
              <div className="cosmic-avatar-purchase-copy">
                <strong>{purchaseCopy.title}</strong>
                <span>{purchaseCopy.message}</span>
                {wallet && purchaseState !== 'auth-required' && purchaseState !== 'failure' && (
                  <small>Your reserve: {formatBalance(wallet[avatarCurrencyKey(avatar.currency)])} {avatar.currency}</small>
                )}
              </div>
              <button
                type="button"
                data-testid={`button-buy-avatar-${avatar.id}`}
                onClick={() => void purchaseAvatar()}
                disabled={purchaseState === 'checking' || purchaseState === 'processing' || purchaseState === 'purchased' || purchaseState === 'already-owned'}
                className={`cosmic-avatar-buy-button ${purchaseState === 'purchased' || purchaseState === 'already-owned' ? 'cosmic-avatar-buy-button-owned' : ''}`}
              >
                {purchaseState === 'processing' ? 'Processing' : purchaseState === 'purchased' || purchaseState === 'already-owned' ? 'Owned' : 'Buy'}
              </button>
            </div>
            <div className="cosmic-avatar-detail-note">
              <Check size={14} strokeWidth={1.6} />
              <span>Secure purchase. The exact price and currency are verified by the Cosmic Ocean server.</span>
            </div>
            <button
              type="button"
              data-testid={`button-preview-avatar-voice-${avatar.id}`}
              onClick={previewVoice}
              className="cosmic-avatar-voice-preview"
              aria-label={`${voicePreviewPlaying ? 'Playing' : 'Play'} ${avatar.name} voice preview`}
            >
              <Volume2 size={14} strokeWidth={1.5} />
              {voicePreviewPlaying ? 'Playing voice preview' : 'Preview voice'}
            </button>
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
};

type PurchaseResult = {
  status: 'purchased' | 'already_owned';
  avatar_id: string;
  ownership_id: string;
  price: number | string;
  currency: RoyaltyCurrencyKey;
  planetary_coins: number | string;
  star_tokens: number | string;
  universal_coins: number | string;
  purchased_at: string;
};

function avatarCurrencyKey(currency: CosmicAvatarDefinition['currency']): RoyaltyCurrencyKey {
  if (currency === 'Planetary Coins') return 'planetary_coins';
  if (currency === 'Universal Coins') return 'universal_coins';
  return 'star_tokens';
}

function formatBalance(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

export default CosmicAvatarDetail;