const vm=require('vm'),fs=require('fs'),assert=require('assert'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../dist/assets/sound.js'),'utf8');
function setup(unsupported){
  const starts=[],stops=[],engines=[],timers=new Map();let seq=0;
  function param(){return {value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}};}
  function node(kind){return {kind,gain:param(),frequency:param(),delayTime:param(),playbackRate:param(),connect(){},disconnect(){},start(t){starts.push({kind,t});},stop(){stops.push(kind);}};}
  class Engine{
    constructor(){this.currentTime=0;this.sampleRate=22050;this.state='suspended';this.destination={};engines.push(this);}
    createGain(){return node('gain');} createBiquadFilter(){return node('filter');} createDelay(){return node('delay');}
    createOscillator(){return node('tone');}createBufferSource(){return node('paper');}
    createBuffer(c,n){return {getChannelData(){return new Float32Array(n);}};}
    resume(){this.state='running';if(this.onstatechange)this.onstatechange();return Promise.resolve();}
    suspend(){this.state='suspended';if(this.onstatechange)this.onstatechange();return Promise.resolve();}
  }
  const w={AudioContext:unsupported?undefined:Engine,Date,Math,Promise,setTimeout(f){const k=++seq;timers.set(k,f);return k;},clearTimeout(k){timers.delete(k);}};w.window=w;
  vm.createContext(w);vm.runInContext(source,w);return {api:w.OracleSound,starts,stops,engines,timers};
}
async function tick(){await Promise.resolve();await Promise.resolve();}
(async()=>{
  const h=setup();assert.equal(h.engines.length,0);let playing=false;
  h.api.configure(true,true,v=>playing=v);h.api.turn(false);await tick();
  assert(playing);assert.equal(h.engines.length,1);assert(h.starts.some(x=>x.kind==='tone'));
  const times=h.starts.filter(x=>x.kind==='paper').map(x=>x.t);
  assert.equal(times.length,4);[.04,.42,.57,.72].forEach((x,i)=>assert(Math.abs(x-times[i])<.05));
  h.api.configure(false,true);assert(!playing);assert.equal(h.timers.size,0);
  const before=h.starts.length;h.api.turn(true);await tick();
  assert.equal(h.starts.slice(before).filter(x=>x.kind==='paper').length,1);assert(!playing);
  h.api.configure(true,false);h.api.activate();await tick();assert(playing);
  const count=h.starts.filter(x=>x.kind==='paper').length;h.api.turn(false);await tick();assert.equal(h.starts.filter(x=>x.kind==='paper').length,count);
  h.api.visibility(true);assert.equal(h.engines[0].state,'suspended');assert(!playing);assert.equal(h.timers.size,0);
  h.api.visibility(false);await tick();assert(playing);
  h.api.configure(false,false);const last=h.starts.length;h.api.turn(false);await tick();assert.equal(h.starts.length,last);
  const unsupported=setup(true);unsupported.api.turn(false);unsupported.api.visibility(true);assert.equal(unsupported.engines.length,0);
  console.log('PASS: gesture-only audio creation, quiet score scheduling, 4 page rustles aligned to animation, 1 rustle in gentle mode, independent toggles, hidden-page suspension/resume, no audio when muted, unsupported API fallback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
