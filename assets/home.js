async function update() {
  const tile = document.getElementById('network-tile');
  try { if (!window.Innovia.configured()) return; const state = await window.Innovia.rpc('innovia_settings'); tile.hidden = !state.visible; }
  catch { tile.hidden = true; }
  document.getElementById('material-count').textContent = tile.hidden ? '3つの教材' : '4つの教材';
}
update();
window.addEventListener('pageshow', update);
