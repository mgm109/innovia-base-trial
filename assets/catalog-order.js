const C=InnoviaCatalog, list=document.getElementById('catalog-order-list'),note=document.getElementById('catalog-order-message');
const save=document.getElementById('save-catalog-order'),reset=document.getElementById('reset-catalog-order');
let data,order=[],saved=[],states={},savedStates={},busy=false;
const publicationState = (item,source=data) => !item.published?'draft':item.headingOnly&&item.visible!==false?'heading':(item.visible!==false&&(item.id!=='network'||source.networkVisible!==false)?'public':'private');
const labels={public:'公開',heading:'見出し',private:'非公開',draft:'試作中'};
function checked(result) {
  if(!C.valid(result)||!Array.isArray(result.order)||result.order.length!==result.materials.length||new Set(result.order).size!==result.order.length||result.order.some(id=>!result.materials.some(item=>item.id===id)))throw Error('教材の設定を確認できません。再読み込みしてください。');
  return result;
}
function remember(result) { data=checked(result);saved=[...data.order];savedStates=Object.fromEntries(data.materials.map(item=>[item.id,publicationState(item)])); }
function dirty() { return JSON.stringify(order)!==JSON.stringify(saved)||data.materials.some(item=>states[item.id]!==savedStates[item.id]); }
function tell(text,error=false) { note.textContent=text;note.classList.toggle('error',error); }
function render(focusId) {
  list.replaceChildren();const changed=dirty();save.disabled=busy||!changed;reset.disabled=busy||!changed;save.textContent=busy?'保存しています…':'保存';
  order.forEach((id,index)=>{
    const item=data.materials.find(item=>item.id===id),row=document.createElement('li');row.className='catalog-order-row';
    const title=document.createElement('div');title.className='catalog-order-title';title.tabIndex=-1;
    const number=document.createElement('span');number.className='catalog-order-number';number.textContent=String(index+1);
    const name=document.createElement('strong');name.textContent=item.material.title;
    const sub=document.createElement('span');sub.className='catalog-order-unpublished';sub.textContent=labels[states[id]];name.append(sub);
    title.append(number,name);const controls=document.createElement('div');controls.className='catalog-order-buttons';
    for(const [delta,label] of [[-1,'↑ 上へ'],[1,'↓ 下へ']]){const button=document.createElement('button');button.type='button';button.className='ghost';button.textContent=label;button.setAttribute('aria-label',item.material.title+(delta<0?'を上へ':'を下へ'));button.disabled=busy||index+delta<0||index+delta>=order.length;button.onclick=()=>{[order[index],order[index+delta]]=[order[index+delta],order[index]];tell('変更した順番と公開状態は、上の「保存」で反映されます。');render(id);};controls.append(button);}
    const choices=document.createElement('div');choices.className='catalog-visibility-buttons';choices.setAttribute('role','group');choices.setAttribute('aria-label',item.material.title+'の公開設定');
    for(const [value,label] of Object.entries(labels)){const button=document.createElement('button'),active=states[id]===value;button.type='button';button.className='ghost'+(active?' is-current':'');button.textContent=label;button.setAttribute('aria-label',item.material.title+'を'+label);button.setAttribute('aria-pressed',String(active));button.disabled=busy||active;button.onclick=()=>{states[id]=value;tell('公開状態を選びました。上の「保存」で反映されます。試作中から公開・非公開にすると、現在の試作内容を追加します。');render(id);};choices.append(button);}controls.append(choices);
    if(states[id]==='draft'){const link=document.createElement('a');link.href='../prototype/';link.className='catalog-prototype-link';link.textContent='試作を確認';title.append(link);}
    row.append(title,controls);list.append(row);if(focusId===id)title.focus();
  });
}
save.onclick=async()=>{
  if(save.disabled)return;busy=true;render();tell('保存しています…');
  const desiredOrder=[...order],desiredStates={...states};
  try {
    for(const item of data.materials)if(desiredStates[item.id]!==savedStates[item.id])await C.api('publication',{id:item.id,state:desiredStates[item.id],revision:item.revision},true);
    if(JSON.stringify(desiredOrder)!==JSON.stringify(saved))await C.api('order',{order:desiredOrder},true);
    const result=checked(await C.api('preview',{},true));
    if(JSON.stringify(result.order)!==JSON.stringify(desiredOrder)||result.materials.some(item=>desiredStates[item.id]!==publicationState(item,result)))throw Error('保存結果が選んだ設定と異なります。もう一度確認してください。');
    remember(result);order=[...saved];states={...savedStates};tell('保存しました。先生用・生徒用の並び順と、公開・見出し・非公開・試作中の状態を更新しました。');
  } catch(error) {
    let refreshed=false;
    try{const result=checked(await C.api('preview',{},true));remember(result);order=[...desiredOrder.filter(id=>saved.includes(id)),...saved.filter(id=>!desiredOrder.includes(id))];states=Object.fromEntries(data.materials.map(item=>[item.id,desiredStates[item.id]??savedStates[item.id]]));refreshed=true;}catch{}
    tell(error.message+(refreshed?' 保存状況を再確認しました。未保存の変更は画面に残しています。':' 一部の変更は保存されている可能性があります。接続が戻ったら、保存を再度押して確認してください。'),true);
  } finally {busy=false;render();}
};
reset.onclick=()=>{order=[...saved];states={...savedStates};tell('保存済みの順番と公開状態にリセットしました。');render();};
(async()=>{try{if(!await C.teacherGuard())return;remember(await C.api('preview',{},true));order=[...saved];states={...savedStates};render();}catch(error){document.getElementById('guard-message').textContent=error.message;}})();
