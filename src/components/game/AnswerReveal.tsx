import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useGameStore } from '../../state/gameStore';
import { getCurrentQuestion } from '../../lib/game/selectors';
import { GameHeader } from './GameHeader';
import { TeamScoreBar } from './TeamScoreBar';
import { ExplanationCard } from './ExplanationCard';
import { soundManager } from '../../lib/sound/soundManager';

export function AnswerReveal() {
  const game = useGameStore((s) => s.game);

  useEffect(() => {
    if (!game) return;
    if (game.lastAwardedPoints?.correct) soundManager.play('correct');
    else if (game.lastAwardedPoints && !game.lastAwardedPoints.correct) soundManager.play('incorrect');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.questionIndex, game?.currentTieBreakerId]);

  if (!game) return null;
  const question = getCurrentQuestion(game);
  if (!question) return null;

  const award = game.lastAwardedPoints;
  const awardedTeam = award ? game.teams.find((t) => t.id === award.teamId) : undefined;

  return (
    <div className="game-safe-area tv-safe-area flex flex-col gap-6 min-h-screen py-6">
      <GameHeader round={game.round} questionNumber={game.questionIndex + 1} totalQuestions={game.questionOrder.length} />
      <TeamScoreBar teams={game.teams} scores={game.scores} highlightTeamId={award?.teamId} lastAwarded={award} />

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-bb-navy/85 backdrop-blur-xl shadow-2xl p-6 sm:p-10 space-y-6 text-center">
          {award ? (
            <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} className="space-y-1">
              <div
                className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${award.correct ? 'bg-bb-green' : 'bg-bb-red'}`}
              >
                {award.correct ? <Check className="text-white" size={28} /> : <X className="text-white" size={28} />}
              </div>
              <h2 className={`font-display text-4xl sm:text-5xl font-black ${award.correct ? 'text-bb-green' : 'text-bb-red'}`}>
                {award.correct ? 'CORRECT!' : 'NOT QUITE!'}
              </h2>
              {awardedTeam && (
                <p className="text-white/70">
                  {awardedTeam.name} {award.correct ? `+${award.points} points` : award.points > 0 ? `-${award.points} points` : ''}
                </p>
              )}
            </motion.div>
          ) : (
            <h2 className="font-display text-3xl sm:text-4xl font-black text-white/70">TIME'S UP</h2>
          )}

          <div>
            <p className="text-white/50 text-sm uppercase tracking-widest mb-1">Correct Answer</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-bb-gold-light">
              {question.options ? question.options.find((o) => o.id === question.correctAnswer)?.text ?? question.correctAnswer : question.correctAnswer}
            </p>
          </div>

          <ExplanationCard question={question} />
        </div>
      </div>
    </div>
  );
}
