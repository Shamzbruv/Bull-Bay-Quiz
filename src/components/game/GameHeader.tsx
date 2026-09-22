import { ChurchLogo } from '../brand/ChurchLogo';
import { brand } from '../../config/brand';

interface GameHeaderProps {
  round?: string;
  questionNumber?: number;
  totalQuestions?: number;
}

export function GameHeader({ round, questionNumber, totalQuestions }: GameHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <ChurchLogo size="sm" />
        <span className="font-display font-bold tracking-wide text-white/90 hidden sm:inline">{brand.abbreviatedTitle}</span>
      </div>
      <div className="text-center">
        {round && <div className="text-xs sm:text-sm uppercase tracking-[0.25em] text-bb-gold">{round}</div>}
      </div>
      <div className="text-right">
        {questionNumber !== undefined && totalQuestions !== undefined && (
          <span className="text-sm text-white/60">
            Question {questionNumber} of {totalQuestions}
          </span>
        )}
      </div>
    </div>
  );
}
