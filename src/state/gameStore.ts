import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Quiz } from '../types/quiz';
import type { GameHistoryEntry, GameSettings, GameState, Team } from '../types/game';
import { buildQuestionOrder, getTieBreakerQueue } from '../lib/game/questionOrder';
import { determineWinner } from '../lib/game/scoring';
import { getActiveTeamId, getCurrentQuestion, isTurnBasedMode, pointsForQuestion } from '../lib/game/selectors';
import { getDataAdapter } from '../lib/storage';

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

interface GameStore {
  game: GameState | null;

  startNewGame: (quiz: Quiz, teams: Team[], settings: GameSettings) => void;
  clearGame: () => void;

  beginRoundIntro: () => void;
  startQuestion: () => void;

  tick: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;

  buzzIn: (teamId: string) => void;
  selectAnswer: (answer: string) => void;
  markCorrect: () => void;
  markIncorrect: () => void;
  skipQuestion: () => void;
  resetBuzzers: () => void;

  continueAfterReveal: () => void;
  continueFromLeaderboard: () => void;
  continueFromRoundIntro: () => void;
  continueFromTieAnnouncement: () => void;
  continueFromSuddenDeathIntro: () => void;

  awardBonus: (teamId: string, points: number) => void;
  deductPoints: (teamId: string, points: number) => void;
  setActiveTeam: (teamId: string) => void;

  endGameNow: () => void;
  previousQuestion: () => void;
}

function persistHistoryIfFinished(game: GameState) {
  if (game.phase !== 'finished') return;
  const winner = game.teams.find((t) => t.id === game.winnerTeamId);
  const entry: GameHistoryEntry = {
    id: game.id,
    quizId: game.quiz.id,
    quizTitle: game.quiz.title,
    teams: game.teams.map((t) => ({ id: t.id, name: t.name, score: game.scores[t.id] ?? 0 })),
    winnerName: winner?.name,
    startedAt: game.startedAt,
    completedAt: game.completedAt ?? new Date().toISOString(),
    questionCount: game.questionOrder.length,
    gameMode: game.settings.gameMode,
  };
  void getDataAdapter().saveHistoryEntry(entry);
  void getDataAdapter().incrementTimesPlayed(game.quiz.id);
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: null,

      startNewGame: (quiz, teams, settings) => {
        const questionOrder = buildQuestionOrder(quiz, settings);
        const tieBreakerQueue = getTieBreakerQueue(quiz);
        const scores = Object.fromEntries(teams.map((t) => [t.id, 0]));

        const game: GameState = {
          id: newId(),
          quiz,
          teams,
          settings,
          questionOrder,
          phase: 'intro',
          questionIndex: 0,
          scores,
          timerRemaining: settings.questionTimeSeconds,
          timerRunning: false,
          timerKind: 'question',
          buzzQueue: [],
          tieBreakerQueue,
          tieBreakerActive: false,
          startedAt: new Date().toISOString(),
          questionsAnsweredSinceBreak: 0,
        };
        set({ game });
      },

      clearGame: () => set({ game: null }),

      beginRoundIntro: () => {
        const game = get().game;
        if (!game) return;
        const q = getCurrentQuestion(game);
        set({ game: { ...game, phase: 'round_intro', round: q?.round } });
      },

      startQuestion: () => {
        const game = get().game;
        if (!game) return;
        const q = getCurrentQuestion(game);
        if (!q) return;
        const timeLimit = q.timeLimit ?? game.settings.questionTimeSeconds;
        const activeTeamId = isTurnBasedMode(game.settings.gameMode) && !game.tieBreakerActive ? getActiveTeamId(game) : undefined;

        set({
          game: {
            ...game,
            phase: 'question',
            round: q.round ?? game.round,
            timerKind: 'question',
            timerRemaining: timeLimit,
            timerRunning: true,
            buzzedTeamId: undefined,
            buzzQueue: [],
            lockedAnswer: undefined,
            lastAwardedPoints: undefined,
            activeTeamId,
          },
        });
      },

      tick: () => {
        const game = get().game;
        if (!game || !game.timerRunning) return;
        if (game.timerRemaining <= 1) {
          onTimerExpired(get, set);
        } else {
          set({ game: { ...game, timerRemaining: game.timerRemaining - 1 } });
        }
      },

      pauseTimer: () => {
        const game = get().game;
        if (!game) return;
        set({ game: { ...game, timerRunning: false } });
      },

      resumeTimer: () => {
        const game = get().game;
        if (!game || game.timerRemaining <= 0) return;
        set({ game: { ...game, timerRunning: true } });
      },

      buzzIn: (teamId) => {
        const game = get().game;
        if (!game || game.phase !== 'answering') return;
        if (game.buzzedTeamId) return; // first valid buzz wins
        if (game.buzzQueue.some((b) => b.teamId === teamId)) return; // already attempted this question
        if (game.tieBreakerActive && game.tiedTeamIds && !game.tiedTeamIds.includes(teamId)) return;

        set({
          game: {
            ...game,
            buzzedTeamId: teamId,
            phase: 'locked',
            timerRunning: false,
          },
        });
      },

      selectAnswer: (answer) => {
        const game = get().game;
        if (!game) return;
        set({ game: { ...game, lockedAnswer: answer } });
      },

      markCorrect: () => {
        const game = get().game;
        if (!game) return;
        const q = getCurrentQuestion(game);
        if (!q) return;
        const teamId = game.buzzedTeamId ?? game.activeTeamId;
        if (!teamId) return;

        const points = pointsForQuestion(q, game.settings);
        const scores = { ...game.scores, [teamId]: (game.scores[teamId] ?? 0) + points };

        set({
          game: {
            ...game,
            scores,
            phase: 'reveal',
            timerRunning: false,
            lastAwardedPoints: { teamId, points, correct: true },
            winnerTeamId: game.tieBreakerActive ? teamId : game.winnerTeamId,
          },
        });
      },

      markIncorrect: () => {
        const game = get().game;
        if (!game) return;
        const teamId = game.buzzedTeamId ?? game.activeTeamId;
        const penalty = game.settings.penaltiesEnabled && teamId ? pointsForQuestionSafe(game) : 0;
        const scores = penalty && teamId ? { ...game.scores, [teamId]: (game.scores[teamId] ?? 0) - penalty } : game.scores;

        const attemptedQueue = teamId ? [...game.buzzQueue, { teamId, timestamp: Date.now() }] : game.buzzQueue;

        const contenders = game.tieBreakerActive
          ? (game.tiedTeamIds ?? []).filter((id) => !attemptedQueue.some((b) => b.teamId === id))
          : game.teams.filter((t) => !attemptedQueue.some((b) => b.teamId === t.id)).map((t) => t.id);

        const canSteal = !isTurnBasedMode(game.settings.gameMode) && (game.tieBreakerActive || game.settings.stealEnabled) && contenders.length > 0;

        if (canSteal) {
          set({
            game: {
              ...game,
              scores,
              buzzQueue: attemptedQueue,
              buzzedTeamId: undefined,
              phase: 'answering',
              timerKind: 'steal',
              timerRemaining: game.settings.stealTimeSeconds,
              timerRunning: true,
              lastAwardedPoints: teamId ? { teamId, points: penalty, correct: false } : undefined,
            },
          });
          return;
        }

        if (game.tieBreakerActive) {
          // Everyone tied whiffed this tie-break question — move to the next one, or call it a draw.
          const [nextId, ...rest] = game.tieBreakerQueue;
          if (nextId) {
            set({
              game: {
                ...game,
                scores,
                buzzQueue: [],
                buzzedTeamId: undefined,
                currentTieBreakerId: nextId,
                tieBreakerQueue: rest,
                phase: 'sudden_death',
              },
            });
          } else {
            finish(get, set, { winnerTeamId: undefined });
          }
          return;
        }

        set({
          game: {
            ...game,
            scores,
            phase: 'reveal',
            timerRunning: false,
            lastAwardedPoints: teamId ? { teamId, points: penalty, correct: false } : undefined,
          },
        });
      },

      skipQuestion: () => {
        const game = get().game;
        if (!game) return;
        set({ game: { ...game, phase: 'reveal', timerRunning: false, lastAwardedPoints: undefined } });
      },

      resetBuzzers: () => {
        const game = get().game;
        if (!game || game.phase !== 'answering') return;
        set({ game: { ...game, buzzedTeamId: undefined } });
      },

      continueAfterReveal: () => {
        const game = get().game;
        if (!game) return;

        if (game.tieBreakerActive) {
          if (game.winnerTeamId) {
            finish(get, set, { winnerTeamId: game.winnerTeamId });
          } else {
            // Steal window during sudden death expired with nobody correct — try the next tie-break question.
            const [nextId, ...rest] = game.tieBreakerQueue;
            if (nextId) {
              set({ game: { ...game, currentTieBreakerId: nextId, tieBreakerQueue: rest, phase: 'sudden_death', buzzQueue: [] } });
            } else {
              finish(get, set, { winnerTeamId: undefined });
            }
          }
          return;
        }

        const questionsAnsweredSinceBreak = game.questionsAnsweredSinceBreak + 1;
        const isLastQuestion = game.questionIndex >= game.questionOrder.length - 1;

        if (isLastQuestion) {
          const result = determineWinner(game.teams, game.scores);
          if (!result.tied) {
            finish(get, set, { winnerTeamId: result.winnerTeamId });
          } else {
            set({ game: { ...game, phase: 'tie_breaker', tiedTeamIds: result.tiedTeamIds, questionsAnsweredSinceBreak } });
          }
          return;
        }

        const nextIndex = game.questionIndex + 1;
        const currentQ = getCurrentQuestion(game);
        const nextQ = game.quiz.questions.find((q) => q.id === game.questionOrder[nextIndex]);
        const changedRound = nextQ?.round !== currentQ?.round;
        const reachedBreak = questionsAnsweredSinceBreak >= game.settings.leaderboardEveryQuestions;

        const cleared = {
          buzzedTeamId: undefined,
          buzzQueue: [],
          lockedAnswer: undefined,
          lastAwardedPoints: undefined,
          activeTeamId: undefined,
        };

        if (reachedBreak) {
          set({ game: { ...game, ...cleared, phase: 'leaderboard', questionIndex: nextIndex, questionsAnsweredSinceBreak: 0 } });
        } else if (changedRound) {
          set({ game: { ...game, ...cleared, phase: 'round_intro', questionIndex: nextIndex, round: nextQ?.round, questionsAnsweredSinceBreak } });
        } else {
          set({ game: { ...game, ...cleared, questionIndex: nextIndex, questionsAnsweredSinceBreak } });
          get().startQuestion();
        }
      },

      continueFromLeaderboard: () => {
        const game = get().game;
        if (!game) return;
        const q = getCurrentQuestion(game);
        if (q?.round !== game.round) {
          set({ game: { ...game, phase: 'round_intro', round: q?.round } });
        } else {
          get().startQuestion();
        }
      },

      continueFromRoundIntro: () => get().startQuestion(),

      continueFromTieAnnouncement: () => {
        const game = get().game;
        if (!game) return;
        const [nextId, ...rest] = game.tieBreakerQueue;
        if (!nextId) {
          finish(get, set, { winnerTeamId: undefined });
          return;
        }
        set({
          game: {
            ...game,
            currentTieBreakerId: nextId,
            tieBreakerQueue: rest,
            tieBreakerActive: true,
            phase: 'sudden_death',
            buzzQueue: [],
            buzzedTeamId: undefined,
          },
        });
      },

      continueFromSuddenDeathIntro: () => get().startQuestion(),

      awardBonus: (teamId, points) => {
        const game = get().game;
        if (!game) return;
        set({ game: { ...game, scores: { ...game.scores, [teamId]: (game.scores[teamId] ?? 0) + points } } });
      },

      deductPoints: (teamId, points) => {
        const game = get().game;
        if (!game) return;
        set({ game: { ...game, scores: { ...game.scores, [teamId]: (game.scores[teamId] ?? 0) - points } } });
      },

      setActiveTeam: (teamId) => {
        const game = get().game;
        if (!game) return;
        set({ game: { ...game, buzzedTeamId: teamId, phase: 'locked', timerRunning: false } });
      },

      endGameNow: () => {
        const game = get().game;
        if (!game) return;
        const result = determineWinner(game.teams, game.scores);
        finish(get, set, { winnerTeamId: result.winnerTeamId, tiedTeamIds: result.tiedTeamIds });
      },

      previousQuestion: () => {
        const game = get().game;
        if (!game || game.tieBreakerActive || game.questionIndex === 0) return;
        set({
          game: {
            ...game,
            questionIndex: game.questionIndex - 1,
            phase: 'question',
            buzzedTeamId: undefined,
            buzzQueue: [],
            lockedAnswer: undefined,
            lastAwardedPoints: undefined,
          },
        });
        get().startQuestion();
      },
    }),
    { name: 'bbntcog-active-game' },
  ),
);

function pointsForQuestionSafe(game: GameState): number {
  const q = getCurrentQuestion(game);
  return q ? pointsForQuestion(q, game.settings) : 0;
}

function finish(get: () => GameStore, set: (partial: Partial<GameStore>) => void, result: { winnerTeamId?: string; tiedTeamIds?: string[] }) {
  const game = get().game;
  if (!game) return;
  const finished: GameState = {
    ...game,
    phase: 'finished',
    timerRunning: false,
    completedAt: new Date().toISOString(),
    winnerTeamId: result.winnerTeamId,
    tiedTeamIds: result.tiedTeamIds ?? game.tiedTeamIds,
  };
  set({ game: finished });
  persistHistoryIfFinished(finished);
}

function onTimerExpired(get: () => GameStore, set: (partial: Partial<GameStore>) => void) {
  const game = get().game;
  if (!game) return;

  if (game.timerKind === 'question') {
    if (isTurnBasedMode(game.settings.gameMode) && !game.tieBreakerActive) {
      set({ game: { ...game, phase: 'locked', timerRunning: false, buzzedTeamId: game.activeTeamId } });
    } else {
      const answerTime = game.settings.answerTimeSeconds;
      const unlimited = answerTime === 'unlimited';
      set({
        game: {
          ...game,
          phase: 'answering',
          timerKind: 'answer',
          timerRemaining: unlimited ? 0 : answerTime,
          timerRunning: !unlimited,
        },
      });
    }
    return;
  }

  if (game.timerKind === 'answer' || game.timerKind === 'steal') {
    // Nobody buzzed in time.
    set({ game: { ...game, phase: 'reveal', timerRunning: false, lastAwardedPoints: undefined } });
  }
}
