document.addEventListener('DOMContentLoaded', () => {
  // ==== HELPERS ====
  const $ = (selector) => document.querySelector(selector);
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const createElem = (tagName, props = {}) =>
    Object.assign(document.createElement(tagName), props);
  const getSearchParamValue = (key) =>
    Number(new URLSearchParams(window.location.search).get(key));

  // ==== CONFIG ====
  const DEFAULT_SIZE = 30;
  const MIN_SIZE = 5;
  const MAX_SIZE = 100;
  const TICK_MS = 120;
  const MAX_QUEUED_MOVES = 3;
  const SAFE_CELLS_AHEAD = 3; // obstacle-free cells in front of the starting head
  const MIN_SWIPE_PX = 24; // shorter touch movements count as a tap, not a swipe
  const BEST_SCORE_KEY = 'snake-v2-best-score';

  // Round and clamp ?size= so bad values (negative, fractional, tiny, huge) can't break the grid
  const requestedSize = Math.round(getSearchParamValue('size'));
  const size = requestedSize
    ? clamp(requestedSize, MIN_SIZE, MAX_SIZE)
    : DEFAULT_SIZE;
  const maxSize = size * size;

  const DIRECTION_MAP = {
    arrowup: [0, -1],
    arrowdown: [0, 1],
    arrowleft: [-1, 0],
    arrowright: [1, 0],
  };
  const OPPOSITES = {
    arrowup: 'arrowdown',
    arrowdown: 'arrowup',
    arrowleft: 'arrowright',
    arrowright: 'arrowleft',
  };

  // ==== GRID ====
  const gridContainer = $('.grid-container');
  const messageEl = $('.message');
  const scoreEl = $('#score');
  const bestEl = $('#best');
  // CSS uses --size to cap the board at its natural size (13px per cell) and shrink it on small screens
  gridContainer.style.setProperty('--size', size);
  gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  gridContainer.style.gridTemplateRows = `repeat(${size}, 1fr)`;

  const matrix = Array.from({ length: maxSize }, (_, index) => ({
    x: (index % size) + 1,
    y: Math.floor(index / size) + 1,
  }));

  // Cache cell elements so rendering never has to query the DOM
  const cells = matrix.map(({ x, y }) => {
    const cell = createElem('div', { id: `x${x}_y${y}`, className: 'grid-item' });
    gridContainer.appendChild(cell);
    return cell;
  });

  // ==== GAME STATE ====
  let snake = []; // array of {x, y}, head first
  let snakeCells = new Set(); // keys of cells occupied by the snake
  let obstacles = new Set(); // keys of obstacle cells
  let food = null; // {x, y}
  let currentDir = 'arrowright';
  let dirQueue = []; // pending direction changes, applied one per tick
  let moveInterval = null;
  let isGameActive = false;
  let crashCell = null; // cell highlighted after a crash
  let score = 0; // food eaten this game
  let bestScore = loadBestScore();

  // ==== SCORE ====
  // localStorage can be unavailable (private mode, blocked storage), so the best score
  // falls back to lasting only until the page is closed
  function loadBestScore() {
    try {
      return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
    } catch {
      return 0;
    }
  }
  function saveBestScore() {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    } catch {
      // Ignore: the best score still shows for this visit
    }
  }
  function renderScore() {
    scoreEl.textContent = score;
    bestEl.textContent = bestScore;
  }

  // ==== UTILS ====
  const toKey = ({ x, y }) => `${x},${y}`;
  const cellAt = ({ x, y }) => cells[(y - 1) * size + (x - 1)];
  const positionsMatch = (a, b) => a.x === b.x && a.y === b.y;
  const getWrappedPos = (x, y) => ({
    x: x < 1 ? size : x > size ? 1 : x,
    y: y < 1 ? size : y > size ? 1 : y,
  });

  function getFreeRandomCell() {
    const open = matrix.filter((pos) => {
      const key = toKey(pos);
      return !snakeCells.has(key) && !obstacles.has(key);
    });
    if (open.length === 0) return null;
    return open[Math.floor(Math.random() * open.length)];
  }

  // ==== OBSTACLES ====
  function placeObstacles(safeKeys) {
    obstacles.forEach((key) => {
      const [x, y] = key.split(',').map(Number);
      cellAt({ x, y }).classList.remove('obstacle');
    });
    obstacles = new Set();

    // Leave room for the safe zone plus at least one free cell for food
    const count = Math.min(
      Math.round(size/2);
      maxSize - safeKeys.size - 1,
    );
    while (obstacles.size < count) {
      const pos = matrix[Math.floor(Math.random() * maxSize)];
      const key = toKey(pos);
      if (!safeKeys.has(key) && !obstacles.has(key)) {
        obstacles.add(key);
        cellAt(pos).classList.add('obstacle');
      }
    }
  }

  // ==== FOOD ====
  function placeFood() {
    if (food) cellAt(food).classList.remove('food');
    food = getFreeRandomCell();
    if (food) {
      cellAt(food).classList.add('food');
    } else {
      endGame('Congratulations! You filled the grid!');
    }
  }

  // ==== MAIN MOVE LOGIC ====
  function moveSnake() {
    if (!isGameActive) return;

    if (dirQueue.length) currentDir = dirQueue.shift();
    const [dx, dy] = DIRECTION_MAP[currentDir];
    const head = snake[0];
    const tail = snake[snake.length - 1];
    const newHead = getWrappedPos(head.x + dx, head.y + dy);
    const newKey = toKey(newHead);
    const isEating = food !== null && positionsMatch(newHead, food);

    // The tail moves out of the way this tick unless the snake is growing
    const hitsSelf =
      snakeCells.has(newKey) && (isEating || !positionsMatch(newHead, tail));
    if (obstacles.has(newKey) || hitsSelf) {
      showCrash(newHead);
      endGame('Game over!');
      return;
    }

    if (!isEating) {
      snake.pop();
      snakeCells.delete(toKey(tail));
      cellAt(tail).classList.remove('active');
    }
    snake.unshift(newHead);
    snakeCells.add(newKey);
    cellAt(newHead).classList.add('active');

    if (isEating) {
      score++;
      renderScore();
      placeFood();
    }
  }

  // ==== INPUT ====
  // Keyboard, swipes and the on-screen buttons all go through here
  function queueDirection(dir) {
    // Validate against the last queued move so quick turns (e.g. up then left) both register
    const lastDir = dirQueue.length ? dirQueue[dirQueue.length - 1] : currentDir;
    if (
      dirQueue.length < MAX_QUEUED_MOVES &&
      dir !== lastDir &&
      dir !== OPPOSITES[lastDir]
    ) {
      dirQueue.push(dir);
    }
  }

  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (DIRECTION_MAP[key]) {
      e.preventDefault();
      queueDirection(key);
      return;
    }

    if (!isGameActive && (key === 'enter' || key === ' ')) {
      e.preventDefault();
      restartGame();
    }
  });

  // Swipe anywhere in the play area to steer
  const playArea = $('.container');
  let touchStart = null;
  playArea.addEventListener(
    'touchstart',
    (e) => {
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    },
    { passive: true },
  );
  playArea.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < MIN_SWIPE_PX) return; // a tap
    if (Math.abs(dx) > Math.abs(dy)) {
      queueDirection(dx > 0 ? 'arrowright' : 'arrowleft');
    } else {
      queueDirection(dy > 0 ? 'arrowdown' : 'arrowup');
    }
  });

  // On-screen arrow buttons (shown on touch screens). pointerdown reacts instantly and
  // preventDefault stops the button taking focus, so Space/Enter keep restarting the game.
  document.querySelectorAll('.dpad__btn').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      queueDirection(btn.dataset.dir);
    });
  });

  // Tap or click the board to play again after a game ends
  $('.board').addEventListener('click', () => {
    if (!isGameActive) restartGame();
  });

  // ==== GAME LIFECYCLE ====
  function startAutoMove() {
    stopAutoMove();
    moveInterval = setInterval(moveSnake, TICK_MS);
  }

  function stopAutoMove() {
    clearInterval(moveInterval);
    moveInterval = null;
  }

  // Highlight the cell the snake hit and give the board a short shake
  function showCrash(pos) {
    crashCell = cellAt(pos);
    crashCell.classList.add('crash');
    gridContainer.classList.remove('shake');
    void gridContainer.offsetWidth; // restart the animation if it's already applied
    gridContainer.classList.add('shake');
  }

  function endGame(message) {
    isGameActive = false;
    stopAutoMove();

    const isNewBest = score > bestScore;
    if (isNewBest) {
      bestScore = score;
      saveBestScore();
      renderScore();
    }
    const usesTouch = window.matchMedia('(pointer: coarse)').matches;
    const howToRestart = usesTouch ? 'Tap the board to play again.' : 'Press Enter or Space to play again.';
    const result = isNewBest ? `New best: ${score}!` : `You scored ${score}.`;
    messageEl.textContent = `${message} ${result} ${howToRestart}`;
    messageEl.hidden = false;
  }

  function restartGame() {
    stopAutoMove();
    snake.forEach((seg) => cellAt(seg).classList.remove('active'));
    if (food) cellAt(food).classList.remove('food');
    food = null;
    if (crashCell) crashCell.classList.remove('crash');
    crashCell = null;
    gridContainer.classList.remove('shake');
    messageEl.hidden = true;

    currentDir = 'arrowright';
    dirQueue = [];
    score = 0;
    renderScore();

    // Center snake, length 3, facing right
    const startX = Math.floor(size / 2);
    const startY = Math.floor(size / 2);
    snake = [
      { x: startX + 1, y: startY },
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
    ];
    snakeCells = new Set(snake.map(toKey));
    snake.forEach((seg) => cellAt(seg).classList.add('active'));

    // Keep obstacles off the snake and the cells directly ahead of it
    const safeKeys = new Set(snakeCells);
    for (let i = 1; i <= SAFE_CELLS_AHEAD; i++) {
      safeKeys.add(toKey(getWrappedPos(snake[0].x + i, startY)));
    }
    placeObstacles(safeKeys);

    isGameActive = true;
    placeFood();
    startAutoMove();
  }

  // ==== INITIALIZE GAME ====
  restartGame();
});
