# Snake, Before & After AI

One snake game, two versions: the original, hand-built with no AI, and the same game after an AI code review that I directed, checked and approved.

View [live demo](https://grid-of-blocks.vercel.app)

## Structure

| Path | What it is |
| --- | --- |
| `index.html`, `assets/landing.*` | Landing page: the story, what the review found, and a choice of versions |
| `original/` | **Version 1: Hand-built.** The original game with all its bugs left in. The only changes are a navigation bar and replacing the blocking `alert()` pop-ups with an on-screen message, a crash highlight and a short board shake |
| `improved/` | **Version 2: AI-reviewed.** The same game with 6 bugs fixed and faster rendering, plus a score and touch controls |
| `assets/game-nav.css` | Navigation bar shared by both game pages |

Each game is self-contained and playable on its own page. Add `?size=<n>` to a game's URL to change the board size.

## What changed in the improved version

1. Obstacles can no longer block the start (previously about 1 in 30 games crashed on the first move and restarted into the same crash).
2. Enter / Space to restart now works.
3. Winning stops the game instead of ending in "Game Over".
4. `?size=` is rounded and kept between 5 and 100.
5. Quick turns are queued, so pressing Up then Left in one tick does both.
6. Moving into the square your tail is leaving is allowed.

It also redraws only the cells that change each move, instead of the whole board.

Added after the review:

- A score (1 point per food) and a best score saved in the browser.
- Touch controls: swipe anywhere, or use the on-screen arrows shown on touch screens. Tap the board to play again.
- The board scales down to fit small screens.

## How to run this app in GitHub Codespaces

- Run http-server with nodemon

```bash
npm i -g http-server nodemon
```

```bash
nodemon --exec http-server
```

```bash
http-server -c-1
```

- Click 'Open in Browser' or from the Terminal, click the link Forwarded Address link from PORTS
