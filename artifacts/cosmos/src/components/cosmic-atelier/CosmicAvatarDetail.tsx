import { ArrowLeft, Check, LockKeyhole, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { CosmicAvatarDefinition } from './cosmicAtelierCatalog';
import { formatAvatarPrice } from './cosmicAtelierCatalog';

interface CosmicAvatarDetailProps {
  avatar: CosmicAvatarDefinition | null;
  lm: boolean;
  onBack: () => void;
  onClose: () => void;
}

const CosmicAvatarDetail = ({ avatar, lm, onBack, onClose }: CosmicAvatarDetailProps) => {
  const shouldReduceMotion = useReducedMotion();
  if (!avatar) return null;
  const ink = lm ? '#342950' : '#f2efff';
  const muted = lm ? 'rgba(52, 41, 80, .62)' : 'rgba(232, 228, 247, .62)';
  const line = lm ? 'rgba(75, 54, 121, .16)' : 'rgba(220, 212, 255, .14)';
  const panel = lm ? 'rgba(255,255,255,.52)' : 'rgba(255,255,255,.045)';

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
              <div><span>Voice</span><strong>{avatar.voice}</strong></div>
              <div><span>Catalog price</span><strong>{formatAvatarPrice(avatar)} <em>{avatar.currency}</em></strong></div>
            </div>
            <div className="cosmic-avatar-future-buy" style={{ borderColor: line, background: panel }}>
              <div className="cosmic-avatar-future-buy-icon"><LockKeyhole size={15} strokeWidth={1.4} /></div>
              <div className="cosmic-avatar-future-buy-copy">
                <strong>Access is not available yet</strong>
                <span>Buying will be introduced in a future Cosmos foundation update.</span>
              </div>
              <button type="button" disabled data-testid="button-buy-avatar-disabled" className="cosmic-avatar-buy-button">
                Buy
              </button>
            </div>
            <div className="cosmic-avatar-detail-note">
              <Check size={14} strokeWidth={1.6} />
              <span>Read-only catalog entry. No wallet, ownership, or account action is connected.</span>
            </div>
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
};

export default CosmicAvatarDetail;