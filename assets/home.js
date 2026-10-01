const catalogTiles = [
  ['binary',document.querySelector('.tile-binary')],
  ['logic',document.querySelector('.tile-battle')],
  ['simulator',document.querySelector('.tile-simulator')],
  ['network',document.querySelector('.tile-network')]
];
const defaultCatalogOrder = catalogTiles.map(([id]) => id);
let latestUpdate = 0;
async function update() {
  const updateId = ++latestUpdate;
  const tile = document.getElementById('network-tile');
  if (!window.Innovia.configured()) return;
  const [settings,orderResult] = await Promise.allSettled([
    window.Innovia.rpc('innovia_settings'), window.Innovia.rpc('innovia_catalog_order')
  ]);
  if (updateId !== latestUpdate) return;
  tile.hidden = settings.status !== 'fulfilled' || !settings.value.visible;
  const order = orderResult.status === 'fulfilled' ? orderResult.value : null;
  if (Array.isArray(order) && order.length === 4 && new Set(order).size === 4 && defaultCatalogOrder.every(id => order.includes(id))) {
    const grid = document.querySelector('.learning-grid');
    const current = [...grid.children];
    const next = order.map(id => catalogTiles.find(([tileId]) => tileId === id)[1]);
    if (next.some((element,index) => element !== current[index])) grid.append(...next);
  }
  document.getElementById('material-count').textContent = tile.hidden ? '3つの教材' : '4つの教材';
}
update();
window.addEventListener('pageshow', update);
document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
setInterval(() => { if (!document.hidden) update(); }, 15000);
