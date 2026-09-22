# Bull Bay New Testament Church of God — Quiz Night

A live, game-show style Bible quiz app for church quiz nights: team setup, a
buzzer-driven game engine, dramatic reveals, a host + presenter dual-window
mode, and an admin quiz builder. Ships seeded with a full 69-question **1
Kings Chapter 1** quiz.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL. The app runs entirely offline out of the box —
no external services required.

## How persistence works

Quizzes and game history are stored in the browser via `localStorage` by
default. To switch to Supabase instead:

1. Create a Supabase project and run the SQL in `supabase/migrations/` (in
   order) via the Supabase SQL editor or CLI.
2. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY`.
3. Restart the dev server. `src/lib/storage/index.ts` picks Supabase
   automatically once both variables are set.

The Supabase adapter (`src/lib/storage/supabaseAdapter.ts`) is written
against the schema but hasn't been exercised against a live project — sanity
check it against your own instance before relying on it for a real event.

## Running a game night

1. **Home → Start Game** — pick team count, names and colors.
2. Choose a quiz (1 Kings Chapter 1 ships pre-loaded) and configure timers,
   points, question selection and game mode (Buzzer is the default).
3. On the pre-game screen, click **Begin Quiz**. Optionally open the
   **presentation window** (the monitor icon, top right) on a second screen
   or the church TV — it mirrors the host view but never reveals the correct
   answer until the host presses reveal.
4. Run the game from the bottom host bar: one obvious primary action at each
   step (Start Question → mark Correct/Incorrect → Next Question…), plus a
   collapsible tools panel for pausing, skipping, adjusting scores, or ending
   early.
5. Keyboard shortcuts (host window): `Space` pause/resume timer, `C`
   correct, `X` incorrect, `N` next, `R` reset buzzers, and team buzzer keys
   (default `Q` / `P` / `Z` / `M`, remappable in Settings).

Ties automatically roll into sudden-death tie-breakers before the winner
screen.

## Admin

`/admin` is gated behind a host PIN (default **1611** — change it in
Settings). From there you can create, edit, duplicate, archive or
JSON-import quizzes.

## Known simplifications

Built to be genuinely playable today rather than a full re-implementation of
every line of the original spec. In particular:

- **Auth** is a local PIN gate, not Supabase Auth roles (admin / quizmaster /
  viewer). The schema for that (`supabase/migrations/0003_roles_and_rls.sql`)
  is ready for a future pass once a real Supabase project exists.
- **Sound effects** are synthesized with the Web Audio API
  (`src/lib/sound/soundManager.ts`) rather than produced recordings — no
  audio files to manage, but not studio-quality. Swap in real files by
  editing that module if you'd rather use `public/sounds/*.mp3`.
- The church **logo** used throughout the app was cropped from the supplied
  brand reference sheet (no standalone transparent master existed) — if a
  higher-resolution vector logo becomes available later, drop it in at
  `public/branding/logo/bbntcog-logo.png`.

## Regenerating favicons

If you replace `public/branding/logo/bbntcog-icon.png`, regenerate the full
favicon/PWA icon set with:

```bash
npm run generate:favicons
```
