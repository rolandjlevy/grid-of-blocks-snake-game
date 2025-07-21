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
    const props = {
      className: 'grid-item',
      id: `x${x}_y${y}`,
      textContent: `${x},${y}`,
    };
    const gridItemProps = {
      id: props.id,
      className: props.className,
    };
    const gridItem = createElem('div', gridItemProps);
    $('.grid-container').appendChild(gridItem);
  });

  const OBSTABLE_COUNT = Math.round(Math.sqrt(maxSize));
  const obstaclesPos = [];

  // use a while loop to avoid duplicates
  while (obstaclesPos.length < OBSTABLE_COUNT) {
    const x = getRandomNum(size);
    const y = getRandomNum(size);
    const randItemNum = `x${x}_y${y}`;
    if (!obstaclesPos.some((item) => item.x === x && item.y === y)) {
      obstaclesPos.push({ x, y });
      $(`#${randItemNum}`).classList.add('obstacle');
    }
  }

  const getNextPos = (direction, x, y) => {
    const nextPosMapping = {
      arrowup: { x, y: y > 1 ? y - 1 : y },
      arrowdown: { x, y: y < size ? y + 1 : y },
      arrowleft: { x: x > 1 ? x - 1 : x, y },
      arrowright: { x: x < size ? x + 1 : x, y },
    };
    const validKey = Object.keys(nextPosMapping).includes(direction);
    if (!validKey) return false;
    const nextPos = nextPosMapping[direction];
    const blocked = obstaclesPos.find(
      (item) => item.x === nextPos.x && item.y === nextPos.y,
    );
    if (blocked) return false;
    return nextPos;
  };

  const moveBlock = (direction) => {
    const activeItem = $('.active');
    const [x, y] = activeItem.id.match(/\d+/g);
    const pos = getNextPos(direction, Number(x), Number(y));
    if (!pos) return;
    activeItem.classList.remove('active');
    $(`#x${pos.x}_y${pos.y}`).classList.add('active');
  };

  document.addEventListener('keydown', (e) => {
    moveBlock(e.key.toLowerCase());
  });

  const highlightRandomItem = () => {
    const matrixWithoutObstacles = matrix.filter(
      (cell) =>
        !obstaclesPos.some((obs) => obs.x === cell.x && obs.y === cell.y),
    );
    const randomIndex = getRandomNum(matrixWithoutObstacles.length) - 1;
    const { x, y } = matrixWithoutObstacles[randomIndex];
    const randItemNum = `x${x}_y${y}`;
    $('.active')?.classList.remove('active');
    $(`#${randItemNum}`).classList.add('active');
  };

  highlightRandomItem();
});
