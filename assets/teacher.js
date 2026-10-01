const api = window.Innovia;
const message = document.getElementById('message');
const form = document.getElementById('login');
const content = document.getElementById('teacher-content');
const passwordForm = document.getElementById('password-change');
const passwordPanel = document.getElementById('password-settings');
const passwordMessage = document.getElementById('password-message');
const passwordButton = document.getElementById('change-password-button');
let changingPassword = false;
let visible = false;
const materials = [
  {id:'binary',title:'2進数バトル'},
  {id:'logic',title:'論理回路バトル'},
  {id:'simulator',title:'論理回路シミュレータ'},
  {id:'network',title:'ネットにつながらない！原因を探せ'}
];
let catalogOrder = materials.map(material => material.id);
let savedCatalogOrder = [...catalogOrder];
let catalogLoaded = false;
let savingCatalog = false;
const catalogPanel = document.createElement('section');
catalogPanel.className = 'panel';
catalogPanel.id = 'catalog-order-settings';
catalogPanel.setAttribute('aria-labelledby','catalog-order-heading');
catalogPanel.innerHTML = '<h2 id="catalog-order-heading">生徒の教材一覧の並び順</h2><p class="small-note">「上へ」「下へ」で並べ替え、「順番を保存」を押してください。保存した順番は生徒の端末にも反映されます。開いている教材一覧は約15秒以内に更新されます。</p><ol class="catalog-order-list" id="catalog-order-list"></ol><div class="actions"><button type="button" class="button" id="save-catalog-order" disabled>順番を保存</button><button type="button" class="ghost" id="reset-catalog-order" disabled>保存した順番に戻す</button></div><p id="catalog-order-message" role="status" aria-live="polite"></p>';
content.prepend(catalogPanel);
const catalogList = document.getElementById('catalog-order-list');
const catalogMessage = document.getElementById('catalog-order-message');
const catalogSave = document.getElementById('save-catalog-order');
const catalogReset = document.getElementById('reset-catalog-order');
function validCatalogOrder(order) {
  return Array.isArray(order) && order.length === materials.length && new Set(order).size === materials.length && materials.every(material => order.includes(material.id));
}
function renderCatalogOrder(focusId) {
  catalogList.replaceChildren();
  const dirty = JSON.stringify(catalogOrder) !== JSON.stringify(savedCatalogOrder);
  catalogSave.disabled = !catalogLoaded || savingCatalog || !dirty;
  catalogReset.disabled = !catalogLoaded || savingCatalog || !dirty;
  catalogSave.textContent = savingCatalog ? '保存しています…' : '順番を保存';
  catalogOrder.forEach((id,index) => {
    const material = materials.find(item => item.id === id);
    const row = document.createElement('li'); row.className = 'catalog-order-row';
    const title = document.createElement('div'); title.className = 'catalog-order-title'; title.tabIndex = -1;
    const number = document.createElement('span'); number.className = 'catalog-order-number'; number.textContent = String(index+1);
    const name = document.createElement('strong'); name.textContent = material.title;
    if (id === 'network' && !visible) {
      const note = document.createElement('span'); note.className = 'catalog-order-unpublished'; note.textContent = '非公開（生徒の一覧には表示されません）'; name.append(note);
    }
    title.append(number,name);
    const buttons = document.createElement('div'); buttons.className = 'catalog-order-buttons';
    for (const [delta,label] of [[-1,'↑ 上へ'],[1,'↓ 下へ']]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost'; button.textContent = label;
      button.setAttribute('aria-label',material.title + (delta === -1 ? 'を上へ' : 'を下へ'));
      button.disabled = !catalogLoaded || savingCatalog || index + delta < 0 || index + delta >= catalogOrder.length;
      button.onclick = () => {
        [catalogOrder[index],catalogOrder[index+delta]] = [catalogOrder[index+delta],catalogOrder[index]];
        catalogMessage.classList.remove('error'); catalogMessage.textContent = material.title + 'を' + String(index+delta+1) + '番目に移動しました。「順番を保存」で反映してください。';
        renderCatalogOrder(id);
      };
      buttons.append(button);
    }
    row.append(title,buttons); catalogList.append(row);
    if (focusId === id) title.focus();
  });
}
async function loadCatalogOrder() {
  try {
    const order = await api.rpc('innovia_catalog_order', {}, 'teacher');
    if (!validCatalogOrder(order)) throw Error('教材の順番を読み込めませんでした。画面を更新してください。');
    catalogOrder = [...order]; savedCatalogOrder = [...order]; catalogLoaded = true; catalogMessage.textContent = ''; catalogMessage.classList.remove('error');
  } catch (error) {
    catalogMessage.classList.add('error'); catalogMessage.textContent = error.message;
  }
  renderCatalogOrder();
}
catalogSave.onclick = async () => {
  if (catalogSave.disabled || savingCatalog) return;
  savingCatalog = true; renderCatalogOrder(); catalogMessage.classList.remove('error'); catalogMessage.textContent = '順番を保存しています…';
  try {
    const order = await api.rpc('innovia_catalog_order', {p_order:[...catalogOrder]}, 'teacher');
    if (!validCatalogOrder(order)) throw Error('保存結果を確認できませんでした。画面を更新してください。');
    catalogOrder = [...order]; savedCatalogOrder = [...order]; catalogMessage.textContent = '順番を保存しました。生徒の教材一覧に反映されます。';
  } catch (error) { catalogMessage.classList.add('error'); catalogMessage.textContent = error.message; }
  finally { savingCatalog = false; renderCatalogOrder(); }
};
catalogReset.onclick = () => { catalogOrder = [...savedCatalogOrder]; catalogMessage.classList.remove('error'); catalogMessage.textContent = '保存した順番に戻しました。'; renderCatalogOrder(); };
renderCatalogOrder();
const passwordVisibility = [];
for (const input of document.querySelectorAll('input[type="password"]')) {
  const label = document.querySelector(`label[for="${input.id}"]`).textContent;
  const row = document.createElement('div');
  row.className = 'password-field';
  input.before(row);
  row.append(input);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'password-visibility';
  toggle.setAttribute('aria-controls', input.id);
  function setVisible(show) {
    input.type = show ? 'text' : 'password';
    toggle.textContent = show ? '非表示' : '表示';
    toggle.setAttribute('aria-label', `${label}を${show ? '非表示にする' : '表示する'}`);
    toggle.setAttribute('aria-pressed', String(show));
  }
  setVisible(false);
  toggle.onclick = () => setVisible(input.type === 'password');
  row.append(toggle);
  passwordVisibility.push({ input, hide: () => setVisible(false) });
}
function hidePasswords(target) {
  for (const field of passwordVisibility) if (target.contains(field.input)) field.hide();
}
function tell(text) { message.textContent = text; }
function passwordTell(text, error = false) {
  passwordMessage.textContent = text;
  passwordMessage.classList.toggle('error', error);
}
function clearPasswordForm() {
  passwordForm.reset();
  hidePasswords(passwordForm);
  passwordTell('');
  passwordPanel.open = false;
}
async function status() {
  const state = await api.rpc('innovia_settings', {}, 'teacher');
  visible = state.visible;
  content.hidden = !state.teacher;
  form.hidden = state.teacher;
  passwordButton.disabled = !state.teacher || changingPassword;
  if (!state.teacher) clearPasswordForm();
  if (state.teacher && !catalogLoaded) await loadCatalogOrder();
  if (!state.teacher) { catalogLoaded = false; catalogMessage.textContent = ''; }
  renderCatalogOrder();
  document.getElementById('network-state').textContent = visible ? '公開中' : '非公開';
  document.getElementById('toggle').textContent = visible ? '非公開にする' : '公開する';
  if (!state.teacher && (await api.client('teacher').auth.getSession()).data.session) tell('ログインできましたが、先生の権限がまだ登録されていません。準備ガイドの「先生を登録する」を確認してください。');
}
form.onsubmit = async event => {
  event.preventDefault(); const button = form.querySelector('.button'); button.disabled = true; tell('');
  hidePasswords(form);
  try {
    const { error } = await api.client('teacher').auth.signInWithPassword({email: form.elements.email.value, password: form.elements.password.value});
    form.elements.password.value = '';
    if (error) throw Error('ログインできません。メールアドレス・パスワードと、先生用の登録を確認してください。');
    await status();
  } catch (error) { tell(error.message); } finally { button.disabled = false; }
};
document.getElementById('toggle').onclick = async event => {
  event.target.disabled = true;
  try { await api.rpc('innovia_settings', { p_visible: !visible }, 'teacher'); await status(); tell('公開設定を保存しました。'); }
  catch (error) { tell(error.message); } finally { event.target.disabled = false; }
};
passwordForm.onsubmit = async event => {
  event.preventDefault();
  if (changingPassword || passwordButton.disabled) return;
  const currentPassword = passwordForm.elements.currentPassword.value;
  const newPassword = passwordForm.elements.newPassword.value;
  const confirmation = passwordForm.elements.confirmPassword.value;
  passwordTell('');
  if (!currentPassword) { passwordTell('現在のパスワードを入力してください。', true); return; }
  if (newPassword.length < 8) { passwordTell('新しいパスワードは8文字以上で入力してください。', true); return; }
  if (newPassword !== confirmation) { passwordTell('新しいパスワードと確認用の入力が一致していません。', true); return; }
  if (newPassword === currentPassword) { passwordTell('現在とは違う新しいパスワードを入力してください。', true); return; }
  changingPassword = true;
  passwordButton.disabled = true;
  document.getElementById('logout').disabled = true;
  passwordTell('パスワードを変更しています…');
  try {
    const state = await api.rpc('innovia_settings', {}, 'teacher');
    if (!state.teacher) { await status(); throw Error('先生としてログインし直してください。'); }
    const db = api.client('teacher');
    const session = await db.auth.getSession();
    const account = session.data.session?.user;
    if (session.error || !account?.email || account.is_anonymous) throw Error('先生としてログインし直してください。');
    // Verify the current password and renew authentication for this same account.
    const verified = await db.auth.signInWithPassword({ email: account.email, password: currentPassword });
    if (verified.error) throw Error('現在のパスワードを確認してください。時間をおいて再度お試しいただく場合もあります。');
    if (verified.data.user?.id !== account.id) throw Error('先生としてログインし直してください。');
    const { error } = await db.auth.updateUser({ password: newPassword, current_password: currentPassword });
    if (error) {
      if (error.code === 'weak_password') throw Error('新しいパスワードが条件を満たしていません。文字数を増やし、英字・数字・記号を組み合わせてください。');
      if (error.code === 'same_password') throw Error('現在とは違う新しいパスワードを入力してください。');
      if (['reauthentication_needed', 'reauthentication_not_valid', 'session_not_found', 'bad_jwt'].includes(error.code)) throw Error('ログアウトして先生としてログインし直し、もう一度変更してください。');
      throw Error('パスワードを変更できませんでした。接続を確認し、時間をおいてもう一度お試しください。');
    }
    passwordTell('パスワードを変更しました。次回から新しいパスワードでログインしてください。');
  } catch (error) {
    passwordTell(error instanceof Error ? error.message : '変更できませんでした。もう一度お試しください。', true);
  } finally {
    passwordForm.reset();
    hidePasswords(passwordForm);
    changingPassword = false;
    passwordButton.disabled = content.hidden;
    document.getElementById('logout').disabled = false;
  }
};
document.getElementById('logout').onclick = async () => { clearPasswordForm(); await api.client('teacher').auth.signOut(); await status(); tell('ログアウトしました。'); };
if (api.configured()) status().catch(error => tell(error.message));
else { form.querySelector('.button').disabled = true; tell('この版は接続設定を準備中です。今の公開版は引き続き使えます。'); }
