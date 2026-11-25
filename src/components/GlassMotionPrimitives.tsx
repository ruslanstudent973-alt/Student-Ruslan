import React, { useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  HTMLMotionProps
} from 'framer-motion';

/**
 * Fixed full-viewport pastel luminous backdrop that makes frosted glass cards
 * come alive across every view in both Light and Dark themes.
 */
export const GlobalAmbientCanvas: React.FC = () => (
  <div
    className="fixed inset-0 -z-20 pointer-events-none overflow-hidden select-none bg-[#F7FAFF] dark:bg-[#070D1B] transition-colors duration-300"
    aria-hidden="true"
  >
    {/* Subtle pearl wash */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.92),_rgba(241,245,255,0.6)_60%,_rgba(248,250,252,0.95))] dark:bg-[radial-gradient(ellipse_at_top,_rgba(15,29,58,0.85),_rgba(7,13,27,0.96)_65%)]" />

    {/* Soft Ice-Blue Floating Orb (Top-Left) */}
    <div className="ambient-orb-a absolute -top-28 -left-24 w-[520px] h-[520px] rounded-full bg-sky-200/65 dark:bg-sky-600/20 blur-[90px]" />

    {/* Warm Peach Floating Orb (Top-Right / Mid) */}
    <div className="ambient-orb-b absolute top-[18%] -right-28 w-[500px] h-[500px] rounded-full bg-orange-200/55 dark:bg-indigo-600/18 blur-[95px]" />

    {/* Light Lavender Floating Orb (Bottom-Left / Center) */}
    <div className="ambient-orb-c absolute -bottom-32 left-[22%] w-[540px] h-[540px] rounded-full bg-violet-200/55 dark:bg-blue-700/18 blur-[100px]" />

    {/* Mint-Ice Secondary Accent Orb (Bottom-Right) */}
    <div className="ambient-orb-a absolute bottom-[8%] right-[12%] w-[360px] h-[360px] rounded-full bg-cyan-100/65 dark:bg-cyan-500/12 blur-[80px]" />
  </div>
);

interface Tilt3DGlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  maxTilt?: number;
  glare?: boolean;
}

/**
 * Interactive 3D perspective tilt frosted-glass card with dynamic soft light glare.
 * GPU-composited (transform + opacity only) and touch-friendly.
 */
export const Tilt3DGlassCard: React.FC<Tilt3DGlassCardProps> = ({
  children,
  className = '',
  onClick,
  role,
  tabIndex,
  onKeyDown,
  maxTilt = 6.5,
  glare = true
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);

  const springConfig = { stiffness: 280, damping: 24, mass: 0.6 };
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [maxTilt, -maxTilt]), springConfig);
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-maxTilt, maxTilt]), springConfig);

  const glareBg = useTransform(
    [glareX, glareY],
    ([gx, gy]) =>
      `radial-gradient(circle 220px at ${gx}% ${gy}%, rgba(255,255,255,0.45), rgba(255,255,255,0.08) 45%, transparent 75%)`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rawX.set(px - 0.5);
    rawY.set(py - 0.5);
    glareX.set(px * 100);
    glareY.set(py * 100);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rawX.set(0);
    rawY.set(0);
    glareX.set(50);
    glareY.set(50);
  };

  return (
    <div style={{ perspective: 1100 }} className="h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        role={role}
        tabIndex={tabIndex}
        onKeyDown={onKeyDown}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d'
        }}
        whileHover={{ y: -4, scale: 1.012 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
        className={`relative h-full will-change-transform ${className}`}
      >
        {children}
        {glare && (
          <motion.div
            aria-hidden="true"
            style={{ background: glareBg }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] z-20 mix-blend-overlay dark:mix-blend-soft-light"
          />
        )}
      </motion.div>
    </div>
  );
};

export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.03
    }
  }
};

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.975 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 340,
      damping: 26,
      mass: 0.75
    }
  }
};

interface StaggerGridProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
}

export const StaggerGrid: React.FC<StaggerGridProps> = ({
  children,
  className = '',
  ...rest
}) => (
  <motion.div
    variants={staggerContainerVariants}
    initial="hidden"
    animate="visible"
    className={className}
    {...rest}
  >
    {children}
  </motion.div>
);

export const StaggerItem: React.FC<StaggerGridProps> = ({
  children,
  className = '',
  ...rest
}) => (
  <motion.div variants={staggerItemVariants} className={className} {...rest}>
    {children}
  </motion.div>
);

export const GlassReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16, scale: 0.988 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{
      duration: 0.36,
      delay,
      ease: [0.16, 1, 0.3, 1]
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export const pageTransitionVariants = {
  initial: { opacity: 0, y: 14, scale: 0.992 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1] as const
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.994,
    transition: {
      duration: 0.16,
      ease: [0.4, 0, 1, 1] as const
    }
  }
};
