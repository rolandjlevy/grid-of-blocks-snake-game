document.addEventListener('DOMContentLoaded', () => {
  const $ = (elem) => document.querySelector(elem);

  const getRandomNum = (max) => Math.floor(Math.random() * max) + 1;

  const createElem = (tagName, props = {}) => {
    const el = document.createElement(tagName);
    return Object.assign(el, props);
  };

  const getSearchParamValue = (key) => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    return Number(params.get(key));
  };

  const DEFAULT_SIZE = 30;
  const size = getSearchParamValue('size') || DEFAULT_SIZE;
  const maxSize = size * size;

  $('.grid-container').style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  $('.grid-container').style.gridTemplateRows = `repeat(${size}, 1fr)`;

  const matrix = Array.from({ length: maxSize }, (_, index) => {
    const x = (index % size) + 1;
    const y = Math.floor(index / size) + 1;
    return { x, y };
  });

  matrix.forEach(({ x, y }) => {
    const gridItemProps = {
      id: `x${x}_y${y}`,
      className: 'grid-item',
    };
    const gridItem = createElem('div', gridItemProps);
    $('.grid-container').appendChild(gridItem);
  });

  const OBSTACLE_COUNT = Math.round(Math.sqrt(maxSize));
  const obstaclesPos = [];

  // Place obstacles, avoiding duplicates
  while (obstaclesPos.length < OBSTACLE_COUNT) {
    const x = getRandomNum(size);
    const y = getRandomNum(size);
    if (!obstaclesPos.some((item) => item.x === x && item.y === y)) {
      obstaclesPos.push({ x, y });
      $(`#x${x}_y${y}`).classList.add('obstacle');
    }
  }

  // --- GAME STATE ---
  // Directions: [dx, dy]
  const DIRECTION_MAP = {
    arrowup: [0, -1],
    arrowdown: [0, 1],
    arrowleft: [-1, 0],
    arrowright: [1, 0],
  };
  let currentDir = 'arrowright';     // Start moving right
  let nextDir = 'arrowright';
  let moveInterval = null;
  let isGameActive = true;

  let snakePos = null; // e.g., { x: 1, y: 1 }

  const highlightRandomItem = () => {
    const matrixWithoutObstacles = matrix.filter(
      (cell) =>
        !obstaclesPos.some((obs) => obs.x === cell.x && obs.y === cell.y),
    );
    const randomIndex = getRandomNum(matrixWithoutObstacles.length) - 1;
    const { x, y } = matrixWithoutObstacles[randomIndex];
    snakePos = { x, y };
    const randItemNum = `x${x}_y${y}`;
    $('.active')?.classList.remove('active');
    $(`#${randItemNum}`).classList.add('active');
  };

  // --- WRAPPING ---
  const getWrappedPos = (x, y) => {
    // Wrap around (1-indexed)
    let nx = x;
    let ny = y;
    if (x < 1) nx = size;
    if (x > size) nx = 1;
    if (y < 1) ny = size;
    if (y > size) ny = 1;
    return { x: nx, y: ny };
  };

  // --- MAIN MOVE LOGIC ---
  function moveSnake() {
    if (!isGameActive) return;
    // Apply the direction chosen by last keypress (one frame delayed for safety)
    currentDir = nextDir;
    const [dx, dy] = DIRECTION_MAP[currentDir];
    let { x, y } = snakePos;

    // Calculate new position with wrapping
    let newX = x + dx;
    let newY = y + dy;
    let wrapped = getWrappedPos(newX, newY);
    // Detect collision with obstacles
    const hitObstacle = obstaclesPos.some(
      (obs) => obs.x === wrapped.x && obs.y === wrapped.y
    );
    if (hitObstacle) {
      isGameActive = false;
      clearInterval(moveInterval);
      alert('Game Over! Hit an obstacle.');
      return;
    }
    // Move active class
    $(`#x${x}_y${y}`).classList.remove('active');
    $(`#x${wrapped.x}_y${wrapped.y}`).classList.add('active');
    // Update position
    snakePos = { x: wrapped.x, y: wrapped.y };
  }

  // --- KEY HANDLER ---
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (DIRECTION_MAP[key]) {
      // Prevent 180-degree reversals
      const opposites = {
        arrowup: 'arrowdown',
        arrowdown: 'arrowup',
        arrowleft: 'arrowright',
        arrowright: 'arrowleft',
      };
      if (opposites[currentDir] !== key) {
        nextDir = key;
      }
    }
    // Optional: Restart on Enter if game over
    if (!isGameActive && (key === 'enter' || key === ' ')) {
      restartGame();
    }
  });

  function startAutoMove() {
    moveInterval = setInterval(moveSnake, 200);
  }

  function restartGame() {
    // Remove all actives
    document.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    isGameActive = true;
    nextDir = 'arrowright';
    currentDir = 'arrowright';
    highlightRandomItem();
    startAutoMove();
  }

  // --- INIT ---
  highlightRandomItem();
  startAutoMove();

});
