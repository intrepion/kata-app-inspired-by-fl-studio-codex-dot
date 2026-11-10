export const STEPS = 16;
export const TRACKS = [
  {id:'kick',name:'Kick',detail:'Round / deep',color:'#f5bd69',symbol:'◉'},
  {id:'snare',name:'Snare',detail:'Dry / crisp',color:'#e78a76',symbol:'▤'},
  {id:'hat',name:'Closed hat',detail:'Tight / bright',color:'#a4c6a1',symbol:'✳'},
  {id:'clap',name:'Clap',detail:'Wide / dusty',color:'#80b9d7',symbol:'≋'},
];
export function createProject(preset='midnight') {
  const project={format:'pulse-foundry',version:1,title:preset==='blank'?'Untitled loop':preset==='house'?'Electric avenue':'Midnight circuit',bpm:preset==='house'?124:96,master:0.7,steps:Array.from({length:4},()=>Array(16).fill(false)),levels:[0.8,0.65,0.45,0.45],mutes:Array(4).fill(false)};
  if(preset==='blank')return project;
  const rows=preset==='house'?[[0,4,8,12],[4,12],[2,6,10,14],[4,12]]:[[0,6,8,10],[4,12],[0,2,4,6,8,10,12,14],[12]];
  rows.forEach((steps,row)=>steps.forEach(step=>project.steps[row][step]=true));
  return project;
}
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
export function validateProject(data) {
  const fail=()=>{throw new Error('This is not a valid Pulse Foundry project.');};
  if(!data||typeof data!=='object'||data.format!=='pulse-foundry'||data.version!==1)fail();
  if(typeof data.title!=='string'||data.title.length>80||!data.title.trim())fail();
  if(!finite(data.bpm,60,180)||!finite(data.master,0,1))fail();
  if(!Array.isArray(data.steps)||data.steps.length!==4||!Array.from(data.steps).every(r=>Array.isArray(r)&&r.length===16&&Array.from(r).every(v=>typeof v==='boolean')))fail();
  if(!Array.isArray(data.levels)||data.levels.length!==4||!Array.from(data.levels).every(n=>finite(n,0,1)))fail();
  if(!Array.isArray(data.mutes)||data.mutes.length!==4||!Array.from(data.mutes).every(v=>typeof v==='boolean'))fail();
  return {format:'pulse-foundry',version:1,title:data.title,bpm:data.bpm,master:data.master,steps:data.steps.map(r=>r.slice()),levels:data.levels.slice(),mutes:data.mutes.slice()};
}
export function stepSeconds(bpm){return 60/bpm/4;}
export function eventsAt(project,step){return TRACKS.flatMap((track,i)=>project.steps[i][step]&&!project.mutes[i]?[{track:i,key:track.id}]:[]);}
export function loopEvents(project){const events=[];for(let step=0;step<16;step++)events.push(...eventsAt(project,step).map(e=>({...e,time:step*stepSeconds(project.bpm)})));return {events,duration:60/project.bpm*4};}
