import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { CosmicAvatarDefinition } from './cosmicAtelierCatalog';
import { formatAvatarPrice } from './cosmicAtelierCatalog';

interface CosmicAvatarCardProps {
  avatar: CosmicAvatarDefinition;
  lm: boolean;
  index: number;
  onOpen: (avatar: CosmicAvatarDefinition) => void;
}

const CosmicAvatarCard = ({ avatar, lm, index, onOpen }: CosmicAvatarCardProps) => {
  const shouldReduceMotion = useReducedMotion();
  const ink = lm ? '#342950' : '#f2efff';
  const muted = lm ? 'rgba(52, 41, 80, .62)' : 'rgba(232, 228, 247, .64)';
  const line = lm ? 'rgba(75, 54, 121, .17)' : 'rgba(220, 212, 255, .14)';

  return (
    <motion.button
      type="button"
      data-testid={`card-avatar-${avatar.id}`}
      aria-label={`Open ${avatar.name} avatar details`}
      onClick={() => onOpen(avatar)}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.58,
        ease: [0.16, 1, 0.3, 1],
        delay: shouldReduceMotion ? 0 : 0.12 + index * 0.055,
      }}
      whileHover={shouldReduceMotion ? undefined : { y: -5 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.995 }}
      className="cosmic-avatar-card group"
      style={{
        color: ink,
        borderColor: line,
        background: lm
          ? 'linear-gradient(145deg, rgba(255,255,255,.68), rgba(246,243,252,.58))'
          : 'linear-gradient(145deg, rgba(25,23,43,.84), rgba(13,18,32,.9))',
        boxShadow: lm
          ? '0 18px 42px rgba(61, 42, 108, .08)'
          : '0 18px 48px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.06)',
      }}
    >
      <span className="cosmic-avatar-card-image-wrap">
        <img
          src={avatar.image}
          alt={`${avatar.name} AI interpretation`}
          data-testid={`img-avatar-${avatar.id}`}
          className="cosmic-avatar-card-image"
        />
        <span className="cosmic-avatar-card-image-wash" aria-hidden="true" />
        <span className="cosmic-avatar-card-open" aria-hidden="true">
          <ArrowUpRight size={16} strokeWidth={1.4} />
        </span>
      </span>
      <span className="cosmic-avatar-card-copy">
        <span className="cosmic-avatar-card-name-row">
          <span className="cosmic-avatar-card-name" data-testid={`text-avatar-name-${avatar.id}`}>{avatar.name}</span>
          <span className="cosmic-avatar-card-rule" aria-hidden="true" />
        </span>
        <span className="cosmic-avatar-card-descriptor" style={{ color: muted }}>{avatar.descriptor}</span>
        <span className="cosmic-avatar-card-price" data-testid={`text-avatar-price-${avatar.id}`}>
          <span>{formatAvatarPrice(avatar)}</span>
          <span className="cosmic-avatar-card-currency">{avatar.currency}</span>
        </span>
      </span>
    </motion.button>
  );
};

export default CosmicAvatarCard;