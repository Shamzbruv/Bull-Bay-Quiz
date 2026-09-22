import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, Pause, Play, RotateCcw, SkipForward, Flag, Settings2, Minus, Plus, ArrowLeft } from 'lucide-react';
import { useGameStore } from '../../state/gameStore';
import { soundManager } from '../../lib/sound/soundManager';

export function HostControls() {
  const game = useGameStore((s) => s.game);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [scoresOpen, setScoresOpen] = useState(false);

  const beginRoundIntro = useGameStore((s) => s.beginRoundIntro);
  const continueFromRoundIntro = useGameStore((s) => s.continueFromRoundIntro);
  const pauseTimer = useGameStore((s) => s.pauseTimer);
  const resumeTimer = useGameStore((s) => s.resumeTimer);
  const markCorrect = useGameStore((s) => s.markCorrect);
  const markIncorrect = useGameStore((s) => s.markIncorrect);
  const continueAfterReveal = useGameStore((s) => s.continueAfterReveal);
  const continueFromLeaderboard = useGameStore((s) => s.continueFromLeaderboard);
  const continueFromTieAnnouncement = useGameStore((s) => s.continueFromTieAnnouncement);
  const continueFromSuddenDeathIntro = useGameStore((s) => s.continueFromSuddenDeathIntro);
  const resetBuzzers = useGameStore((s) => s.resetBuzzers);
  const skipQuestion = useGameStore((s) => s.skipQuestion);
  const previousQuestion = useGameStore((s) => s.previousQuestion);
  const endGameNow = useGameStore((s) => s.endGameNow);
  const awardBonus = useGameStore((s) => s.awardBonus);
  const deductPoints = useGameStore((s) => s.deductPoints);

  if (!game || game.phase === 'finished') return null;

  function primaryAction() {
    switch (game!.phase) {
      case 'intro':
        return { label: 'BEGIN QUIZ', onClick: () => beginRoundIntro() };
      case 'round_intro':
        return { label: 'START QUESTION', onClick: () => continueFromRoundIntro() };
      case 'question':
        return {
          label: game!.timerRunning ? 'PAUSE TIMER' : 'RESUME TIMER',
          onClick: () => (game!.timerRunning ? pauseTimer() : resumeTimer()),
          icon: game!.timerRunning ? <Pause size={18} /> : <Play size={18} />,
        };
      case 'answering':
        return { label: 'WAITING FOR BUZZER…', onClick: undefined };
      case 'locked':
        return null; // handled by the correct/incorrect pair below
      case 'reveal':
        return { label: 'NEXT QUESTION', onClick: () => continueAfterReveal() };
      case 'leaderboard':
        return { label: 'CONTINUE', onClick: () => continueFromLeaderboard() };
      case 'tie_breaker':
        return { label: 'START SUDDEN DEATH', onClick: () => continueFromTieAnnouncement() };
      case 'sudden_death':
        return { label: 'START QUESTION', onClick: () => continueFromSuddenDeathIntro() };
      default:
        return null;
    }
  }

  const action = primaryAction();

  return (
    <div className="fixed bottom-0 inset-x-0 z-50">
      {toolsOpen && (
        <div className="game-safe-area pb-3">
          <div className="rounded-2xl border border-white/10 bg-bb-deep/95 backdrop-blur-xl p-4 grid sm:grid-cols-2 gap-2 text-sm">
            <ToolButton icon={<RotateCcw size={16} />} label="Reset Buzzers" onClick={resetBuzzers} disabled={game.phase !== 'answering'} />
            <ToolButton icon={<SkipForward size={16} />} label="Skip Question" onClick={skipQuestion} />
            <ToolButton icon={<ArrowLeft size={16} />} label="Previous Question" onClick={previousQuestion} disabled={game.questionIndex === 0 || game.tieBreakerActive} />
            <ToolButton icon={<Flag size={16} />} label="End Game" onClick={() => confirm('End the game now and crown a winner by current score?') && endGameNow()} />
          </div>
          <div className="mt-2 rounded-2xl border border-white/10 bg-bb-deep/95 backdrop-blur-xl p-4">
            <button onClick={() => setScoresOpen((v) => !v)} className="text-xs uppercase tracking-widest text-white/50 mb-2">
              Adjust Scores {scoresOpen ? '▲' : '▼'}
            </button>
            {scoresOpen && (
              <div className="grid sm:grid-cols-2 gap-2">
                {game.teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                    <span className="text-sm font-medium truncate">{team.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => deductPoints(team.id, 1)} className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-bb-red/30">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-display font-bold">{game.scores[team.id] ?? 0}</span>
                      <button onClick={() => awardBonus(team.id, 1)} className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-bb-green/30">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-center text-[11px] text-white/30 mt-2">
            SPACE pause/resume · C correct · X incorrect · N next · R reset buzzers · team buzzer keys in Settings
          </p>
        </div>
      )}

      <div className="game-safe-area pb-4">
        <div className="rounded-2xl border border-white/10 bg-bb-deep/95 backdrop-blur-xl px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setToolsOpen((v) => !v)}
            className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 shrink-0"
            aria-label="Host tools"
          >
            {toolsOpen ? <ChevronUp size={18} /> : <Settings2 size={18} />}
          </button>

          {game.phase === 'locked' ? (
            <div className="flex-1 flex gap-3">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  soundManager.play('correct');
                  markCorrect();
                }}
                className="flex-1 rounded-xl bg-bb-green/90 hover:bg-bb-green py-3 font-display font-bold text-white shadow-glow-green"
              >
                ✓ CORRECT
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  soundManager.play('incorrect');
                  markIncorrect();
                }}
                className="flex-1 rounded-xl bg-bb-red/90 hover:bg-bb-red py-3 font-display font-bold text-white shadow-glow-red"
              >
                ✕ INCORRECT
              </motion.button>
            </div>
          ) : action ? (
            <motion.button
              whileTap={action.onClick ? { scale: 0.97 } : undefined}
              onClick={action.onClick}
              disabled={!action.onClick}
              className="flex-1 rounded-xl bg-gradient-to-r from-bb-blue to-bb-blue-light py-3 font-display font-bold text-white shadow-glow-blue disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {action.icon}
              {action.label}
            </motion.button>
          ) : (
            <div className="flex-1 text-center text-white/40 text-sm uppercase tracking-widest">Waiting…</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolButton({ icon, label, onClick, disabled }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-white/80 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {icon}
      {label}
    </button>
  );
}
