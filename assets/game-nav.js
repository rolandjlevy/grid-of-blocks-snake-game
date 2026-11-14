// The games listen for Space/Enter on the whole page. Move focus off the
// "How to play" button after a click so those keys don't re-toggle the panel.
document.querySelectorAll('.game-nav__help').forEach((button) => {
  button.addEventListener('click', () => button.blur());
});
