import {loopEvents} from './model.js';
export const SAMPLE_RATE=44100;
export const TAIL_SECONDS=0.6;
const cache=new Map();
function noiseGenerator(seed){return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return ((seed>>>0)/4294967296)*2-1;};}
export function synthesize(key,sampleRate=SAMPLE_RATE){
  const cacheKey=`${key}@${sampleRate}`;if(cache.has(cacheKey))return cache.get(cacheKey);
  const length=key==='kick'?0.55:0.3,samples=new Float32Array(Math.ceil(sampleRate*length));
  let phase=0,filtered=0,previous=0;const random=noiseGenerator(17891+key.split('').reduce((a,c)=>a+c.charCodeAt(0),0));
  for(let i=0;i<samples.length;i++){
    const t=i/sampleRate,n=random();let s=0;
    if(key==='kick'){phase+=2*Math.PI*(44+110*Math.exp(-t*35))/sampleRate;s=Math.sin(phase)*Math.exp(-t*10)*0.8+n*Math.exp(-t*180)*0.12;}
    else if(key==='snare'){filtered+=0.25*(n-filtered);s=(n-filtered)*Math.exp(-t*23)*0.42+Math.sin(2*Math.PI*185*t)*Math.exp(-t*28)*0.25;}
    else if(key==='hat'){const high=n-previous;previous=n;s=high*Math.exp(-t*65)*0.16;}
    else if(key==='clap'){filtered+=0.3*(n-filtered);const burst=[0,0.012,0.024].reduce((a,o)=>a+(t>=o?Math.exp(-(t-o)*50):0),0);s=(n-filtered)*burst*0.21;}
    samples[i]=s*Math.min(1,(samples.length-i)/80);
  }
  cache.set(cacheKey,samples);return samples;
}
export function renderProject(project,sampleRate=SAMPLE_RATE){
  const {events,duration}=loopEvents(project),length=Math.ceil((duration+TAIL_SECONDS)*sampleRate),mono=new Float32Array(length);
  for(const event of events){const source=synthesize(event.key,sampleRate),start=Math.round(event.time*sampleRate),level=project.levels[event.track];for(let i=0;i<source.length&&start+i<length;i++)mono[start+i]+=source[i]*level;}
  for(let i=0;i<length;i++)mono[i]=Math.tanh(Math.max(-4,Math.min(4,mono[i]*project.master)));
  return {left:mono,right:mono,sampleRate,duration:duration+TAIL_SECONDS};
}
export function encodeWav({left,right,sampleRate}){
  const buffer=new ArrayBuffer(44+left.length*4),view=new DataView(buffer);const str=(o,s)=>[...s].forEach((c,i)=>view.setUint8(o+i,c.charCodeAt(0)));
  str(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,left.length*4,true);
  for(let i=0;i<left.length;i++)for(let c=0;c<2;c++){const v=Math.max(-1,Math.min(1,c?right[i]:left[i]));view.setInt16(44+i*4+c*2,Math.round(v*(v<0?32768:32767)),true);}
  return buffer;
}
