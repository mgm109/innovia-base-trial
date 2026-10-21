(() => {
  'use strict';
  // The teacher preview already provides its own return button.
  const teacherNavigation = document.querySelector('.check-nav');
  if (window.self !== window.top && teacherNavigation) {
    teacherNavigation.hidden = true;
    teacherNavigation.style.display = 'none';
  }
  const status = document.getElementById('tile-status');
  const checks = [...document.querySelectorAll('.check-list input')];
  checks.forEach(check => {
    check.checked = false;
    check.addEventListener('change', () => {
      document.getElementById('check-progress').textContent = `${checks.filter(item => item.checked).length} / 5 項目を確認`;
    });
  });
  const showStatus = (message, state = '') => {
    status.textContent = message;
    status.dataset.state = state;
  };
  if (!window.L) {
    showStatus('地図の部品（Leaflet）を読み込めませんでした。ページを再読み込みしてください。', 'error');
    return;
  }
  const map = L.map('map', { scrollWheelZoom: true, maxZoom: 19, zoomControl: false }).setView([43.0602, 141.3544], 14);
  L.control.zoom({ zoomInTitle: '拡大', zoomOutTitle: '縮小' }).addTo(map);
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
    updateWhenIdle: true,
    keepBuffer: 1
  });
  let timer;
  const updateStatus = () => {
    const current = [...document.querySelectorAll('#map img.leaflet-tile')];
    const loaded = current.filter(tile => tile.complete && tile.naturalWidth > 0).length;
    const failed = current.filter(tile => tile.complete && tile.naturalWidth === 0).length;
    if (loaded && !failed) showStatus('地図画像を読み込みました。地図の表示と操作を確認してください。');
    else if (loaded) showStatus('一部の地図画像を読み込めません。学校ネットワークや回線の状態を確認してください。', 'error');
    else showStatus('地図画像を読み込めません。tile.openstreetmap.org への通信や学校ネットワークの制限を確認してください。', 'error');
  };
  tiles.on('loading', () => {
    clearTimeout(timer);
    showStatus('OpenStreetMapの地図画像を読み込み中…');
    timer = setTimeout(updateStatus, 15000);
  });
  tiles.on('load', () => { clearTimeout(timer); updateStatus(); });
  tiles.on('tileerror', () => showStatus('地図画像の読み込みでエラーが起きました。学校ネットワークや回線の状態を確認してください。', 'error'));
  tiles.addTo(map);
  let marker;
  const icon = L.divIcon({ className: 'check-marker', html: '<span></span>', iconSize: [48, 48], iconAnchor: [24, 43], popupAnchor: [0, -36] });
  map.on('click', event => {
    if (marker) marker.setLatLng(event.latlng).closePopup();
    else {
      marker = L.marker(event.latlng, { icon, title: '確認用のピン：押すと説明が開きます', alt: '確認用のピン', keyboard: true }).addTo(map);
      marker.bindPopup('<strong>確認用のピン</strong><br>タップ／クリックした場所にピンが立ちました。<br>この地点は保存・送信されません。');
    }
  });
  window.addEventListener('pagehide', () => clearTimeout(timer));
})();
