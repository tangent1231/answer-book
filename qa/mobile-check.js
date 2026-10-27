(function(){
'use strict';
document.fonts.ready.then(function(){
 var failures=[],minFont=Infinity, total=0;
 window.ORACLE_ANSWERS.forEach(function(answer){
  ['zh','en'].forEach(function(lang){
   var holder=document.createElement('section');holder.className='sample';holder.lang=lang;
   holder.innerHTML='<article class="answer-page paper"><div class="answer-content"><p class="answer-text"></p></div></article>';
   var text=holder.querySelector('.answer-text'),page=holder.querySelector('.answer-page'),content=holder.querySelector('.answer-content');
   var value=answer[lang];text.textContent=value;
   text.className='answer-text'+(lang==='en'?' english':'')+((lang==='zh'?value.length>18:value.length>65)?' long':'');
   document.getElementById('samples').appendChild(holder);
   window.OracleTypography.fit(text,page);
   var r=text.getBoundingClientRect(),p=page.getBoundingClientRect();
   var size=parseFloat(getComputedStyle(text).fontSize);minFont=Math.min(size,minFont);total++;
   if(size<22||r.left<p.left||r.right>p.right||r.top<p.top+32||r.bottom>p.bottom-32||text.scrollWidth>text.clientWidth+1) failures.push({id:answer.id,lang:lang,size:size,text:value});
  });
 });
 document.getElementById('summary').textContent=JSON.stringify({viewport:[innerWidth,innerHeight],cases:total,minFont:minFont,failures:failures},null,2);
});
}());
