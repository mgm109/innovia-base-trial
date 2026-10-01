const api = window.Innovia;
const message = document.getElementById('message');
const form = document.getElementById('login');
const content = document.getElementById('teacher-content');
const passwordForm = document.getElementById('password-change');
const passwordPanel = document.getElementById('password-settings');
const passwordMessage = document.getElementById('password-message');
const passwordButton = document.getElementById('change-password-button');
let changingPassword = false;
let visibilityBusy = false;
let catalogueRequest = 0;
let catalogueSignature = '';
async function setMaterialVisibility(id,next) {
  if(visibilityBusy)return;
  visibilityBusy=true;await loadTeacherMaterials();
  try{await InnoviaCatalog.api('visibility',{id,visible:next},true);await status();tell(next?'生徒の教材一覧に公開しました。':'生徒の教材一覧を非公開にしました。');}
  catch(error){tell(error.message);}
  finally{visibilityBusy=false;await loadTeacherMaterials();}
}
async function loadTeacherMaterials() {
  const request = ++catalogueRequest;
  try {
    const [drafts,published]=await Promise.all([InnoviaCatalog.api('preview',{},true),InnoviaCatalog.api('list',{},true)]);
    if(request!==catalogueRequest)return;
    if(!InnoviaCatalog.valid(drafts)||!InnoviaCatalog.valid(published))throw Error('教材一覧を読み込めませんでした。');
    const publishedItems=new Map(published.materials.map(item=>[item.id,item]));
    const items=drafts.materials.map(item=>publishedItems.get(item.id)||item);
    const signature=JSON.stringify([items,visibilityBusy]);
    if(signature===catalogueSignature)return;
    const grid=document.getElementById('teacher-materials');
    const cards=items.map(teacherCard);
    grid.replaceChildren(...cards);
    document.getElementById('teacher-material-count').textContent=String(items.length)+'つの教材';
    catalogueSignature=signature;
  } catch(error){tell(error.message);}
}
function teacherCard(item) {
  const C=InnoviaCatalog,entry=document.createElement('article');entry.className='teacher-entry';entry.dataset.material=item.id;
  const card=C.card(item,true),action=card.querySelector('.tile-action');
  if(['binary','logic'].includes(item.id)){
    card.href=new URL('battle/host/?course='+item.id,api.root).href;
    action.textContent='先生のホスト画面を開く →';
  }else if(!item.builtin&&item.material.kind==='link'){
    card.href=C.safeUrl(item.material.href);
    action.textContent='教材を試す →';
  }else action.textContent=item.id==='simulator'?'シミュレータを開く →':'教材を試す →';
  entry.append(card);
  const controls=document.createElement('div');controls.className='teacher-card-controls';
  const state=document.createElement('span');state.className='teacher-publication '+(!item.published?'is-draft':item.visible===false?'is-hidden':'is-public');
  state.textContent=!item.published?'試作・先生のみ':item.visible===false?'生徒用は非公開':'生徒用に公開中';
  const actions=document.createElement('div');actions.className='actions';
  if(item.published){
    const button=document.createElement('button');button.type='button';button.className='ghost';
    button.textContent=item.visible===false?'公開する':'非公開にする';
    button.setAttribute('aria-label',item.material.title+(item.visible===false?'を公開する':'を非公開にする'));
    button.disabled=visibilityBusy;button.onclick=()=>setMaterialVisibility(item.id,item.visible===false);actions.append(button);
  }else{
    const publish=document.createElement('a');publish.className='ghost';publish.href='prototype/';publish.textContent='確認して生徒用に追加';actions.append(publish);
  }
  if(['binary','logic'].includes(item.id)){const student=document.createElement('a');student.className='teacher-student-link';student.href=C.studentUrl(item);student.textContent='生徒入口';actions.append(student);}
  controls.append(state,actions);entry.append(controls);return entry;
}
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
  content.hidden = !state.teacher;
  form.hidden = state.teacher;
  passwordButton.disabled = !state.teacher || changingPassword;
  if (!state.teacher) clearPasswordForm();
  if (state.teacher) await loadTeacherMaterials();
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

window.addEventListener("pageshow",()=>{if(!content.hidden)loadTeacherMaterials();});
setInterval(()=>{if(!content.hidden&&!document.hidden&&!changingPassword&&!visibilityBusy)loadTeacherMaterials();},15000);
