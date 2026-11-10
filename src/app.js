import {TRACKS,createProject,validateProject} from './model.js';
import {renderProject,encodeWav} from './synth.js';
import {AudioEngine} from './audio.js';
const $=s=>document.querySelector(s),storageKey='kata-pulse-foundry-v1';
let project=createProject(),undoStack=[],redoStack=[],storageWarning='',currentStep=null;
try{const saved=localStorage.getItem(storageKey);if(saved)project=validateProject(JSON.parse(saved));}catch{storageWarning='Could not restore the saved loop. A starter loop is open; use Save project for a backup.';}
const clone=()=>structuredClone(project);
function status(message){$('#status').textContent=message;}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(project));$('#save-state').textContent='Saved on this device';}catch{$('#save-state').textContent='Save unavailable · export a backup';status('This browser cannot save locally. Use Save project to keep your loop.');}}
function remember(snapshot=clone()){undoStack.push(snapshot);if(undoStack.length>80)undoStack.shift();redoStack=[];}
function change(fn,message){remember();fn();render();persist();if(message)status(message);}
function drawStep(step){
  currentStep=step;document.querySelectorAll('.step').forEach(b=>b.classList.toggle('playhead',Number(b.dataset.step)===step));
  document.querySelectorAll('#mini-grid i').forEach((el,i)=>el.classList.toggle('active',i===step));
  const beat=step===null?1:Math.floor(step/4)+1,sub=step===null?1:step%4+1;
  $('#timecode').innerHTML=`${String(beat).padStart(2,'0')}<span>:</span>${String(sub).padStart(2,'0')}`;
  $('#timecode').setAttribute('aria-label',`Beat ${beat}, subdivision ${sub}`);
}
const audio=new AudioEngine(()=>project,drawStep,message=>{setPlaying(false);status(message);});
function setPlaying(playing){document.body.classList.toggle('is-playing',playing);$('#play').innerHTML=playing?'<span class="stop-symbol" aria-hidden="true"></span><b>Stop</b>':'<span class="play-symbol" aria-hidden="true"></span><b>Play</b>';$('#play').setAttribute('aria-label',playing?'Stop':'Play');$('#session-state').textContent=playing?'THE LOOP IS YOURS':'READY WHEN YOU ARE';}
function stop(message='Stopped. Back to step one.'){audio.stop();setPlaying(false);status(message);}
async function play(){if(audio.playing||audio.starting){stop();return;}try{await audio.play();setPlaying(audio.playing);if(audio.playing)status('Playing. Edit steps as the loop runs.');}catch(error){stop(error.message);}}
function buildGrid(){
  const grid=$('#drum-grid');const ruler=document.createElement('div');ruler.className='grid-ruler';ruler.innerHTML='<span>VOICE / LEVEL</span>'+Array.from({length:16},(_,s)=>`<span class="${s%4===0?'beat':''}">${String(s+1).padStart(2,'0')}</span>`).join('');grid.append(ruler);
  TRACKS.forEach((track,row)=>{
    const line=document.createElement('div');line.className='drum-row';line.style.setProperty('--voice',track.color);line.dataset.row=row;
    const label=document.createElement('div');label.className='voice-label';label.innerHTML=`<button class="voice-audition" data-audition="${row}" aria-label="Audition ${track.name}"><span aria-hidden="true">${track.symbol}</span><span><b>${track.name}</b><small>${track.detail}</small></span></button><button class="row-mute" data-mute="${row}" aria-label="Mute ${track.name}" aria-pressed="false">M</button><input class="voice-level" type="range" min="0" max="100" data-level="${row}" aria-label="${track.name} volume"><span class="voice-level-label">LEVEL</span>`;
    line.append(label);
    for(let step=0;step<16;step++){const button=document.createElement('button');button.className=`step ${Math.floor(step/4)%2?'group-alt':''}`;button.dataset.row=row;button.dataset.step=step;button.tabIndex=row===0&&step===0?0:-1;button.setAttribute('aria-pressed','false');line.append(button);}
    grid.append(line);
  });
  $('#mini-grid').innerHTML=Array.from({length:16},()=>'<i></i>').join('');
}
function render(){
  $('#project-title').value=project.title;$('#bpm').value=project.bpm;$('#master').value=Math.round(project.master*100);$('#master-value').value=`${Math.round(project.master*100)}%`;
  $('.loop-stats #hit-count').textContent=project.steps.flat().filter(Boolean).length;$('#loop-duration').innerHTML=`${(240/project.bpm).toFixed(2)}<span>s</span>`;
  document.querySelectorAll('.step').forEach(button=>{const row=Number(button.dataset.row),s=Number(button.dataset.step),on=project.steps[row][s];button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',`${TRACKS[row].name}, step ${s+1}, ${on?'on':'off'}`);});
  document.querySelectorAll('.drum-row').forEach((row,i)=>row.classList.toggle('muted',project.mutes[i]));
  document.querySelectorAll('[data-mute]').forEach(b=>{const i=Number(b.dataset.mute);b.classList.toggle('active',project.mutes[i]);b.setAttribute('aria-pressed',String(project.mutes[i]));b.setAttribute('aria-label',`${project.mutes[i]?'Unmute':'Mute'} ${TRACKS[i].name}`);});
  document.querySelectorAll('[data-level]').forEach(input=>input.value=Math.round(project.levels[Number(input.dataset.level)]*100));
  document.querySelectorAll('#mini-grid i').forEach((el,s)=>{const count=project.steps.filter((row,i)=>row[s]&&!project.mutes[i]).length;el.style.height=`${3+count*3}px`;el.style.opacity=count?'1':'.3';});
  $('#undo').disabled=!undoStack.length;$('#redo').disabled=!redoStack.length;audio.updateMix();
}
function moveFocus(button,row,step){document.querySelectorAll('.step').forEach(b=>b.tabIndex=-1);const next=$(`.step[data-row="${row}"][data-step="${step}"]`);next.tabIndex=0;next.focus();}
$('#drum-grid').addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.matches('.step')){const row=Number(button.dataset.row),step=Number(button.dataset.step);moveFocus(button,row,step);change(()=>project.steps[row][step]=!project.steps[row][step]);}
  if(button.hasAttribute('data-mute')){const i=Number(button.dataset.mute);change(()=>project.mutes[i]=!project.mutes[i],`${TRACKS[i].name} ${project.mutes[i]?'unmuted':'muted'}.`);}
  if(button.hasAttribute('data-audition')){const i=Number(button.dataset.audition);if(project.mutes[i]){status(`${TRACKS[i].name} is muted. Unmute it to audition.`);return;}try{await audio.preview(TRACKS[i].id,i);status(`${TRACKS[i].name} preview.`);}catch(error){status(error.message);}}
});
$('#drum-grid').addEventListener('keydown',event=>{if(!event.target.matches('.step'))return;let row=Number(event.target.dataset.row),step=Number(event.target.dataset.step);if(event.key==='ArrowRight')step=(step+1)%16;else if(event.key==='ArrowLeft')step=(step+15)%16;else if(event.key==='ArrowDown')row=(row+1)%4;else if(event.key==='ArrowUp')row=(row+3)%4;else if(event.key==='Home')step=0;else if(event.key==='End')step=15;else return;event.preventDefault();moveFocus(event.target,row,step);});
function bindRange(input,setValue){let before=null;input.addEventListener('input',()=>{if(!before)before=clone();setValue(Number(input.value));render();persist();});input.addEventListener('change',()=>{if(before){remember(before);before=null;render();}});}
$('#play').addEventListener('click',play);$('#stop').addEventListener('click',()=>stop());
$('#bpm').addEventListener('change',()=>{const value=Number($('#bpm').value);if(!Number.isFinite(value)||value<60||value>180){$('#bpm').value=project.bpm;status('Choose a tempo between 60 and 180 BPM.');return;}change(()=>project.bpm=Math.round(value),`Tempo set to ${Math.round(value)} BPM.`);});
$('#project-title').addEventListener('change',()=>{const value=$('#project-title').value.trim();if(!value){$('#project-title').value=project.title;return;}change(()=>project.title=value);});
$('#undo').addEventListener('click',()=>{if(!undoStack.length)return;redoStack.push(clone());project=undoStack.pop();render();persist();status('Undid the last change.');});
$('#redo').addEventListener('click',()=>{if(!redoStack.length)return;undoStack.push(clone());project=redoStack.pop();render();persist();status('Redid the change.');});
function confirmAction(title,message){const dialog=$('#confirm-dialog');if(dialog.open)return Promise.resolve(false);$('#confirm-title').textContent=title;$('#confirm-message').textContent=message;dialog.returnValue='cancel';return new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true});dialog.showModal();});}
$('#clear-pattern').addEventListener('click',async()=>{if(await confirmAction('Clear all the steps?','This clears the four rows. Your tempo and levels stay the same. You can undo the change.'))change(()=>project.steps.forEach(row=>row.fill(false)),'Steps cleared. A little space for a new idea.');});
async function loadPreset(name){if(!['midnight','house','blank'].includes(name))return;if(await confirmAction('Open a different loop?','The new loop will replace the one on screen. Save a project first to keep a backup, or use Undo afterward.')){stop();change(()=>project=createProject(name),'A fresh starting point is ready.');}}
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>loadPreset(button.dataset.preset)));
$('#mobile-presets').addEventListener('change',event=>{loadPreset(event.target.value);event.target.value='';});
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function filename(){return project.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'pulse-foundry-loop';}
function saveProject(){download(new Blob([JSON.stringify(project,null,2)+'\n'],{type:'application/json'}),`${filename()}.pulse.json`);status('Project download requested. Keep this file to edit the loop later.');}
$('#save-project').addEventListener('click',saveProject);$('#mobile-save').addEventListener('click',saveProject);
const openFile=()=>$('#project-file').click();$('#load-project').addEventListener('click',openFile);$('#mobile-open').addEventListener('click',openFile);
$('#project-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>100000)throw new Error('Project files must be smaller than 100 KB.');const next=validateProject(JSON.parse(await file.text()));if(await confirmAction('Open this project?',`Open “${next.title}” and replace the loop on screen? You can undo this change.`)){stop();change(()=>project=next,'Project opened. Your loop is ready.');}}catch(error){status(`Could not open project. ${error instanceof SyntaxError?'The file is not valid JSON.':error.message}`);}});
$('#export-wav').addEventListener('click',async()=>{const button=$('#export-wav');if(button.disabled)return;button.disabled=true;try{await new Promise(resolve=>setTimeout(resolve,20));const wav=encodeWav(renderProject(project));download(new Blob([wav],{type:'audio/wav'}),`${filename()}.wav`);status('WAV download requested: one bar plus a 0.6-second release tail, 44.1 kHz / 16-bit.');}catch(error){status(`Could not export audio: ${error.message}`);}finally{button.disabled=false;}});
$('#help').addEventListener('click',()=>{if(!$('#guide-dialog').open)$('#guide-dialog').showModal();});
document.addEventListener('keydown',event=>{if(document.querySelector('dialog[open]'))return;const editing=event.target.matches('input,select,textarea,[contenteditable]');if(!editing&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();$(event.shiftKey?'#redo':'#undo').click();return;}if(event.code==='Space'&&!editing&&!event.target.closest('button')){event.preventDefault();if(!event.repeat)play();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(audio.playing||audio.starting))stop('Playback paused while the tab is in the background. Press Play to continue.');});
window.addEventListener('pagehide',()=>audio.stop());
buildGrid();document.querySelectorAll('[data-level]').forEach(input=>bindRange(input,value=>project.levels[Number(input.dataset.level)]=value/100));bindRange($('#master'),value=>project.master=value/100);render();persist();if(storageWarning)status(storageWarning);
