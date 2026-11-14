// Keep the footer copyright year current
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Decorative self-playing snake for the landing page hero.
// It heads for the food, avoids obstacles and itself, and starts over when it gets long.
(() => {
  const grid = document.getElementById('demo-grid');
  if (!grid) return;

  const COLS = 16;
  const ROWS = 10;
  const TICK_MS = 140;
  const MAX_LENGTH = 14;
  const OBSTACLES = new Set(['4,2', '11,3', '7,6', '13,7', '2,8', '9,9']);
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  const toKey = (x, y) => `${x},${y}`;
  const wrap = (x, y) => [(x + COLS) % COLS, (y + ROWS) % ROWS];

  const cells = new Map();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = document.createElement('div');
      cell.className = 'demo-cell';
      if (OBSTACLES.has(toKey(x, y))) cell.classList.add('is-obstacle');
      grid.appendChild(cell);
      cells.set(toKey(x, y), cell);
    }
  }

  let snake;
  let food;

  function freeCells() {
    const taken = new Set(snake.map(([x, y]) => toKey(x, y)));
    return [...cells.keys()].filter((k) => !taken.has(k) && !OBSTACLES.has(k));
  }

  function placeFood() {
    const free = freeCells();
    food = free[Math.floor(Math.random() * free.length)].split(',').map(Number);
  }

  function reset() {
    snake = [[4, 5], [3, 5], [2, 5], [1, 5]];
    placeFood();
  }

  // Shortest distance on a wrapping grid
  const dist = ([ax, ay], [bx, by]) => {
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    return Math.min(dx, COLS - dx) + Math.min(dy, ROWS - dy);
  };

  function step() {
    const [hx, hy] = snake[0];
    const body = new Set(snake.slice(0, -1).map(([x, y]) => toKey(x, y)));
    const options = DIRS.map(([dx, dy]) => wrap(hx + dx, hy + dy)).filter(
      ([x, y]) => !OBSTACLES.has(toKey(x, y)) && !body.has(toKey(x, y)),
    );
    if (options.length === 0) return reset();

    options.sort((a, b) => dist(a, food) - dist(b, food) || Math.random() - 0.5);
    const next = options[0];
    snake.unshift(next);

    if (next[0] === food[0] && next[1] === food[1]) {
      if (snake.length >= MAX_LENGTH) return reset();
      placeFood();
    } else {
      snake.pop();
    }
  }

  function draw() {
    cells.forEach((cell) => cell.classList.remove('is-snake', 'is-head', 'is-food'));
    snake.forEach(([x, y], i) =>
      cells.get(toKey(x, y)).classList.add(i === 0 ? 'is-head' : 'is-snake'),
    );
    cells.get(toKey(...food)).classList.add('is-food');
  }

  reset();
  draw();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(() => {
    if (document.hidden) return;
    step();
    draw();
  }, TICK_MS);
})();
