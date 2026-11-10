import {TRACKS,stepSeconds} from './model.js';
import {synthesize} from './synth.js';
export class AudioEngine{
  constructor(getProject,onStep,onStop){this.getProject=getProject;this.onStep=onStep;this.onStop=onStop;this.playing=false;this.sources=new Set();this.buffers=new Map();this.queue=[];this.generation=0;}
  async ready(){
    if(!this.context){
      const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error('Web Audio is not supported in this browser.');
      this.context=new C();this.master=this.context.createGain();this.clip=this.context.createWaveShaper();const curve=new Float32Array(65536);for(let i=0;i<curve.length;i++)curve[i]=Math.tanh((i*2/(curve.length-1)-1)*4);this.clip.curve=curve;this.master.connect(this.clip);this.clip.connect(this.context.destination);
      this.channels=Array.from({length:4},()=>{const gain=this.context.createGain();gain.connect(this.master);return gain;});
    }
    await this.context.resume();if(this.context.state!=='running')throw new Error('Audio is paused by your browser. Press Play again.');this.updateMix();
  }
  updateMix(){if(!this.context)return;const project=this.getProject(),now=this.context.currentTime;this.master.gain.setTargetAtTime(project.master/4,now,0.008);this.channels.forEach((gain,i)=>gain.gain.setTargetAtTime(project.mutes[i]?0:project.levels[i],now,0.008));}
  trigger(key,track,time){
    if(!this.buffers.has(key)){const data=synthesize(key,this.context.sampleRate),buffer=this.context.createBuffer(1,data.length,this.context.sampleRate);buffer.copyToChannel(data,0);this.buffers.set(key,buffer);}
    const source=this.context.createBufferSource();source.buffer=this.buffers.get(key);source.connect(this.channels[track]);source.onended=()=>{this.sources.delete(source);source.disconnect();};this.sources.add(source);source.start(time);
  }
  async preview(key,track){const generation=this.generation;await this.ready();if(generation!==this.generation)return;this.trigger(key,track,this.context.currentTime);}
  async play(){
    if(this.playing||this.starting)return;this.starting=true;const generation=++this.generation;
    try{await this.ready();if(generation!==this.generation)return;this.playing=true;this.step=0;this.nextTime=this.context.currentTime+0.04;this.queue=[];this.tick();this.timer=setInterval(()=>this.tick(),25);this.draw();}finally{this.starting=false;}
  }
  tick(){
    if(!this.playing)return;const project=this.getProject();
    if(this.nextTime<this.context.currentTime-0.2){this.stop();this.onStop?.('Playback paused after an audio interruption. Press Play to continue.');return;}
    while(this.nextTime<this.context.currentTime+0.12){
      // Schedule muted voices as well so live mute controls affect already queued notes.
      TRACKS.forEach((track,i)=>{if(project.steps[i][this.step])this.trigger(track.id,i,this.nextTime);});
      this.queue.push({time:this.nextTime,step:this.step});this.nextTime+=stepSeconds(project.bpm);this.step=(this.step+1)%16;
    }
  }
  draw(){if(!this.playing)return;let current;while(this.queue.length&&this.queue[0].time<=this.context.currentTime)current=this.queue.shift();if(current)this.onStep(current.step);this.frame=requestAnimationFrame(()=>this.draw());}
  stop(){this.generation++;this.playing=false;clearInterval(this.timer);cancelAnimationFrame(this.frame);for(const source of this.sources){try{source.stop();}catch{}source.disconnect();}this.sources.clear();this.queue=[];this.onStep(null);}
}
