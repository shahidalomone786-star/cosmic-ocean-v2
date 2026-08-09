import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import CosmicAtelierMark from './CosmicAtelierMark';
import CosmicAvatarCard from './CosmicAvatarCard';
import CosmicAvatarDetail from './CosmicAvatarDetail';
import type { CosmicAvatarDefinition } from './cosmicAtelierCatalog';
import { COSMIC_ATELIER_CATALOG } from './cosmicAtelierCatalog';

interface CosmicAtelierProps {
  lm: boolean;
  onClose: () => void;
  ownedAvatarIds: ReadonlySet<string>;
  ownershipSyncing: boolean;
  onOwnershipConfirmed: (avatarId: string) => void;
}

const atelierEase = [0.16, 1, 0.3, 1] as const;

const CosmicAtelier = ({
  lm,
  onClose,
  ownedAvatarIds,
  ownershipSyncing,
  onOwnershipConfirmed,
}: CosmicAtelierProps) => {
  const shouldReduceMotion = useReducedMotion();
  const [selectedAvatar, setSelectedAvatar] = useState<CosmicAvatarDefinition | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectedAvatar) setSelectedAvatar(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, selectedAvatar]);

  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.62, ease: atelierEase };
  const text = lm ? '#342950' : '#f2efff';
  const muted = lm ? 'rgba(52, 41, 80, .62)' : 'rgba(232, 228, 247, .58)';
  const line = lm ? 'rgba(75, 54, 121, .15)' : 'rgba(220, 212, 255, .11)';

  return (
    <AnimatePresence>
      <motion.main
        data-testid="surface-cosmic-atelier"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cosmic-atelier-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={transition}
        className={`cosmic-atelier-surface ${lm ? 'cosmic-atelier-light' : 'cosmic-atelier-dark'}`}
        style={{ color: text }}
      >
        <div className="cosmic-atelier-grain" aria-hidden="true" />
        <div className="cosmic-atelier-shell">
          <header className="cosmic-atelier-header" style={{ borderColor: line }}>
            <button type="button" data-testid="button-back-from-cosmic-atelier" onClick={onClose} className="cosmic-atelier-quiet-button">
              <ArrowLeft size={15} strokeWidth={1.5} />
              Return to portal
            </button>
            <div className="cosmic-atelier-breadcrumb"><span>Cosmos</span><i>/</i><span>Atelier</span></div>
            <button type="button" data-testid="button-close-cosmic-atelier" aria-label="Close Cosmic Atelier" onClick={onClose} className="cosmic-atelier-close-button">
              <X size={16} strokeWidth={1.5} />
            </button>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            {selectedAvatar ? (
              <CosmicAvatarDetail
                key="detail"
                avatar={selectedAvatar}
                lm={lm}
                onOwnershipConfirmed={onOwnershipConfirmed}
                onBack={() => setSelectedAvatar(null)}
                onClose={onClose}
              />
            ) : (
              <motion.div
                key="catalog"
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -8 }}
                transition={transition}
              >
                <section className="cosmic-atelier-intro">
                  <div>
                    <div className="cosmic-atelier-brandline">
                      <CosmicAtelierMark size={31} muted={lm} />
                      <span>Cosmic Atelier · 01</span>
                    </div>
                    <h1 id="cosmic-atelier-title">The<br /><em>interpretations.</em></h1>
                  </div>
                  <div className="cosmic-atelier-intro-aside">
                    <span className="cosmic-atelier-overline"><span className="cosmic-atelier-pulse" /> Five studies on curiosity</span>
                    <p>A private observatory for AI interpretations of minds that changed how we look outward.</p>
                  </div>
                </section>

                <section className="cosmic-atelier-catalog" aria-labelledby="cosmic-atelier-catalog-heading">
                  <div className="cosmic-atelier-section-heading">
                    <div>
                      <span className="cosmic-atelier-overline">First orbit</span>
                      <h2 id="cosmic-atelier-catalog-heading">The collection</h2>
                    </div>
                    <p>Browse each study<br />at your own pace.</p>
                  </div>
                  <div className="cosmic-avatar-grid">
                     {COSMIC_ATELIER_CATALOG.map((avatar, index) => (
                       <CosmicAvatarCard
                         key={avatar.id}
                         avatar={avatar}
                         lm={lm}
                         index={index}
                         owned={ownedAvatarIds.has(avatar.id)}
                         syncing={ownershipSyncing}
                         onOpen={setSelectedAvatar}
                       />
                    ))}
                  </div>
                </section>
                <footer className="cosmic-atelier-footer" style={{ borderColor: line, color: muted }}>
                  <span>For the curious, by Cosmos</span>
                  <span>Catalog / 05 studies</span>
                  <span>Read-only foundation</span>
                </footer>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.main>
    </AnimatePresence>
  );
};

export default CosmicAtelier;