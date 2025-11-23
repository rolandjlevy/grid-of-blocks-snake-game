document.addEventListener('DOMContentLoaded', () => {
  // ==== DOM/INIT ====
  const $ = (elem) => document.querySelector(elem);
  const $all = (elems) => document.querySelectorAll(elems);

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
    $('.grid-container').appendChild(createElem('div', gridItemProps));
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

  // ==== GAME STATE ====
  const DIRECTION_MAP = {
    arrowup: [0, -1],
    arrowdown: [0, 1],
    arrowleft: [-1, 0],
    arrowright: [1, 0],
  };
  let currentDir = 'arrowright';
  let nextDir = 'arrowright';
  let moveInterval = null;
  let isGameActive = true;

  let snake = []; // array of {x, y}
  let food = null; // {x, y}

  // ==== UTILS ====
  function positionsMatch(a, b) {
    return a.x === b.x && a.y === b.y;
  }
  function inObstacles(pos) {
    return obstaclesPos.some((obs) => positionsMatch(obs, pos));
  }
  function inSnake(pos) {
    return snake.some((seg) => positionsMatch(seg, pos));
  }
  function getWrappedPos(x, y) {
    let nx = x < 1 ? size : x > size ? 1 : x;
    let ny = y < 1 ? size : y > size ? 1 : y;
    return { x: nx, y: ny };
  }
  function getFreeRandomCell() {
    const busyCells = new Set([
      ...snake.map((seg) => `x${seg.x}_y${seg.y}`),
      ...obstaclesPos.map((obs) => `x${obs.x}_y${obs.y}`),
    ]);
    const open = matrix.filter(({ x, y }) => !busyCells.has(`x${x}_y${y}`));
    if (open.length === 0) return null; // All full
    const idx = Math.floor(Math.random() * open.length);
    return open[idx];
  }
  // ==== RENDER ====
  function render() {
    console.log(
      'Food rendered at:',
      food,
      document.getElementById(`x${food.x}_y${food.y}`),
    );

    // Clear all but obstacles
    document.querySelectorAll('.grid-item').forEach((cell) => {
      cell.classList.remove('active', 'food');
    });
    // Render obstacles
    obstaclesPos.forEach(({ x, y }) => {
      const el = document.getElementById(`x${x}_y${y}`);
      if (el) el.classList.add('obstacle');
    });
    // Render snake
    snake.forEach(({ x, y }) => {
      const el = document.getElementById(`x${x}_y${y}`);
      if (el) el.classList.add('active');
    });
    // Render food
    if (food) {
      const el = document.getElementById(`x${food.x}_y${food.y}`);
      if (el) el.classList.add('food');
    }
  }
  // ==== FOOD SPAWN ====
  function placeFood() {
    // Remove any existing .food class first!
    document
      .querySelectorAll('.food')
      .forEach((cell) => cell.classList.remove('food'));
    food = getFreeRandomCell();
    if (food) {
      render();
    } else {
      // Snake fills all free spots: you've won!
      alert('Congratulations! You filled the grid!');
    }
  }

  // ==== MAIN MOVE LOGIC ====
  function moveSnake() {
    if (!isGameActive) return;

    currentDir = nextDir;
    const [dx, dy] = DIRECTION_MAP[currentDir];
    const head = snake[0];
    let newHead = getWrappedPos(head.x + dx, head.y + dy);

    // Check for collision
    if (inObstacles(newHead) || inSnake(newHead)) {
      isGameActive = false;
      clearInterval(moveInterval);
      alert('Game Over!');
      return;
    }

    // Check if food eaten
    let grew = false;
    if (positionsMatch(newHead, food)) {
      snake.unshift(newHead); // grow by adding new head, keep tail
      grew = true;
      placeFood();
    } else {
      snake.unshift(newHead); // move head
      snake.pop(); // remove tail (unless growing)
    }

    render();
  }

  // ==== KEY HANDLER ====
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (DIRECTION_MAP[key]) {
      // No 180 deg reversal
      const opposites = {
        arrowup: 'arrowdown',
        arrowdown: 'arrowup',
        arrowleft: 'arrowright',
        arrowright: 'arrowleft',
      };
      if (opposites[currentDir] !== key && currentDir !== key) {
        nextDir = key;
      }
    }
    if (!isGameActive && (key === 'enter' || key === ' ')) {
      restartGame();
    }
  });

  function startAutoMove() {
    moveInterval = setInterval(moveSnake, 120);
  }

  function restartGame() {
    // Remove all stateful classes except obstacles
    $all('.active, .food').forEach((cell) =>
      cell.classList.remove('active', 'food'),
    );
    isGameActive = true;
    nextDir = 'arrowright';
    currentDir = 'arrowright';

    // Center snake, length 3 horizontally
    let starty = Math.floor(size / 2);
    let startx = Math.floor(size / 2);
    snake = [
      { x: startx + 1, y: starty },
      { x: startx, y: starty },
      { x: startx - 1, y: starty },
    ];
    placeFood();
    startAutoMove();
  }

  // ==== INITIALIZE GAME ====
  restartGame();
});
