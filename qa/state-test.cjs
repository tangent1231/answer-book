// Execute the production scripts against a minimal DOM to exercise state and storage.
// Visual layout is checked separately in the browser.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
const root = path.resolve(__dirname, '../dist');
const source = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');
const data = fs.readFileSync(path.join(root, 'assets/answers.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function harness(storage, denied, platform) {
  const timers = new Map(); let seq = 0;
  function element() {
    const events = {}, attrs = {}, classes = new Set();
    return {events, attrs, style:{setProperty(k,v){this[k]=v;}}, classList:{add(x){classes.add(x);},remove(x){classes.delete(x);},toggle(x,v){v ? classes.add(x):classes.delete(x);}}, hidden:false,disabled:false,clientHeight:360,offsetHeight:60,textContent:'',checked:false,
      setAttribute(k,v){attrs[k]=v;},getAttribute(k){return attrs[k];},appendChild(){},focus(){},addEventListener(k,fn){events[k]=fn;},click(){if(!this.disabled && events.click) events.click.call(this,{target:this});}};
  }
  const ids = {};
  for (const m of html.matchAll(/id="([^"]+)"/g)) ids[m[1]]=element();
  const doc={getElementById:k=>ids[k],querySelectorAll:()=>[],documentElement:element(),body:element(),createElement:element,createTextNode:x=>x,hidden:false,events:{},addEventListener(k,fn){this.events[k]=fn;}};
  const context={document:doc,console,Math,Promise,Number,String,Object,Array,JSON,
    localStorage:{getItem(k){if(denied)throw Error('denied');return storage[k]||null;},setItem(k,v){if(denied)throw Error('denied');storage[k]=v;}},
    setTimeout(fn){const id=++seq;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
  context.xhs=platform;context.window=context;context.innerHeight=844;context.addEventListener=()=>{};context.matchMedia=()=>({matches:false});context.getComputedStyle=()=>({fontSize:'24'});
  vm.createContext(context);vm.runInContext(data,context);vm.runInContext(fs.readFileSync(path.join(root,'assets/typography.js'),'utf8'),context);vm.runInContext(source,context);
  return {ids,doc,context,flush(){const work=[...timers.values()];timers.clear();work.forEach(f=>f());},state(){return ids.app.attrs['data-state']||'closed';}};
}
async function settle(){await new Promise(resolve=>setImmediate(resolve));}
(async()=>{
  const storage={}, h=harness(storage);
  assert.equal(h.context.ORACLE_ANSWERS.length,500);
  for(const field of ['id','zh','en'])assert.equal(new Set(h.context.ORACLE_ANSWERS.map(a=>a[field])).size,500);
  const pages=[];
  for(let n=0;n<501;n++){
    h.ids.coverButton.click(); h.ids.coverButton.click(); h.ids.coverButton.click();
    assert.equal(h.state(),'opening');h.flush();assert.equal(h.state(),'revealed');
    const page=h.ids.answerPage.attrs['data-answer-id'];pages.push(page);
    const answer=h.ids.answerText.textContent;
    h.ids.enButton.click();assert.equal(h.ids.answerPage.attrs['data-answer-id'],page);assert.notEqual(h.ids.answerText.textContent,answer);
    h.ids.zhButton.click();assert.equal(h.ids.answerText.textContent,answer);
    h.ids.againButton.click();h.flush();assert.equal(h.state(),'closed');
  }
  assert.equal(new Set(pages.slice(0,500)).size,500);assert.notEqual(pages[499],pages[500]);
  await settle();
  h.ids.enButton.click();await settle();
  const saved=JSON.parse(storage['midnight-answer-book-v1']);assert.equal(saved.language,'en');assert.equal(saved.bag.length,499);
  const restored=harness(storage);assert.equal(restored.doc.documentElement.lang,'en');
  restored.ids.coverButton.click();restored.flush();assert.notEqual(restored.ids.answerPage.attrs['data-answer-id'],pages[500]);await settle();
  assert.equal(JSON.parse(storage['midnight-answer-book-v1']).bag.length,498);
  const interrupted=harness({});interrupted.ids.coverButton.click();interrupted.doc.hidden=true;interrupted.doc.events.visibilitychange();assert.equal(interrupted.state(),'revealed');
  const corrupt=harness({'midnight-answer-book-v1':'{broken'});corrupt.ids.coverButton.click();corrupt.flush();assert.equal(corrupt.state(),'revealed');
  const denied=harness({},true);denied.ids.coverButton.click();denied.flush();assert.equal(denied.state(),'revealed');await settle();
  const nativeCalls=[];
  const platform={launchOptions:{miniToolEnv:{}},miniTool:{
    getLaunchOptions(){nativeCalls.push('launch');return Promise.resolve({miniToolEnv:{buildVersion:9500000}});},
    getStorage(){nativeCalls.push('read');return Promise.resolve({data:null});},
    setStorage(value){assert.equal(typeof value.data,'string');JSON.parse(value.data);nativeCalls.push('write');return Promise.resolve({});},
    getWindowInfo(){return Promise.resolve({windowHeight:844,safeArea:{top:20,bottom:810},menuButtons:{back:{bottom:60},me:null,share:null}});},
    vibrateShort(value){assert.equal(value.type,'light');nativeCalls.push('vibrate');return Promise.resolve({});}
  }};
  const native=harness({},false,platform);await settle();await settle();
  assert(nativeCalls.includes('launch'));assert(nativeCalls.includes('read'));
  assert.equal(native.doc.documentElement.style['--safe-top'],'68px');
  assert.equal(native.doc.documentElement.style['--safe-bottom'],'34px');
  native.ids.coverButton.click();native.flush();await settle();
  assert(nativeCalls.includes('write'));assert(nativeCalls.includes('vibrate'));
  assert.equal(native.state(),'revealed');
  console.log('PASS: native API mock checks for partial launch options, version gate, JSON storage, safe area/button avoidance, and vibration.');
  console.log('PASS: 500 unique bilingual answers; 501 draws with no in-cycle duplicates or cycle-boundary repeat; rapid-click lock; translation preserves ID; persisted language/deck survives reload; hidden-tab completion; corrupt and denied storage fallback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
