(() => {
  function attach(entry, item, onSaved) {
    const panel=document.createElement('details');panel.className='catalog-display-editor';
    const summary=document.createElement('summary');summary.textContent='カードの表示を編集';
    const form=document.createElement('form');
    const note=document.createElement('p');note.className='small-note';note.textContent=item.published?'保存すると、先生用と生徒用の教材カードに反映されます。':'試作カードの表示を保存します。生徒への公開は別の操作です。';
    const fields=document.createElement('fieldset');
    const inputs={};
    for(const [key,label,limit] of [['icon','アイコン（絵文字など）',20],['title','教材名',80],['category','カテゴリ名',40],['description','説明',300]]) {
      const wrap=document.createElement('label');wrap.className='input-label';wrap.append(document.createTextNode(label));
      const input=document.createElement(key==='description'?'textarea':'input');input.className='input';input.name=key;input.maxLength=limit;input.value=item.material[key]||'';
      if(key==='description')input.rows=3;else {input.type='text';input.required=true;}
      wrap.append(input);fields.append(wrap);inputs[key]=input;
    }
    const actions=document.createElement('div');actions.className='actions';
    const save=document.createElement('button');save.type='submit';save.className='button';save.textContent='表示を保存';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='ghost';cancel.textContent='取消';
    const message=document.createElement('p');message.className='inline-message';message.setAttribute('role','status');
    let busy=false;
    cancel.onclick=()=>{for(const key of Object.keys(inputs))inputs[key].value=item.material[key]||'';message.textContent='';panel.open=false;};
    form.onsubmit=async event=>{
      event.preventDefault();if(busy)return;
      const payload={id:item.id};for(const [key,input] of Object.entries(inputs))payload[key]=input.value.trim();
      if(!payload.icon||!payload.title||!payload.category){message.textContent='アイコン・教材名・カテゴリ名を入力してください。';return;}
      busy=true;fields.disabled=true;message.textContent='保存しています…';
      try{await InnoviaCatalog.api('display',payload,true);for(const key of Object.keys(inputs))item.material[key]=payload[key];panel.open=false;await onSaved();}
      catch(error){message.textContent=error.message||'保存できませんでした。入力は残っています。';}
      finally{busy=false;fields.disabled=false;}
    };
    actions.append(save,cancel);fields.append(actions);form.append(note,fields,message);panel.append(summary,form);entry.append(panel);
  }
  window.InnoviaCardEditor={attach,editing:()=>!!document.querySelector('.catalog-display-editor[open],.catalog-display-editor fieldset:disabled')};
})();
