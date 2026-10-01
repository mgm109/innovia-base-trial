(() => {
  const root = window.Innovia.root;
  const api = (action='list',payload={},teacher=false) => Innovia.rpc('innovia_catalog',{p_action:action,p_payload:payload},teacher?'teacher':'student');
  function safeUrl(value) {
    const url = new URL(value,root);
    if (url.protocol !== 'https:' && !(url.origin === location.origin && ['http:','https:'].includes(url.protocol))) throw Error('リンク先を確認してください。');
    return url.href;
  }
  function studentUrl(item,preview=false) {
    if(item.builtin) return safeUrl(item.material.href+(preview&&item.id==='network'?'?preview=1':''));
    return new URL('practice/?id='+encodeURIComponent(item.id)+(preview?'&preview=1':''),root).href;
  }
  function card(item,preview=false) {
    const doc=item.material;
    const link=document.createElement('a'); link.className='learning-tile tile-'+(item.builtin?(item.id==='logic'?'battle':item.id):'practice'); link.dataset.material=item.id;
    link.href=studentUrl(item,preview);
    const head=document.createElement('div'); head.className='tile-head';
    const icon=document.createElement('span'); icon.className='tile-icon'; icon.textContent=doc.icon; icon.setAttribute('aria-hidden','true');
    const category=document.createElement('span'); category.className='tile-category';category.textContent=doc.category;head.append(icon,category);
    const title=document.createElement('h3');title.textContent=doc.title;
    const text=document.createElement('p');text.textContent=doc.description;
    const action=document.createElement('span');action.className='tile-action';action.textContent=preview?'試してみる →':({binary:'PINを入力して参加',logic:'PINを入力して参加',simulator:'シミュレータを開く',network:'教材を開く'}[item.id]||'教材を開く →');
    link.append(head,title,text);
    const badges={binary:['6問','みんなで対戦'],logic:['5問','みんなで対戦'],simulator:['回路を組み立てる','真理値表で確かめる'],network:['3問','ひとりで考える']}[item.id];
    if(badges){const meta=document.createElement('div');meta.className='tile-meta';for(const badge of badges){const span=document.createElement('span');span.textContent=badge;meta.append(span);}link.append(meta);}
    link.append(action);return link;
  }
  function valid(data) { return data && Array.isArray(data.materials) && data.materials.length>0 && data.materials.every(item=>item && item.id && item.material?.title); }
  async function teacherGuard() {
    const state=await Innovia.rpc('innovia_settings',{},'teacher');
    if(!state.teacher) { document.getElementById('guard-message').textContent='先生用画面でログインしてください。'; return false; }
    document.getElementById('workspace').hidden=false;document.getElementById('guard-message').textContent='';return true;
  }
  window.InnoviaCatalog={api,safeUrl,studentUrl,card,valid,teacherGuard};
})();
