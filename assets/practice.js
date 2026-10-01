const C=InnoviaCatalog,params=new URL(location.href).searchParams,preview=params.get('preview')==='1',area=document.getElementById('practice-area');
let material,index=0,score=0,answered=false;
function render(){area.replaceChildren();answered=false;const q=material.questions[index];const progress=document.createElement('p');progress.className='practice-progress';progress.textContent=String(index+1)+' / '+String(material.questions.length)+'問';const title=document.createElement('h2');title.textContent=q.title;area.append(progress,title);const feedback=document.createElement('div');feedback.className='feedback';feedback.hidden=true;const next=document.createElement('button');next.className='button';next.textContent=index+1===material.questions.length?'結果を見る':'次の問題へ';next.hidden=true;q.choices.forEach((choice,n)=>{const button=document.createElement('button');button.className='choice';button.textContent=choice;button.onclick=()=>{if(answered)return;answered=true;const correct=n===q.correct;if(correct)score++;for(const [i,other] of [...area.querySelectorAll('.choice')].entries()){other.disabled=true;if(i===q.correct)other.classList.add('correct');if(i===n&&!correct)other.classList.add('wrong');}feedback.textContent=(correct?'正解！':'正解は「'+q.choices[q.correct]+'」です。')+(q.explain?' '+q.explain:'');feedback.hidden=false;next.hidden=false;};area.append(button);});next.onclick=()=>{index++;if(index<material.questions.length)render();else{area.replaceChildren();const result=document.createElement('h2');result.textContent=String(material.questions.length)+'問中 '+String(score)+'問正解';const again=document.createElement('button');again.className='button';again.textContent='もう一度練習する';again.onclick=()=>{index=0;score=0;render();};area.append(result,again);}};area.append(feedback,next);}
function showLinkMaterial() {
  const target=new URL(C.safeUrl(material.href)),flowchart=new URL('flowchart/',Innovia.root);
  if(target.origin===flowchart.origin&&target.pathname.replace(/\/$/,'')===flowchart.pathname.replace(/\/$/,'')){
    const frame=document.createElement('iframe');frame.className='inline-material';frame.title=material.title+'の作成画面';frame.src=target.href;frame.loading='eager';
    area.classList.add('inline-material-area');area.closest('.inner').classList.add('inline-material-page');
    let observer;
    frame.addEventListener('load',()=>{
      observer?.disconnect();const doc=frame.contentDocument;if(!doc)return;
      if(doc.getElementById('diagram'))doc.body.classList.add('embedded-flowchart');
      const resize=()=>{const height=Math.max(700,doc.documentElement.scrollHeight,doc.body.scrollHeight);if(frame.style.height!==height+'px')frame.style.height=height+'px';};
      resize();observer=new ResizeObserver(resize);observer.observe(doc.body);
    });
    area.replaceChildren(frame);
  }else{
    const link=document.createElement('a');link.className='button';link.href=target.href;link.textContent='教材を開く';area.replaceChildren(link);
  }
}
(async()=>{try{if(preview){const state=await Innovia.rpc('innovia_settings',{},'teacher');if(!state.teacher)throw Error('先生用画面でログインしてから試作を開いてください。');document.getElementById('preview-notice').hidden=false;}const result=await C.api('get',{id:params.get('id'),preview},preview);material=result.material;document.getElementById('practice-title').textContent=material.title;document.getElementById('practice-description').textContent=material.description;if(material.kind==='link')showLinkMaterial();else render();}catch(error){area.textContent=error.message;area.classList.add('error');}})();
