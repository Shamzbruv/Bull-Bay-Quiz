import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../state/gameStore';
import { getCurrentQuestion } from '../../lib/game/selectors';
import { BrandRings } from '../brand/BrandRing';
import { MountainMotif } from '../brand/MountainMotif';
import { soundManager } from '../../lib/sound/soundManager';

const COUNT_SEQUENCE = ['READY?', '3', '2', '1', 'GO!'] as const;

export function RoundIntro() {
  const game = useGameStore((s) => s.game);
  const continueFromRoundIntro = useGameStore((s) => s.continueFromRoundIntro);
  const [step, setStep] = useState(0);

  useEffect(() => {
    soundManager.play('round-transition');
    setStep(0);
  }, [game?.round]);

  useEffect(() => {
    if (step >= COUNT_SEQUENCE.length) {
      continueFromRoundIntro();
      return;
    }
    soundManager.play(step === COUNT_SEQUENCE.length - 1 ? 'countdown-go' : 'countdown-tick');
    const t = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? 1400 : 650);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!game) return null;
  const question = getCurrentQuestion(game);
  const points = question?.points ?? 0;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden">
      <BrandRings size={420} />
      <div className="absolute inset-x-0 bottom-0 text-bb-green/15">
        <MountainMotif />
      </div>

      <div className="relative z-10 space-y-4">
        <p className="text-white/50 uppercase tracking-[0.4em] text-sm">Bull Bay NTCOG Quiz Night</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-bb-cyan uppercase tracking-widest">{game.round ?? 'Next Round'}</h1>
        {points > 0 && <p className="text-bb-gold-light font-display text-xl font-bold">{points} POINT{points === 1 ? '' : 'S'} PER QUESTION</p>}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.35 }}
            className="font-display text-6xl sm:text-8xl font-black text-white pt-6"
          >
            {COUNT_SEQUENCE[Math.min(step, COUNT_SEQUENCE.length - 1)]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
