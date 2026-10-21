(() => {
  'use strict';
  const embedded = window.self !== window.top && new URLSearchParams(location.search).get('innovia-preview') === 'teacher';
  if (!embedded) return;
  document.documentElement.classList.add('innovia-embedded');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const reset = () => {
    window.scrollTo({top:0,left:0,behavior:'instant'});
    document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  };
  reset();
  window.addEventListener('pageshow', reset);
  window.addEventListener('load', () => requestAnimationFrame(reset), {once:true});
})();
