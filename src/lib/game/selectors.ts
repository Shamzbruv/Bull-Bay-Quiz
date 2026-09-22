import type { GameState, Team } from '../../types/game';
import type { QuizQuestion } from '../../types/quiz';

export function getCurrentQuestion(game: GameState): QuizQuestion | undefined {
  const id = game.tieBreakerActive ? game.currentTieBreakerId : game.questionOrder[game.questionIndex];
  if (!id) return undefined;
  return game.quiz.questions.find((q) => q.id === id);
}

export function isTurnBasedMode(gameMode: GameState['settings']['gameMode']): boolean {
  return gameMode === 'classic' || gameMode === 'rapid_fire';
}

/** Whose turn it is for the current question, in Classic/Rapid Fire modes. */
export function getActiveTeamId(game: GameState): string | undefined {
  const teams = game.teams;
  if (teams.length === 0) return undefined;

  if (game.settings.gameMode === 'classic') {
    const order = game.questionIndex % teams.length;
    return teamAtOrder(teams, order)?.id;
  }

  if (game.settings.gameMode === 'rapid_fire') {
    const total = Math.max(game.questionOrder.length, 1);
    const perTeam = Math.max(Math.ceil(total / teams.length), 1);
    const teamPos = Math.min(Math.floor(game.questionIndex / perTeam), teams.length - 1);
    return teamAtOrder(teams, teamPos)?.id;
  }

  return undefined;
}

function teamAtOrder(teams: Team[], order: number): Team | undefined {
  const sorted = [...teams].sort((a, b) => a.order - b.order);
  return sorted[order];
}

export function pointsForQuestion(question: QuizQuestion, settings: GameState['settings']): number {
  if (settings.pointsMode === 'standard' && question.type !== 'tie_breaker') {
    return settings.difficultyPoints[question.difficulty];
  }
  return question.points;
}
