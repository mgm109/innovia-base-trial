const C=InnoviaCatalog, list=document.getElementById('catalog-order-list'),note=document.getElementById('catalog-order-message');
const save=document.getElementById('save-catalog-order'),reset=document.getElementById('reset-catalog-order');
let data,order=[],saved=[],busy=false;
function render(focusId) {
  list.replaceChildren();const dirty=JSON.stringify(order)!==JSON.stringify(saved);save.disabled=busy||!dirty;reset.disabled=busy||!dirty;save.textContent=busy?'保存しています…':'順番を保存';
  order.forEach((id,index)=>{
    const item=data.materials.find(item=>item.id===id),row=document.createElement('li');row.className='catalog-order-row';
    const title=document.createElement('div');title.className='catalog-order-title';title.tabIndex=-1;
    const number=document.createElement('span');number.className='catalog-order-number';number.textContent=String(index+1);
    const name=document.createElement('strong');name.textContent=item.material.title;
    if(!item.published||item.visible===false||(id==='network'&&!data.networkVisible)){const sub=document.createElement('span');sub.className='catalog-order-unpublished';sub.textContent=item.published?'非公開':'試作（生徒の一覧には出ません）';name.append(sub);}
    title.append(number,name);const controls=document.createElement('div');controls.className='catalog-order-buttons';
    for(const [delta,label] of [[-1,'↑ 上へ'],[1,'↓ 下へ']]){const button=document.createElement('button');button.type='button';button.className='ghost';button.textContent=label;button.setAttribute('aria-label',item.material.title+(delta<0?'を上へ':'を下へ'));button.disabled=busy||index+delta<0||index+delta>=order.length;button.onclick=()=>{[order[index],order[index+delta]]=[order[index+delta],order[index]];note.textContent='変更した順番は「順番を保存」で反映されます。';render(id);};controls.append(button);}
    row.append(title,controls);list.append(row);if(focusId===id)title.focus();
  });
}
save.onclick=async()=>{if(save.disabled)return;busy=true;render();note.textContent='保存しています…';try{const result=await C.api('order',{order},true);if(!C.valid(result))throw Error('保存結果を確認できません。');saved=[...order];note.textContent='保存しました。先生用と生徒用の一覧を同じ順番に更新します。';note.classList.remove('error');}catch(error){note.textContent=error.message;note.classList.add('error');}finally{busy=false;render();}};
reset.onclick=()=>{order=[...saved];note.textContent='保存した順番に戻しました。';render();};
(async()=>{try{if(!await C.teacherGuard())return;data=await C.api('preview',{},true);if(!C.valid(data))throw Error('教材の順番を読み込めませんでした。');order=[...data.order];saved=[...order];render();}catch(error){document.getElementById('guard-message').textContent=error.message;}})();
