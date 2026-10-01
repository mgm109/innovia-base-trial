// Each page embeds the browser-rendered diagram, preserving Japanese text.
export function imagePdf(images,width=595.28,height=841.89){
 const encoder=new TextEncoder(),pieces=[],offsets=[0];let length=0;
 const append=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;pieces.push(bytes);length+=bytes.length;};
 function object(id,value){offsets[id]=length;append(`${id} 0 obj\n`);append(value);append('\nendobj\n');}
 append('%PDF-1.4\n%INNOVIA\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,`<< /Type /Pages /Count ${images.length} /Kids [${images.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
 images.forEach((image,i)=>{const page=3+i*3,content=page+1,picture=page+2,stream=`q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;object(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 ${picture} 0 R >> >> /Contents ${content} 0 R >>`);object(content,`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`);offsets[picture]=length;append(`${picture} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);append(image.bytes);append('\nendstream\nendobj\n');});
 const xref=length;append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);for(let i=1;i<offsets.length;i++)append(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);const result=new Uint8Array(length);let position=0;for(const piece of pieces){result.set(piece,position);position+=piece.length;}return result;
}
export async function exportPdf(svgDiagram,title){
 await document.fonts.ready;const {svg,width,height}=svgDiagram,url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));const image=new Image();
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('図をPDFに変換できませんでした。'));image.src=url;});const margin=32,top=72,bottom=42;
 const portraitFit=Math.min(531.28/width,727.89/height),landscapeFit=Math.min(777.89/width,481.28/height),landscape=landscapeFit>portraitFit;
 let pageW=landscape?841.89:595.28,pageH=landscape?595.28:841.89;
 let scale=Math.min((pageW-margin*2)/width,1.15);if(Math.max(portraitFit,landscapeFit)>=.6)scale=Math.min(scale,Math.max(portraitFit,landscapeFit));
 if(scale<.6){pageW=Math.max(pageW,width*.6+margin*2);pageH=Math.max(pageH,841.89);scale=.6;}
 const slice=(pageH-top-bottom)/scale,sections=[],contentHeight=svgDiagram.contentHeight||height,bounds=svgDiagram.bounds||svgDiagram.nodes||[];let cursor=0;
 while(cursor<contentHeight-.01){let cut=Math.min(contentHeight,cursor+slice);if(cut<contentHeight){for(let tries=0;tries<20;tries++){const cross=bounds.filter(n=>n.y<cut+8&&n.y+n.h>cut-8);const labels=(svgDiagram.labels||[]).filter(n=>n.y-15<cut+8&&n.y+5>cut-8);const safe=Math.min(cut,...cross.map(n=>n.y-12),...labels.map(n=>n.y-27));if(safe===cut||safe<cursor+slice*.35)break;cut=safe;}}sections.push({y:cursor,h:cut-cursor});cursor=cut;}
 const pages=sections.length,images=[];
 for(let p=0;p<pages;p++){const canvas=document.createElement('canvas'),resolution=2.5;canvas.width=Math.round(pageW*resolution);canvas.height=Math.round(pageH*resolution);const ctx=canvas.getContext('2d');if(!ctx)throw Error('PDF保存に対応したブラウザーで開いてください。');ctx.scale(resolution,resolution);ctx.fillStyle='white';ctx.fillRect(0,0,pageW,pageH);ctx.fillStyle='#25354a';ctx.font='bold 17px Arial,"Yu Gothic",Meiryo,sans-serif';const truncated=title.length>30?title.slice(0,30)+'…':title;ctx.fillText(truncated,margin,35);ctx.font='10px Arial,"Yu Gothic",Meiryo,sans-serif';ctx.fillStyle='#64748b';ctx.fillText('INNOVIA Base ｜ フローチャート',margin,53);const sourceY=sections[p].y,sourceH=sections[p].h,drawW=width*scale;ctx.drawImage(image,0,sourceY,width,sourceH,(pageW-drawW)/2,top,drawW,sourceH*scale);ctx.fillText(`${p+1} / ${pages}`,pageW-margin-30,pageH-20);if(p<pages-1)ctx.fillText('次のページへ続く ↓',margin,pageH-20);const encoded=canvas.toDataURL('image/jpeg',0.96).split(',')[1],raw=atob(encoded);images.push({width:canvas.width,height:canvas.height,bytes:Uint8Array.from(raw,c=>c.charCodeAt(0))});}
 return {bytes:imagePdf(images,pageW,pageH),pages};
 }finally{URL.revokeObjectURL(url);}
}
