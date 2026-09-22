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
3. On the pre-game screen, click **Begin Quiz**. This tab is your **control
   screen** — it keeps its host controls the whole time. Click the monitor
   icon (top right) to open the **Audience Display** in a new tab; point that
   one at the projector/TV. It mirrors the game but never reveals the correct
   answer until you press Reveal, and has no controls of its own.
4. Run the game from the bottom host bar — one obvious primary action at each
   step:
   - A team buzzes in → tap the option they gave (multiple choice) or just
     look at them → **Reveal Answer**. Multiple-choice questions grade
     themselves the instant you reveal (right/wrong is just a string
     comparison, no need to judge it yourself); other question types show the
     correct answer first so you can compare it to what was actually said,
     then you tap **Correct**/**Incorrect**.
   - **Next Question** → leaderboard breaks and round intros happen
     automatically at the configured points.
   - The tools drawer (gear icon) has pause/skip/previous, per-team score
     adjustments, and **Running Late? End Early** — shows how many questions
     each team has actually answered and, in Classic/Rapid Fire modes, can
     auto-wrap-up as soon as the trailing team(s) catch up so nobody feels
     shorted by an abrupt stop.
5. The **Aa −/+** control next to the monitor icon resizes everything on the
   Audience Display remotely, without touching that window — handy if the
   projector text is too small from the back of the room.
6. Keyboard shortcuts (host window): `Space` pause/resume timer, `R` reveal
   the answer (or reset buzzers while they're open), `C`/`X` correct/incorrect
   once an answer's revealed and still ungraded, `N` next, and team buzzer
   keys (default `Q` / `P` / `Z` / `M`, remappable in Settings).

Ties automatically roll into sudden-death tie-breakers before the winner
screen.

## Phone buzzers (QR code)

Teams can buzz in from their own phones instead of a shared keyboard. This is
the one feature that needs a real network relay — phones are separate
devices from your laptop, so the same-browser trick the host/display windows
use (`BroadcastChannel`) can't reach them.

1. Create a free Supabase project (supabase.com) — no database setup needed,
   this only uses Supabase's Realtime Broadcast (ephemeral pub/sub).
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings →
   API — these are the public/anon key, safe to use client-side) as
   environment variables wherever you deploy, and redeploy. These are the
   same two variables that switch on Supabase storage (see above) — setting
   them turns on both.
3. In-game, click the QR icon next to the monitor/fullscreen buttons. Each
   phone that scans it picks its team once, then sees one big BUZZ button
   that lights up while buzzers are open.

Without those two variables set, the QR button stays visibly disabled with
an explanatory tooltip instead of pretending to work.

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
