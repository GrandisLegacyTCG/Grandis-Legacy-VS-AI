(() => {
  const button = document.getElementById('glMobileAppMenuButton');
  const menu = document.getElementById('glMobileAppMenu');
  if (!button || !menu) return;

  const place = () => {
    const rect = button.getBoundingClientRect();
    menu.style.top = `${Math.round(rect.bottom + 8)}px`;
    menu.style.right = `${Math.max(10, Math.round(window.innerWidth - rect.right))}px`;
  };
  const close = () => {
    button.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
  };
  const open = () => {
    place();
    button.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
  };
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (button.getAttribute('aria-expanded') === 'true') close();
    else open();
  });
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });
  document.addEventListener('click', (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 761px)').matches) close();
    else if (!menu.hidden) place();
  });
  window.addEventListener('scroll', () => {
    if (!menu.hidden) place();
  }, { passive: true });
})();
