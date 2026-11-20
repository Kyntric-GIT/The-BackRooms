import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import JSZip from 'jszip';
import { level0Rects } from './level0Data';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<div id="backrooms-root">
  <div id="hud"><div class="brand">THE BACKROOMS <span id="level-name">LEVEL 0 — LOBBY</span></div><div class="hud-right"><span id="light-status">FLASHLIGHT: OFF [F]</span><span id="stamina">STAMINA <i><b></b></i></span></div></div>
  <div id="crosshair"></div><div id="vignette"></div>
  <div id="notice">Find a way out.</div>
  <div id="hotbar"><div class="slot selected"><small>1</small>Flashlight</div><div class="slot"><small>2</small>Key</div><div class="slot"><small>3</small>Note</div><div class="slot"><small>4</small>Empty</div><div class="slot"><small>5</small>Empty</div></div>
  <section id="menu" class="visible">
    <div class="menu-brand"><h1>THE<br><span>BACKROOMS</span></h1><p>YOU HAVE NO CLIPPED OUT OF REALITY</p></div>
    <div class="menu-social"><span>KG STUDIOS</span><i></i><span>SINGLE PLAYER</span></div>
    <div class="menu-board">
      <div class="menu-scratch"></div>
      <button id="start" class="menu-choice"><span>NEW GAME</span><b>›</b></button>
      <button id="continue" class="menu-choice"><span>CONTINUE</span><b>›</b></button>
      <div class="menu-separator"></div>
      <button id="open-settings" class="menu-choice"><span>SETTINGS</span><b>›</b></button>
    </div>
    <div class="menu-version">SINGLE PLAYER&nbsp;&nbsp; · &nbsp;&nbsp;THE COMPLEX</div>
  </section>
  <section id="pause" class="overlay"><div class="panel"><h2>PAUSED</h2><button id="resume">RESUME</button><button id="restart" class="secondary">RESTART LEVEL</button><button id="pause-settings" class="secondary">SETTINGS</button><button id="to-menu" class="secondary">MAIN MENU</button></div></section>
  <section id="inventory" class="overlay"><div class="panel"><h2>INVENTORY</h2><p>Collected items and discovered letters.</p><div id="items"><span>Flashlight</span><span>Empty slot</span><span>Empty slot</span></div><div id="letter-reader"><strong>LETTER / DOCUMENT</strong><p>Select a letter in your inventory to read it.</p></div><button id="close-inventory">CLOSE [I]</button></div></section>
  <section id="settings" class="overlay"><div class="panel settings-panel"><h2>SETTINGS</h2><p>Adjust your expedition.</p>
    <label class="setting-row">Mouse sensitivity <output id="sensitivity-value">1.0×</output><input id="sensitivity-setting" type="range" min="0.4" max="2.5" step="0.1" value="1"></label>
    <label class="setting-row">Field of view <output id="fov-value">75°</output><input id="fov-setting" type="range" min="60" max="100" step="1" value="75"></label>
    <label class="setting-row">Walking speed <output id="speed-value">3.5</output><input id="speed-setting" type="range" min="2" max="5.5" step="0.1" value="3.5"></label>
    <label class="setting-row">Graphics resolution <output id="quality-value">100%</output><input id="quality-setting" type="range" min="0.65" max="1" step="0.05" value="1"></label>
    <label class="setting-check"><input id="invert-y-setting" type="checkbox"> Invert mouse Y</label>
    <div class="keybinds"><h3>CONTROLS</h3><div class="keybind-row">Move forward <button data-bind="forward">W</button></div><div class="keybind-row">Move backward <button data-bind="backward">S</button></div><div class="keybind-row">Move left <button data-bind="left">A</button></div><div class="keybind-row">Move right <button data-bind="right">D</button></div><div class="keybind-row">Sprint <button data-bind="sprint">SHIFT</button></div><div class="keybind-row">Interact / hide <button data-bind="interact">E</button></div><div class="keybind-row">Flashlight <button data-bind="flashlight">F</button></div><div class="keybind-row">Inventory <button data-bind="inventory">I</button></div><p id="bind-status">Select a key to change it.</p></div><button id="reset-settings" class="secondary">RESET DEFAULTS</button><button id="close-settings">BACK</button>
  </div></section><div id="tutorial" class="overlay"><div class="panel"><h2>FIELD TRAINING</h2><p id="tutorial-content"></p><button id="tutorial-start">BEGIN EXPEDITION</button></div></div><div id="minimap-wrap"><div id="minimap-title">LOCAL AREA</div><canvas id="minimap" width="180" height="180"></canvas><div id="minimap-coords"></div></div><canvas id="debug-map" width="280" height="280"></canvas>
  <section id="level-complete" class="overlay"><div class="panel"><h2 id="complete-title">LEVEL COMPLETE</h2><p id="complete-text"></p><button id="next-level">CONTINUE</button></div></section>
  <input id="map-file" type="file" accept=".backrooms,.json,application/json" hidden/><button id="import-map">IMPORT MAP</button><div id="import-message"></div>
</div>`;

const game=document.querySelector<HTMLElement>('#backrooms-root')!;

/* Expanded single-player gameplay layer */
const gameplayStyle=document.createElement('style');
gameplayStyle.textContent=`
#objective-panel{position:absolute;z-index:3;top:92px;left:24px;max-width:280px;padding:12px 15px;background:rgba(18,16,11,.72);border:1px solid rgba(226,211,157,.35);color:#eee7cf;font:11px Inter,Arial,sans-serif;letter-spacing:.5px;pointer-events:none;backdrop-filter:blur(4px)}
#objective-panel strong{display:block;color:#e5d49c;font-size:9px;letter-spacing:2px;margin-bottom:7px}
#objective-text{line-height:1.6}
#interact-hint{position:absolute;z-index:3;left:50%;bottom:112px;transform:translateX(-50%);padding:8px 13px;background:#17150fd9;border:1px solid #d5c58b88;color:#f4edcf;font:10px Inter,Arial,sans-serif;letter-spacing:1px;opacity:0;transition:opacity .15s;pointer-events:none}
#inventory-list{display:grid;grid-template-columns:repeat(2,minmax(110px,1fr));gap:8px;margin:18px 0}
.inventory-item{padding:12px;border:1px solid #d5c58b55;background:#ffffff09;font-size:11px}
#level-toast{position:absolute;z-index:4;top:50%;left:50%;transform:translate(-50%,-50%);padding:18px 24px;background:#17150fee;border:1px solid #d5c58b88;color:#f4edcf;text-align:center;max-width:340px;display:none}
#level-toast.show{display:block}
#letter-reader{margin:12px 0 18px;padding:14px;background:#0c0b08;border:1px solid #d5c58b55;min-height:110px;color:#e9e0c7;text-align:left}#letter-reader strong{display:block;font-size:9px;letter-spacing:2px;color:#c8b77d;margin-bottom:9px}#letter-reader p{font-size:12px;line-height:1.8;white-space:pre-wrap}.inventory-item{width:100%;color:#eee7cf;text-align:left;cursor:pointer;font-family:inherit}.inventory-item:hover,.inventory-item.selected{background:#d5c58b25;border-color:#d5c58b}.settings-panel{max-height:85vh;overflow-y:auto}.setting-row{display:block;text-align:left;font-size:12px;margin:18px 0;color:#e8dfc2}.setting-row output{float:right;color:#d5c58b}.setting-row input{display:block;width:100%;margin-top:10px;accent-color:#c6b47a}.setting-check{display:flex;gap:10px;align-items:center;margin:18px 0;color:#e8dfc2;font-size:12px}.setting-check input{accent-color:#c6b47a}#open-settings{margin-top:12px}
@media(max-width:600px){#objective-panel{top:76px;left:10px;max-width:210px;font-size:10px}#interact-hint{bottom:100px}}

#esp-overlay{position:absolute;inset:0;z-index:8;pointer-events:none;overflow:hidden;display:none}.esp-marker{position:absolute;transform:translate(-50%,-50%);padding:4px 7px 4px 5px;border:1px solid var(--esp-color);border-radius:3px;background:rgba(8,10,8,.78);color:#fff;font:700 10px/1.2 Arial,sans-serif;letter-spacing:.7px;white-space:nowrap;text-shadow:0 1px 3px #000;box-shadow:0 0 8px color-mix(in srgb,var(--esp-color) 55%,transparent),inset 0 0 7px color-mix(in srgb,var(--esp-color) 20%,transparent)}.esp-marker:before{content:'';display:inline-block;width:6px;height:6px;margin:0 6px 1px 0;border-radius:50%;background:var(--esp-color);box-shadow:0 0 7px var(--esp-color)}.esp-marker.monster{font-size:11px;padding:5px 8px}.esp-marker.exit{font-size:11px}
`;
document.head.appendChild(gameplayStyle);
const espOverlay=document.createElement('div');espOverlay.id='esp-overlay';espOverlay.setAttribute('aria-hidden','true');game.appendChild(espOverlay);
const espMarkers=new Map<string,HTMLDivElement>();
const objectivePanel=document.createElement('div');objectivePanel.id='objective-panel';objectivePanel.innerHTML='<strong>CURRENT OBJECTIVE</strong><div id="objective-text">Explore the area.</div>';game.appendChild(objectivePanel);
const interactHint=document.createElement('div');interactHint.id='interact-hint';game.appendChild(interactHint);
const inventoryList=document.createElement('div');inventoryList.id='inventory-list';document.querySelector('#items')?.replaceWith(inventoryList);
const interactables:{kind:string;label:string;object:THREE.Group;active:boolean}[]=[];
const collectedItems=new Set<string>();
const noteContents:Record<string,string>={};
let selectedInventoryItem='';
let mouseSensitivity=1,fieldOfView=75,walkSpeed=3.5,graphicsScale=1,invertMouseY=false;
function loadSettings(){try{const v=JSON.parse(localStorage.getItem('the-backrooms-settings')||'{}');mouseSensitivity=Math.max(.4,Math.min(2.5,Number(v.mouseSensitivity)||1));fieldOfView=Math.max(60,Math.min(100,Number(v.fieldOfView)||75));walkSpeed=Math.max(2,Math.min(5.5,Number(v.walkSpeed)||3.5));graphicsScale=Math.max(.65,Math.min(1,Number(v.graphicsScale)||1));invertMouseY=!!v.invertMouseY;if(v.bindings)bindings={...defaultBindings,...v.bindings};}catch{}}
function saveSettings(){try{localStorage.setItem('the-backrooms-settings',JSON.stringify({mouseSensitivity,fieldOfView,walkSpeed,graphicsScale,invertMouseY,bindings}));}catch{}}
loadSettings();
let breakersOn=0,fusesFound=0,hasAccessCard=false,isHiding=false,playerSpawn=new THREE.Vector3(2,1.65,2),captureCooldown=0;
const hidingReturnPosition=new THREE.Vector3();let hidingReturnYaw=0,hidingReturnPitch=0;
let objectiveText='Find a way out.';
function updateObjective(t:string){objectiveText=t;const el=document.querySelector<HTMLElement>('#objective-text');if(el)el.textContent=t;}
function updateInventory(){inventoryList.innerHTML='';const items=[...collectedItems];if(hasAccessCard&&!items.includes('Access card'))items.push('Access card');if(!items.length){const empty=document.createElement('div');empty.className='inventory-item';empty.textContent='No items collected yet';inventoryList.appendChild(empty);}for(const item of items){const el=document.createElement('button');el.className='inventory-item'+(selectedInventoryItem===item?' selected':'');el.textContent=item;el.dataset.item=item;inventoryList.appendChild(el);}const reader=document.querySelector<HTMLElement>('#letter-reader');if(reader){const content=noteContents[selectedInventoryItem];reader.innerHTML=content?'<strong>'+selectedInventoryItem+'</strong><p></p>':'<strong>LETTER / DOCUMENT</strong><p>Select a letter in your inventory to read it.</p>';if(content)reader.querySelector('p')!.textContent=content;}}
function saveProgress(nextLevel=level){try{localStorage.setItem('the-backrooms-save',JSON.stringify({level:nextLevel,completed:Math.max(0,nextLevel-1),items:[...collectedItems],hasAccessCard}));}catch(e){console.warn('Save unavailable',e);}}
function readProgress(){try{const raw=localStorage.getItem('the-backrooms-save');return raw?JSON.parse(raw):null;}catch{return null;}}
function clearInteractables(){for(const item of interactables)world.remove(item.object);interactables.length=0;isHiding=false;}
function freePosition(seed:number):THREE.Vector3{
 const candidates:THREE.Vector3[]=[];
 const minX=level<=1?8:-18,maxX=level<=1?232:18,minZ=level<=1?8:-18,maxZ=level<=1?112:18,step=level<=1?7:5;
 for(let x=minX;x<=maxX;x+=step)for(let z=minZ;z<=maxZ;z+=step){const p=new THREE.Vector3(x,0,z);if(!collides(p)&&Math.hypot(x-camera.position.x,z-camera.position.z)>7&&interactables.every(v=>v.object.position.distanceTo(p)>5))candidates.push(p);}
 if(!candidates.length)return new THREE.Vector3(level<=1?20:0,0,level<=1?20:0);
 return candidates[Math.floor(Math.random()*candidates.length)]!;
}
function addInteractable(kind:string,label:string,pos:THREE.Vector3,color:number,facing=0){
 const g=new THREE.Group();
 if(kind==='locker'){
  const metal=new THREE.MeshStandardMaterial({color:0x66665f,roughness:.78,metalness:.28});
  const inside=new THREE.MeshStandardMaterial({color:0x252722,roughness:1});
  const part=(w:number,h:number,d:number,x:number,y:number,z:number,mat=metal)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);g.add(m);};
  part(.09,2.2,.82,-.53,1.1,0);part(.09,2.2,.82,.53,1.1,0);
  part(1.08,.09,.82,0,.045,0);part(1.08,.09,.82,0,2.155,0);
  part(1.0,2.0,.055,0,1.1,-.37,inside);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.02,2.04,.065),metal);door.position.set(-.58,1.1,.38);door.rotation.y=-.95;g.add(door);
  const handle=new THREE.Mesh(new THREE.BoxGeometry(.045,.25,.06),new THREE.MeshStandardMaterial({color:0xc4bda4,metalness:.7,roughness:.35}));handle.position.set(-.14,1.1,.62);g.add(handle);
 }else{
  const body=new THREE.Mesh(new THREE.BoxGeometry(kind==='generator'?1.1:.55,kind==='generator'?1.35:.45,kind==='generator'?.8:.45),new THREE.MeshStandardMaterial({color:0x55534a,roughness:.85,metalness:.12}));
  body.position.y=kind==='generator'?.68:.28;g.add(body);
 }
 const lamp=new THREE.Mesh(new THREE.BoxGeometry(.22,.09,.08),new THREE.MeshBasicMaterial({color}));lamp.position.set(0,kind==='locker'?1.65:kind==='generator'?1.05:.38,kind==='locker'?.43:.42);g.add(lamp);
 if(kind==='note'){const page=new THREE.Mesh(new THREE.BoxGeometry(.32,.025,.23),new THREE.MeshBasicMaterial({color:0xe7dfbd}));page.position.y=.55;g.add(page);}
 g.position.copy(pos);if(kind==='locker')g.rotation.y=facing;world.add(g);interactables.push({kind,label,object:g,active:true});return g;
}
function setupLevelGameplay(n:number){
 clearInteractables();breakersOn=0;fusesFound=0;hasAccessCard=false;collectedItems.clear();updateInventory();
 playerSpawn.copy(level<=1?MAP_PLAYER_SPAWN:camera.position);playerSpawn.y=1.65;camera.position.copy(playerSpawn);captureCooldown=0;
 if(n===0){const picks=[...MAP_OBJECTIVE_SPAWNS].sort(()=>Math.random()-.5).slice(0,3);for(let i=0;i<3;i++)addInteractable('breaker','Breaker '+(i+1),new THREE.Vector3(picks[i][0],0,picks[i][1]),0xe5d58c);addInteractable('note','Explorer note',freePosition(4),0xd8d0ad);updateObjective('Restore power: activate the 3 breaker boxes. Then find the exit.');}
 else if(n===1){const picks=[...MAP_OBJECTIVE_SPAWNS].sort(()=>Math.random()-.5).slice(0,3);for(let i=0;i<3;i++)addInteractable('fuse','Fuse '+(i+1),new THREE.Vector3(picks[i][0],0,picks[i][1]),0xffdf85);addInteractable('generator','Power generator',MAP_GENERATOR_SPAWN.clone(),0x9bd6a0);updateObjective('Find 3 fuses and install them in the generator. Then reach the exit.');}
 else if(n===2){addInteractable('card','Safe-zone access card',freePosition(1),0x9bd6a0);addInteractable('note','Explorer note',freePosition(3),0xd8d0ad);updateObjective('Explore the safe zone and find the access card to open the next passage.');}
 else{addInteractable('note','Final note',freePosition(2),0xd8d0ad);updateObjective('Follow the daylight. Find out whether this exit is real.');}
 if(n<=1){for(let i=0;i<MAP_LOCKER_SPAWNS.length;i++){const [x,z]=MAP_LOCKER_SPAWNS[i];addInteractable('locker','Locker '+(i+1),new THREE.Vector3(x,0,z),0x9bd6a0,MAP_LOCKER_FACING[i]);}}
 else{for(let i=0;i<7;i++)addInteractable('locker','Locker '+(i+1),freePosition(100+i),0x9bd6a0);}
 if(n<=1){const points=[...MAP_MONSTER_SPAWNS];const spawn=points[Math.floor(Math.random()*points.length)];const monster=n===0?wanderer:smiler;if(monster){monster.position.set(spawn[0],0,spawn[1]);monster.visible=true;}}
}
function nearInteractable(maxDistance=2.5){let best:{item:typeof interactables[number];distance:number}|null=null;for(const item of interactables){if(!item.active)continue;const d=camera.position.distanceTo(item.object.position.clone().add(new THREE.Vector3(0,1,0)));if(d<maxDistance&&(!best||d<best.distance))best={item,distance:d};}return best;}
function updateInteractHint(){const hint=document.querySelector<HTMLElement>('#interact-hint');if(!hint)return;if(!playing||isHiding){hint.style.opacity='0';return;}const near=nearInteractable();const exitDistance=exitPortal?camera.position.distanceTo(exitPortal.position.clone().add(new THREE.Vector3(0,1,0))):99;if(near){hint.textContent='E  ·  '+(near.item.kind==='locker'?'HIDE IN ':near.item.kind==='breaker'?'ACTIVATE ':near.item.kind==='fuse'?'PICK UP ':near.item.kind==='generator'?'USE ':near.item.kind==='card'?'COLLECT ': 'READ ')+near.item.label;hint.style.opacity='1';}else if(exitDistance<3.5){hint.textContent='E  ·  USE EXIT';hint.style.opacity='1';}else hint.style.opacity='0';}
function handleWorldInteraction(){
 if(isHiding){isHiding=false;camera.position.copy(hidingReturnPosition);camera.position.y=1.65;yaw=hidingReturnYaw;pitch=hidingReturnPitch;camera.rotation.set(pitch,yaw,0,'YXZ');for(const brain of [wandererBrain,smilerBrain])if(brain.state==='locker-check'){brain.state='chase';brain.lastKnown.copy(camera.position);brain.timer=0;}message('You climb out of the locker.');return;}
 const near=nearInteractable();
 if(near){const item=near.item;
  if(item.kind==='locker'){hidingReturnPosition.copy(camera.position);hidingReturnYaw=yaw;hidingReturnPitch=pitch;camera.position.set(item.object.position.x,item.object.position.y+1.15,item.object.position.z+.08);yaw=Math.PI;pitch=0;camera.rotation.set(pitch,yaw,0,'YXZ');isHiding=true;for(const [monster,brain] of [[wanderer,wandererBrain],[smiler,smilerBrain]] as [THREE.Group|null,MonsterBrain][])if(monster?.visible&&Math.hypot(monster.position.x-hidingReturnPosition.x,monster.position.z-hidingReturnPosition.z)<26){brain.state='locker-check';brain.target.copy(hidingReturnPosition);brain.timer=0;brain.think=0;}message('Stay quiet. The locker door closes around you.');return;}
  if(item.kind==='breaker'){breakersOn++;collectedItems.add('Breaker switch '+breakersOn);updateInventory();item.active=false;world.remove(item.object);message('Breaker activated ('+breakersOn+'/3).');updateObjective(breakersOn>=3?'Power restored. Find the exit.':'Activate the 3 breaker boxes ('+breakersOn+'/3).');if(breakersOn>=3)revealExit();}
  else if(item.kind==='fuse'){fusesFound++;collectedItems.add(item.label);item.active=false;world.remove(item.object);message('Fuse collected ('+fusesFound+'/3).');updateInventory();updateObjective(fusesFound>=3?'All fuses found. Return to the generator.':'Find the remaining fuses ('+fusesFound+'/3).');}
  else if(item.kind==='generator'){if(fusesFound<3){message('The generator needs 3 fuses.');}else{item.active=false;world.remove(item.object);message('Generator online. The exit is powered.');updateObjective('Power restored. Find the exit.');revealExit();}}
  else if(item.kind==='card'){hasAccessCard=true;collectedItems.add('Access card');item.active=false;world.remove(item.object);updateInventory();message('Access card collected.');updateObjective('You have the access card. Find the exit.');revealExit();}
  else if(item.kind==='note'){const noteName=level===2?'Letter — Safe Zone':level===3?'Letter — Final Message':level===0?'Explorer Note — Level 0':'Explorer Note — Level 1';const noteText=level===2?'To whoever finds this:\n\nThis place is quiet, but do not mistake quiet for safe. The doors sometimes lead somewhere different when you return. Keep your access card close. I am leaving it here because I cannot stay.':'If you are reading this, you made it farther than I did. The light ahead looks like daylight, but the walls still hum. I do not think we ever found the outside. Do not trust the exit.';noteContents[noteName]=noteText;collectedItems.add(noteName);selectedInventoryItem=noteName;item.active=false;world.remove(item.object);updateInventory();message('Letter collected. Open inventory [I] to read it.');if(level===3)revealExit();}
  saveProgress();return;
 }
 const exitDistance=exitPortal?camera.position.distanceTo(exitPortal.position):99;
 if(exitDistance<3.5){
  if(level===0&&breakersOn<3){message('The exit has no power. Activate all 3 breakers.');return;}
  if(level===1&&(fusesFound<3||interactables.some(v=>v.kind==='generator'&&v.active))){message('The generator must be powered before you can leave.');return;}
  if(level===2&&!hasAccessCard){message('The passage is locked. Find the access card.');return;}
  if(level===3){message('The daylight flickers. This was never the outside. TO BE CONTINUED.');endLevel();return;}
  endLevel();
 }else message('There is nothing to interact with nearby.');
}
function capturePlayer(){if(captureCooldown>0||isHiding)return;captureCooldown=3;playing=false;if(document.pointerLockElement)document.exitPointerLock();camera.position.copy(playerSpawn);camera.position.y=1.65;stamina=100;message('You were found. You return to the last safe point.');pauseUI.classList.remove('visible');setTimeout(()=>{captureCooldown=0;if(!menu.classList.contains('visible')&&!completeUI.classList.contains('visible')){playing=true;renderer.domElement.requestPointerLock();}},1200);}

const scene=new THREE.Scene(); scene.background=new THREE.Color(0xaaa17b); scene.fog=new THREE.Fog(0xaaa17b,12,55);
const camera=new THREE.PerspectiveCamera(fieldOfView,innerWidth/innerHeight,.1,150); camera.position.set(0,1.65,8);
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1)*graphicsScale);
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=false;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
game.prepend(renderer.domElement);
const hemiLight=new THREE.HemisphereLight(0xffedc5,0x4b4635,1.3);scene.add(hemiLight);const ambientLight=new THREE.AmbientLight(0xffe9b5,.48);scene.add(ambientLight);
function makePatternTexture(kind:'wall'|'floor'|'ceiling'){
 const c=document.createElement('canvas');c.width=256;c.height=256;const ctx=c.getContext('2d')!;
 if(kind==='wall'){ctx.fillStyle='#b9b17b';ctx.fillRect(0,0,256,256);for(let x=0;x<256;x+=51){ctx.fillStyle='rgba(226,216,158,.20)';ctx.fillRect(x,0,9,256);ctx.fillStyle='rgba(112,103,65,.13)';ctx.fillRect(x+43,0,3,256);ctx.fillStyle='rgba(231,220,163,.12)';ctx.fillRect(x+11,0,28,256);for(let y=-28;y<300;y+=62){ctx.fillStyle='rgba(139,130,82,.30)';ctx.beginPath();ctx.moveTo(x+7,y+29);ctx.lineTo(x+25,y+7);ctx.lineTo(x+43,y+29);ctx.lineTo(x+37,y+29);ctx.lineTo(x+25,y+15);ctx.lineTo(x+13,y+29);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(221,211,153,.24)';ctx.beginPath();ctx.moveTo(x+12,y+42);ctx.lineTo(x+25,y+27);ctx.lineTo(x+38,y+42);ctx.lineTo(x+34,y+42);ctx.lineTo(x+25,y+32);ctx.lineTo(x+16,y+42);ctx.closePath();ctx.fill();}}}
 else if(kind==='floor'){ctx.fillStyle='#aaa27c';ctx.fillRect(0,0,256,256);let seed=914;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<6500;i++){const v=Math.floor(80+rand()*100);ctx.fillStyle='rgba('+v+','+(v-3)+','+(v-18)+','+(0.08+rand()*.18)+')';ctx.fillRect(rand()*256,rand()*256,1+rand()*2,1+rand()*2);}}
 else{ctx.fillStyle='#c9c2aa';ctx.fillRect(0,0,256,256);for(let x=0;x<=256;x+=64){ctx.fillStyle='#918a76';ctx.fillRect(x,0,3,256);ctx.fillStyle='#e2dac2';ctx.fillRect(x+3,0,2,256);}for(let y=0;y<=256;y+=64){ctx.fillStyle='#918a76';ctx.fillRect(0,y,256,3);ctx.fillStyle='#e2dac2';ctx.fillRect(0,y+3,256,2);}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;return t;
}
const wallMat=new THREE.MeshStandardMaterial({map:makePatternTexture('wall'),color:0xffffff,roughness:.96});
const floorMat=new THREE.MeshStandardMaterial({map:makePatternTexture('floor'),color:0xffffff,roughness:1});
const ceilMat=new THREE.MeshBasicMaterial({map:makePatternTexture('ceiling'),color:0xffffff,toneMapped:false});
const lightPanelGeometry=new THREE.BoxGeometry(2.25,.04,1.05); const walls:THREE.Mesh[]=[]; type SolidBounds={minX:number;maxX:number;minZ:number;maxZ:number}; const solidBounds:SolidBounds[]=[]; const solidGrid=new Map<string,SolidBounds[]>(); const CELL_SIZE=8; const lights:THREE.PointLight[]=[]; const world=new THREE.Group(); scene.add(world);
let exitPortal: THREE.Group | null = null;
let level=0;
const MAP_PLAYER_SPAWN=new THREE.Vector3(8.33,0,7.35);
const MAP_OBJECTIVE_SPAWNS=[[40.21,3.17],[115.42,3.17],[156.29,15.73],[205.19,22.42],[25.95,27.19],[61.17,28.89],[235.65,38.92],[172.72,47.91],[182.53,52.37],[22.9,52.66],[48.08,55.42],[185.35,68.57],[3.05,72.21],[92.82,72.21],[211.06,77.79],[128.87,78.08],[52.84,84.54],[12.86,88.71],[102.86,93.17],[98.69,107.44],[75.44,113.31],[185.63,113.6],[3.35,114.72]] as const;
const MAP_LOCKER_SPAWNS=[[126.3,25.66],[174.83,31.66],[236.93,46.56],[97.56,49.25],[2.42,55.41],[103.43,55.63],[77.77,56.01],[53.93,66.23],[126.34,66.12],[21.76,72.21],[197.56,116.43]] as const;
const MAP_MONSTER_SPAWNS=[[53.25,12.52],[213.28,13.8],[143.66,14.32],[95.28,36.45],[12.64,43.38],[148.07,43.38],[214.98,44.78],[150.18,90.59],[67.04,92.7],[205.72,109.13],[12.21,113.67]] as const;
const MAP_LOCKER_FACING=[1.71,-0.09,-1.33,-1.37,2.17,2.03,-1.64,-0.63,1.39,-1.42,-3.08] as const;
const MAP_GENERATOR_SPAWN=new THREE.Vector3(159.93,0,89.0);
const MAP_EXIT_SPAWN=new THREE.Vector3(235.95,0,114.72);
function placeExit(x:number,z:number){if(exitPortal)scene.remove(exitPortal);const g=new THREE.Group();const frame=new THREE.Mesh(new THREE.TorusGeometry(1.05,.12,12,36),new THREE.MeshStandardMaterial({color:0x8b9c76,emissive:0x31482c,emissiveIntensity:1.5}));frame.position.y=1.35;g.add(frame);const glow=new THREE.Mesh(new THREE.PlaneGeometry(1.75,2.35),new THREE.MeshBasicMaterial({color:0x9bd6a0,transparent:true,opacity:.38,side:THREE.DoubleSide}));glow.position.set(0,1.35,-.03);g.add(glow);const lamp=new THREE.PointLight(0x9bd6a0,16,9);lamp.position.set(0,1.5,1);g.add(lamp);g.position.set(x,0,z);scene.add(g);exitPortal=g;}
function revealExit(){if(exitPortal)return;placeExit(level<=1?MAP_EXIT_SPAWN.x:0,level<=1?MAP_EXIT_SPAWN.z:-18);message('Objective complete. The exit has appeared.');}
function addBox(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material,solid=false){
 const geometry=new THREE.BoxGeometry(w,h,d),pos=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
 for(let i=0;i<uv.count;i++){const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),px=pos.getX(i),py=pos.getY(i),pz=pos.getZ(i);let u=px,v=py;if(ny>.5){u=px;v=pz;}else if(nx>.5){u=pz;v=py;}uv.setXY(i,u,v);}
 uv.needsUpdate=true;const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.receiveShadow=false;m.castShadow=false;world.add(m);if(solid){walls.push(m);const b={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2};solidBounds.push(b);for(let gx=Math.floor(b.minX/CELL_SIZE);gx<=Math.floor(b.maxX/CELL_SIZE);gx++)for(let gz=Math.floor(b.minZ/CELL_SIZE);gz<=Math.floor(b.maxZ/CELL_SIZE);gz++){const key=gx+','+gz;let bucket=solidGrid.get(key);if(!bucket){bucket=[];solidGrid.set(key,bucket);}bucket.push(b);}}return m;
}
function clearWorld(){while(world.children.length){const o=world.children[0];world.remove(o);if(o instanceof THREE.Mesh){o.geometry.dispose();}}walls.length=0;solidBounds.length=0;solidGrid.clear();lights.length=0;}
function isCeilingLightSpotClear(x:number,z:number,margin=.2){for(const b of solidBounds){const minX=Math.min(b.minX,b.maxX),maxX=Math.max(b.minX,b.maxX),minZ=Math.min(b.minZ,b.maxZ),maxZ=Math.max(b.minZ,b.maxZ);if(x>minX-margin&&x<maxX+margin&&z>minZ-margin&&z<maxZ+margin)return false;}return true;}
function makeRoom(){clearWorld();addBox(44,.2,44,0,-.12,0,floorMat);addBox(44,.2,44,0,3.25,0,ceilMat);const h=3.15,t=.28;const wall=(x:number,z:number,w:number,d:number)=>addBox(w,h,d,x,h/2,z,wallMat,true);
wall(-8,0,t,24);wall(8,-5,t,34);wall(0,-12,16,t);wall(-3,12,10,t);wall(-12,-7,t,10);wall(3,5,t,9);wall(12,8,t,12);wall(5,-1,6,t);wall(-5,-4,5,t);wall(-1,8,t,8);wall(4,-9,8,t);wall(-11,5,6,t);
const roomPanelMat=new THREE.MeshBasicMaterial({color:0xfff2d1});const roomGlowMat=new THREE.MeshBasicMaterial({color:0xffe8b2,transparent:true,opacity:.10,side:THREE.DoubleSide,depthWrite:false});let roomLightIndex=0;for(let x=-18;x<=18;x+=6){for(let z=-18;z<=18;z+=6){if(!isCeilingLightSpotClear(x,z))continue;const panel=new THREE.Mesh(lightPanelGeometry,roomPanelMat);panel.position.set(x,3.12,z);world.add(panel);const glow=new THREE.Mesh(new THREE.PlaneGeometry(3.1,1.8),roomGlowMat);glow.rotation.x=-Math.PI/2;glow.position.set(x,3.02,z);world.add(glow);if(roomLightIndex%4===0){const l=new THREE.PointLight(0xffe8b2,13,21,1.6);l.position.set(x,2.92,z);world.add(l);lights.push(l);}roomLightIndex++;}}
}
makeRoom();
const flashlight=new THREE.SpotLight(0xfff1cf,0,24,Math.PI/7,.45,1.3);camera.add(flashlight);camera.add(flashlight.target);flashlight.target.position.set(0,0,-1);scene.add(camera);
function makeSmilerModel():THREE.Group{
 const g=new THREE.Group();
 // Always build a visible procedural Smiler first. The optional face image is layered
 // over it only after the texture has successfully loaded, so a missing PNG cannot
 // leave Level 1 with an invisible enemy.
 const shadow=new THREE.Mesh(new THREE.SphereGeometry(.82,24,18),new THREE.MeshStandardMaterial({color:0x08070b,roughness:1,transparent:true,opacity:.96}));
 shadow.scale.set(1.05,1.35,.48);shadow.position.y=1.45;g.add(shadow);
 const face=new THREE.Mesh(new THREE.SphereGeometry(.58,24,16),new THREE.MeshBasicMaterial({color:0x050407}));face.scale.set(1.12,1,.18);face.position.set(0,1.85,-.38);g.add(face);
 const eyeMat=new THREE.MeshBasicMaterial({color:0xf4fff0});
 for(const x of [-.34,.34]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.115,16,12),eyeMat);eye.position.set(x,2.08,-.52);g.add(eye);}
 const points=[new THREE.Vector3(-.43,1.63,-.55),new THREE.Vector3(-.25,1.49,-.57),new THREE.Vector3(0,1.45,-.58),new THREE.Vector3(.25,1.49,-.57),new THREE.Vector3(.43,1.63,-.55)];
 const grin=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.055,8,false),new THREE.MeshBasicMaterial({color:0xeaffdf}));g.add(grin);
 for(let i=0;i<7;i++){const tooth=new THREE.Mesh(new THREE.BoxGeometry(.075,.13,.035),new THREE.MeshBasicMaterial({color:0xf4fff0}));tooth.position.set(-.3+i*.1,1.55,-.58);g.add(tooth);}
 const haze=new THREE.PointLight(0xd9ffe1,3,5);haze.position.set(0,1.8,-.8);g.add(haze);
 const faceTexture=new THREE.TextureLoader().load(import.meta.env.BASE_URL+'models/Smiler.png',()=>{faceTexture.colorSpace=THREE.SRGBColorSpace;faceSprite.visible=true;},undefined,()=>console.warn('Smiler face texture unavailable; using procedural model.'));
 const faceSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:faceTexture,transparent:true,alphaTest:.025,depthWrite:false}));faceSprite.position.set(0,1.55,0);faceSprite.scale.set(2.55,2.28,1);faceSprite.visible=false;g.add(faceSprite);
 return g;
}
const loader=new GLTFLoader();let wanderer:THREE.Group|null=null;let smiler:THREE.Group|null=null;let mixer:THREE.AnimationMixer|null=null;let actions:Record<string,THREE.AnimationAction>={};let actionName='';
loader.load(import.meta.env.BASE_URL+'models/Lonely_Wanderer.glb',g=>{wanderer=new THREE.Group();const model=g.scene;const b=new THREE.Box3().setFromObject(model),s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());const scale=2.15/Math.max(s.y,.001);model.scale.setScalar(scale);model.position.set(-c.x*scale,-b.min.y*scale,-c.z*scale);wanderer.add(model);wanderer.position.set(18,0,18);wanderer.visible=level===0;scene.add(wanderer);mixer=new THREE.AnimationMixer(model);g.animations.forEach(a=>actions[a.name]=mixer!.clipAction(a));playAnim('Zombie_Walk');},undefined,e=>console.warn('Wanderer model could not load',e));
smiler=makeSmilerModel();smiler.position.set(18,0,18);smiler.visible=level===1;scene.add(smiler);
function playAnim(n:string){const a=actions[n];if(!a||actionName===n)return;a.reset().fadeIn(.2).play();if(actions[actionName])actions[actionName].fadeOut(.2);actionName=n;}
let playing=false,paused=false,inventoryOpen=false,flashOn=false,stamina=100,yaw=0,pitch=0,last=performance.now(),exitReady=false;
const keys=new Set<string>();
type ActionName='forward'|'backward'|'left'|'right'|'sprint'|'interact'|'flashlight'|'inventory';
const defaultBindings:Record<ActionName,string>={forward:'KeyW',backward:'KeyS',left:'KeyA',right:'KeyD',sprint:'ShiftLeft',interact:'KeyE',flashlight:'KeyF',inventory:'KeyI'};
let bindings:Record<ActionName,string>={...defaultBindings};let waitingForBind:ActionName|null=null;let settingsReturn:'menu'|'pause'='menu';let tutorialPending=false;let cheatMap=false;const $=(s:string)=>document.querySelector<HTMLElement>(s)!;
const menu=$('#menu'),pauseUI=$('#pause'),inventoryUI=$('#inventory'),completeUI=$('#level-complete'),notice=$('#notice');
const message=(s:string)=>{notice.textContent=s;notice.classList.add('show');};
async function loadUserMap(){
 clearWorld();
 const width=240,depth=120,ceiling=3.2;
 addBox(width,.2,depth,120,-.12,60,floorMat);
 addBox(width,.2,depth,120,ceiling,60,ceilMat);
 for(const [x,z,w,d] of level0Rects) addBox(w,ceiling-.2,d,x+w/2,(ceiling-.2)/2,z+d/2,wallMat,true);
 const panelMat=new THREE.MeshBasicMaterial({color:level===1?0xaaa49b:0xfff5d5});const glowMat=new THREE.MeshBasicMaterial({color:level===1?0xaaa5ad:0xffe9b8,transparent:true,opacity:level===1?.055:.11,side:THREE.DoubleSide,depthWrite:false});let panelIndex=0;
for(let x=4;x<240;x+=8){for(let z=4;z<120;z+=8){if(!isCeilingLightSpotClear(x,z,.2))continue;
 const panel=new THREE.Mesh(lightPanelGeometry,panelMat);panel.position.set(x,ceiling-.125,z);world.add(panel);
 const glow=new THREE.Mesh(new THREE.PlaneGeometry(3.0,1.7),glowMat);glow.rotation.x=-Math.PI/2;glow.position.set(x,ceiling-.145,z);world.add(glow);
 if(panelIndex%8===0){const light=new THREE.PointLight(level===1?0xd5d0df:0xffe8b2,level===1?8:14,level===1?17:23,1.5);light.position.set(x,ceiling-.38,z);world.add(light);lights.push(light);}panelIndex++;
}}
 camera.position.copy(MAP_PLAYER_SPAWN);camera.position.y=1.65;
 message('Original NullZoner map loaded — 382 map shapes.');
 return true;
}
function setLevel(n:number){if(exitPortal){scene.remove(exitPortal);exitPortal=null;}level=n;hemiLight.intensity=n===1?.58:1.3;ambientLight.intensity=n===1?.2:.48;$('#level-name').textContent=['LEVEL 0 — LOBBY','LEVEL 1 — HABITUAL ROOMS','LEVEL 2 — SAFE ZONE','LEVEL 3 — THE EXIT'][n];exitReady=false;scene.background=new THREE.Color(n===1?0x34313a:n===2?0x89917c:n===3?0x29252b:0xaaa17b);scene.fog=new THREE.Fog(n===1?0x34313a:n===2?0x89917c:n===3?0x29252b:0xaaa17b,n===1?7:12,n===1?39:55);if(n<=1){void loadUserMap().then(()=>setupLevelGameplay(n));}else{makeRoom();camera.position.set(0,1.65,8);setupLevelGameplay(n);}if(wanderer)wanderer.visible=n===0;if(smiler)smiler.visible=n===1;message(['Find a way out.','Something is watching.','This level seems safe.','You can see daylight ahead.'][n]);}
function begin(){keys.clear();playing=true;paused=false;menu.classList.remove('visible');pauseUI.classList.remove('visible');completeUI.classList.remove('visible');$('#tutorial').classList.remove('visible');renderer.domElement.requestPointerLock();}
function pause(){if(!playing)return;keys.clear();paused=true;playing=false;pauseUI.classList.add('visible');if(document.pointerLockElement)document.exitPointerLock();}
function resume(){paused=false;pauseUI.classList.remove('visible');begin();}
function endLevel(){playing=false;saveProgress(level<3?level+1:3);document.exitPointerLock();completeUI.classList.add('visible');$('#complete-title').textContent=level===3?'TO BE CONTINUED':'LEVEL '+level+' COMPLETE';$('#complete-text').textContent=level===2?'A familiar doorway opens. Beyond it, the halls become darker.':level===3?'The exit was never an exit. Something moves behind the glass.':'You found a passage deeper into the Backrooms.';$('#next-level').textContent=level===3?'RETURN TO MAIN MENU':'ENTER NEXT LEVEL';}
function syncSettingsUI(){($('#sensitivity-setting') as HTMLInputElement).value=String(mouseSensitivity);$('#sensitivity-value').textContent=mouseSensitivity.toFixed(1)+'×';($('#fov-setting') as HTMLInputElement).value=String(fieldOfView);$('#fov-value').textContent=fieldOfView+'°';($('#speed-setting') as HTMLInputElement).value=String(walkSpeed);$('#speed-value').textContent=walkSpeed.toFixed(1);($('#quality-setting') as HTMLInputElement).value=String(graphicsScale);$('#quality-value').textContent=Math.round(graphicsScale*100)+'%';($('#invert-y-setting') as HTMLInputElement).checked=invertMouseY;}
function applySettings(){camera.fov=fieldOfView;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1)*graphicsScale);syncSettingsUI();saveSettings();}
function bindRange(id:string,fn:(v:number)=>void){const el=$('#'+id) as HTMLInputElement;el.addEventListener('input',()=>{fn(Number(el.value));applySettings();});}
bindRange('sensitivity-setting',v=>mouseSensitivity=v);bindRange('fov-setting',v=>fieldOfView=v);bindRange('speed-setting',v=>walkSpeed=v);bindRange('quality-setting',v=>graphicsScale=v);
($('#invert-y-setting') as HTMLInputElement).addEventListener('change',e=>{invertMouseY=(e.target as HTMLInputElement).checked;saveSettings();});
function openSettings(from:'menu'|'pause'){settingsReturn=from;syncSettingsUI();$('#settings').classList.add('visible');if(from==='pause')pauseUI.classList.remove('visible');}
$('#open-settings').onclick=()=>openSettings('menu');$('#pause-settings').onclick=()=>openSettings('pause');$('#close-settings').onclick=()=>{$('#settings').classList.remove('visible');if(settingsReturn==='pause')pauseUI.classList.add('visible');};
function refreshBindLabels(){document.querySelectorAll<HTMLButtonElement>('[data-bind]').forEach(b=>{const a=b.dataset.bind as ActionName;b.textContent=bindings[a].replace('Key','').replace('ShiftLeft','SHIFT').replace('Arrow','');});}
document.querySelectorAll<HTMLButtonElement>('[data-bind]').forEach(b=>b.onclick=()=>{waitingForBind=b.dataset.bind as ActionName;$('#bind-status').textContent='Press a key for '+waitingForBind+' (Esc cancels).';});refreshBindLabels();
$('#reset-settings').onclick=()=>{mouseSensitivity=1;fieldOfView=75;walkSpeed=3.5;graphicsScale=1;invertMouseY=false;bindings={...defaultBindings};applySettings();refreshBindLabels();};
inventoryList.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-item]');if(!button)return;selectedInventoryItem=button.dataset.item||'';updateInventory();});
applySettings();
const savedAtMenu=readProgress();const continueButton=$('#continue') as HTMLButtonElement;continueButton.disabled=!(savedAtMenu&&Number.isInteger(savedAtMenu.level));function showTutorial(){const label=(a:ActionName)=>bindings[a].replace('Key','').replace('ShiftLeft','SHIFT').replace('ShiftRight','SHIFT');$('#tutorial-content').textContent='MOVE  '+label('forward')+' / '+label('backward')+' / '+label('left')+' / '+label('right')+'\\nSPRINT  '+label('sprint')+'\\nINTERACT, PICK UP ITEMS & HIDE  '+label('interact')+'\\nFLASHLIGHT  '+label('flashlight')+'\\nINVENTORY & LETTERS  '+label('inventory')+'\\nLOOK AROUND  Move your mouse\\nPAUSE  ESC\\n\\nStay alert. Find the objectives, use lockers carefully, and reach the exit.';$('#tutorial').classList.add('visible');}
$('#start').onclick=()=>{try{localStorage.removeItem('the-backrooms-save');}catch{}setLevel(0);tutorialPending=true;showTutorial();};$('#continue').onclick=()=>{const saved=readProgress();if(saved&&Number.isInteger(saved.level)){setLevel(Math.max(0,Math.min(3,saved.level)));tutorialPending=true;showTutorial();}};$('#tutorial-start').onclick=()=>{tutorialPending=false;begin();};$('#resume').onclick=()=>resume();$('#restart').onclick=()=>{setLevel(level);pauseUI.classList.remove('visible');begin();};$('#to-menu').onclick=()=>{playing=false;paused=false;document.exitPointerLock();pauseUI.classList.remove('visible');menu.classList.add('visible');};$('#close-inventory').onclick=()=>{inventoryOpen=false;inventoryUI.classList.remove('visible');begin();};
$('#next-level').onclick=()=>{completeUI.classList.remove('visible');if(level>=3){menu.classList.add('visible');return;}setLevel(level+1);begin();};
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==renderer.domElement&&playing){playing=false;paused=true;pauseUI.classList.add('visible');}});
document.addEventListener('mousemove',e=>{if(!playing||isHiding||document.pointerLockElement!==renderer.domElement)return;yaw-=e.movementX*.0022*mouseSensitivity;pitch=Math.max(-1.45,Math.min(1.45,pitch-(invertMouseY?-1:1)*e.movementY*.0022*mouseSensitivity));camera.rotation.set(pitch,yaw,0,'YXZ');});
document.addEventListener('keydown',e=>{if(waitingForBind){e.preventDefault();if(e.code==='Escape'){waitingForBind=null;$('#bind-status').textContent='Binding cancelled.';return;}if(Object.values(bindings).includes(e.code)){($('#bind-status')).textContent='That key is already assigned.';return;}bindings[waitingForBind]=e.code;waitingForBind=null;saveSettings();refreshBindLabels();$('#bind-status').textContent='Controls saved.';return;}keys.add(e.code);if(e.code==='Escape'&&playing){pause();return;}if(e.code==='Backslash'&&!e.repeat){cheatMap=!cheatMap;$('#debug-map').style.display='none';espOverlay.style.display=cheatMap&&playing?'block':'none';message('Through-wall highlights '+(cheatMap?'enabled':'disabled')+'.');}if(e.code===bindings.flashlight&&!e.repeat){flashOn=!flashOn;flashlight.intensity=flashOn?85:0;$('#light-status').textContent='FLASHLIGHT: '+(flashOn?'ON':'OFF')+' ['+bindings.flashlight.replace('Key','')+']';}if(e.code===bindings.inventory&&!e.repeat&&playing){inventoryOpen=!inventoryOpen;inventoryUI.classList.toggle('visible',inventoryOpen);if(inventoryOpen){playing=false;document.exitPointerLock();}else begin();}if(e.code===bindings.interact&&!e.repeat&&playing){handleWorldInteraction();}});
document.addEventListener('keyup',e=>keys.delete(e.code));document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause();});
const radius=.32;function collides(p:THREE.Vector3){const minX=Math.floor((p.x-radius)/CELL_SIZE),maxX=Math.floor((p.x+radius)/CELL_SIZE),minZ=Math.floor((p.z-radius)/CELL_SIZE),maxZ=Math.floor((p.z+radius)/CELL_SIZE);for(let gx=minX;gx<=maxX;gx++)for(let gz=minZ;gz<=maxZ;gz++){const bucket=solidGrid.get(gx+','+gz);if(!bucket)continue;for(const b of bucket)if(p.x+radius>b.minX&&p.x-radius<b.maxX&&p.z+radius>b.minZ&&p.z-radius<b.maxZ)return true;}return false;}
type MonsterState='patrol'|'investigate'|'search'|'chase'|'stalk'|'locker-check';
type MonsterBrain={state:MonsterState;target:THREE.Vector3;lastKnown:THREE.Vector3;origin:THREE.Vector3;timer:number;think:number;};
const wandererBrain:MonsterBrain={state:'patrol',target:new THREE.Vector3(26,0,18),lastKnown:new THREE.Vector3(),origin:new THREE.Vector3(18,0,18),timer:0,think:0};
const smilerBrain:MonsterBrain={state:'stalk',target:new THREE.Vector3(18,0,18),lastKnown:new THREE.Vector3(),origin:new THREE.Vector3(18,0,18),timer:0,think:0};
const sightRay=new THREE.Raycaster();let playerNoise=0;
function hasSight(monster:THREE.Group,range:number,fov:number){const origin=monster.position.clone().add(new THREE.Vector3(0,1.45,0));const target=camera.position.clone();const delta=target.clone().sub(origin);const distance=delta.length();if(distance>range)return false;const forward=new THREE.Vector3(0,0,1).applyQuaternion(monster.quaternion).normalize();if(forward.dot(delta.clone().normalize())<Math.cos(fov/2))return false;sightRay.set(origin,delta.normalize());sightRay.far=Math.max(0,distance-.55);return sightRay.intersectObjects(walls,false).length===0;}
function playerLooksAt(monster:THREE.Group){
 const to=monster.position.clone().add(new THREE.Vector3(0,1.35,0)).sub(camera.position);
 const distance=to.length();if(distance>30)return false;
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
 if(forward.dot(to.normalize())<.94)return false;
 sightRay.set(camera.position,to.normalize());sightRay.far=Math.max(0,distance-.45);
 return sightRay.intersectObjects(walls,false).length===0;
}
function choosePatrolTarget(monster:THREE.Group,brain:MonsterBrain){
 for(let i=0;i<18;i++){
  const p=new THREE.Vector3(brain.origin.x+(Math.random()-.5)*42,0,brain.origin.z+(Math.random()-.5)*42);
  if(p.x>1&&p.x<239&&p.z>1&&p.z<119&&!collides(p)){brain.target.copy(p);return;}
 }
 brain.target.copy(monster.position);
}
function moveMonster(monster:THREE.Group,target:THREE.Vector3,speed:number,dt:number){
 const dx=target.x-monster.position.x,dz=target.z-monster.position.z;
 const distance=Math.hypot(dx,dz);if(distance<.08)return false;
 const desired=Math.atan2(dx,dz);
 // Try the direct route first, then progressively wider steering angles.
 const offsets=[0,.38,-.38,.78,-.78,1.2,-1.2,1.65,-1.65,2.25,-2.25,Math.PI];
 let bestX=0,bestZ=0,bestScore=-Infinity;
 for(const offset of offsets){
  const angle=desired+offset,dirX=Math.sin(angle),dirZ=Math.cos(angle);
  const probe=monster.position.clone().add(new THREE.Vector3(dirX*.9,0,dirZ*.9));
  if(collides(probe))continue;
  const score=Math.cos(offset)*2+(Math.min(distance,4)/4)*.08;
  if(score>bestScore){bestScore=score;bestX=dirX;bestZ=dirZ;}
 }
 if(bestScore===-Infinity)return false;
 const step=Math.min(speed*dt,distance);
 const next=monster.position.clone().add(new THREE.Vector3(bestX*step,0,bestZ*step));
 if(!collides(next))monster.position.copy(next);
 monster.rotation.y=Math.atan2(bestX,bestZ);
 return true;
}
function updateMonster(monster:THREE.Group,brain:MonsterBrain,kind:'wanderer'|'smiler',dt:number){
 if(brain.state==='locker-check'){
  const d=Math.hypot(monster.position.x-brain.target.x,monster.position.z-brain.target.z);
  if(d>2.15){moveMonster(monster,brain.target,kind==='smiler'?1.8:2.25,dt);}
  else{brain.timer+=dt;if(brain.timer>=3){brain.state='patrol';brain.timer=0;brain.think=0;choosePatrolTarget(monster,brain);}}
  return;
 }
 if(isHiding)return;
 const player=camera.position.clone();player.y=0;
 const distance=Math.hypot(monster.position.x-player.x,monster.position.z-player.z);
 const looking=playerLooksAt(monster);
 if(kind==='smiler'){
  // Smilers stop moving when directly watched, then close the distance when unseen.
  if(distance<30&&looking){
   brain.state='stalk';brain.lastKnown.copy(player);brain.think=0;
   const face=player.clone().sub(monster.position);monster.rotation.y=Math.atan2(face.x,face.z);
   return;
  }
  if(distance<1.25)return;
  if(distance<23){
   brain.state='chase';brain.lastKnown.copy(player);
   moveMonster(monster,player, distance<7?1.9:1.55,dt);
  }else{
   brain.state='patrol';brain.think-=dt;
   if(brain.think<=0||monster.position.distanceTo(brain.target)<1){choosePatrolTarget(monster,brain);brain.think=2.5+Math.random()*2.5;}
   moveMonster(monster,brain.target,.9,dt);
  }
  return;
 }
 const seen=hasSight(monster,20,Math.PI*.82);
 const heard=playerNoise>0&&distance<(playerNoise>1?25:14);
 if(seen){brain.state='chase';brain.lastKnown.copy(player);brain.timer=0;}
 else if(heard&&brain.state!=='chase'){brain.state='investigate';brain.lastKnown.copy(player);brain.timer=0;}
 else if(brain.state==='chase'){brain.state='search';brain.target.copy(brain.lastKnown);brain.timer=7;brain.think=0;}
 if(brain.state==='patrol'){
  brain.think-=dt;
  if(brain.think<=0||monster.position.distanceTo(brain.target)<1){choosePatrolTarget(monster,brain);brain.think=2+Math.random()*3;}
  moveMonster(monster,brain.target,1.15,dt);playAnim('Zombie_Walk');
 }else if(brain.state==='chase'){
  moveMonster(monster,player,3.05,dt);playAnim('Run_Stealth');
 }else if(brain.state==='investigate'){
  moveMonster(monster,brain.lastKnown,1.85,dt);playAnim('Zombie_Walk');
  if(monster.position.distanceTo(brain.lastKnown)<1.4){brain.state='search';brain.timer=5.5;brain.think=0;}
 }else if(brain.state==='search'){
  brain.timer-=dt;brain.think-=dt;
  if(brain.think<=0||monster.position.distanceTo(brain.target)<.9){
   const a=Math.random()*Math.PI*2,r=2+Math.random()*4;
   brain.target.set(brain.lastKnown.x+Math.cos(a)*r,0,brain.lastKnown.z+Math.sin(a)*r);
   if(collides(brain.target))brain.target.copy(brain.lastKnown);
   brain.think=1.1+Math.random()*.7;
  }
  moveMonster(monster,brain.target,1.12,dt);playAnim('Zombie_Walk');
  if(brain.timer<=0){brain.state='patrol';brain.think=0;}
 }
}
function drawMaps(){const canvas=document.querySelector<HTMLCanvasElement>('#minimap'),ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;const w=canvas.width,h=canvas.height,cx=camera.position.x,cz=camera.position.z,scale=4;ctx.clearRect(0,0,w,h);ctx.fillStyle='#171810';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#39382a';ctx.lineWidth=1;for(let x=0;x<w;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}const px=(x:number)=>w/2+(x-cx)*scale,py=(z:number)=>h/2+(z-cz)*scale;ctx.save();ctx.translate(w/2,h/2);ctx.rotate(-yaw);ctx.fillStyle='#f5d66f';ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(-5,6);ctx.lineTo(5,6);ctx.closePath();ctx.fill();ctx.restore();const marker=(x:number,z:number,color:string,r=3)=>{const a=px(x),b=py(z);if(a<0||a>w||b<0||b>h)return;ctx.fillStyle=color;ctx.beginPath();ctx.arc(a,b,r,0,Math.PI*2);ctx.fill();};for(const item of interactables)if(item.active&&['fuse','breaker','card','note'].includes(item.kind))marker(item.object.position.x,item.object.position.z,'#48bfff',3);if(exitPortal&&exitPortal.visible)marker(exitPortal.position.x,exitPortal.position.z,'#35e8e8',5);$('#minimap-coords').textContent='AREA '+level+'  ·  '+Math.round(cx)+', '+Math.round(cz);
const debug=document.querySelector<HTMLCanvasElement>('#debug-map'),dc=debug?.getContext('2d');if(!debug||!dc)return;dc.clearRect(0,0,280,280);dc.fillStyle='#10110e';dc.fillRect(0,0,280,280);dc.fillStyle='#ddd2a8';dc.font='10px sans-serif';dc.fillText('LIVE ENTITY / OBJECTIVE TRACKER',10,14);const extent=level<=1?240:44,depth=level<=1?120:44,scaleD=250/Math.max(extent,depth);const dx=(x:number)=>12+x*scaleD,dy=(z:number)=>26+z*scaleD;dc.fillStyle='#e5d56c';dc.beginPath();dc.arc(dx(camera.position.x),dy(camera.position.z),4,0,Math.PI*2);dc.fill();for(const item of interactables)if(item.active&&['fuse','breaker','card','note'].includes(item.kind)){dc.fillStyle='#42baff';dc.beginPath();dc.arc(dx(item.object.position.x),dy(item.object.position.z),3,0,Math.PI*2);dc.fill();}if(exitPortal&&exitPortal.visible){dc.fillStyle='#20eeee';dc.beginPath();dc.arc(dx(exitPortal.position.x),dy(exitPortal.position.z),5,0,Math.PI*2);dc.fill();}for(const m of [wanderer,smiler])if(m?.visible){dc.fillStyle='#ff4545';dc.beginPath();dc.arc(dx(m.position.x),dy(m.position.z),4,0,Math.PI*2);dc.fill();}if(level===1){const g=interactables.find(x=>x.kind==='generator'&&x.active);if(g){dc.fillStyle='#ff78cc';dc.beginPath();dc.arc(dx(g.object.position.x),dy(g.object.position.z),4,0,Math.PI*2);dc.fill();}}}
function updateEspHighlights(){
 if(!cheatMap||!playing){espOverlay.style.display='none';return;}
 espOverlay.style.display='block';camera.updateMatrixWorld();const seen=new Set<string>();
 const add=(key:string,label:string,color:string,position:THREE.Vector3,kind='')=>{
  seen.add(key);let el=espMarkers.get(key);if(!el){el=document.createElement('div');el.className='esp-marker';espOverlay.appendChild(el);espMarkers.set(key,el);}
  el.className='esp-marker '+kind;el.style.setProperty('--esp-color',color);el.textContent=label;
  const projected=position.clone().project(camera);const inFront=projected.z>=-1&&projected.z<=1;
  const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;
  const onScreen=x>=-100&&x<=innerWidth+100&&y>=-40&&y<=innerHeight+40;
  el.style.display=inFront&&onScreen?'block':'none';el.style.left=x+'px';el.style.top=y+'px';
 };
 for(const item of interactables){if(!item.active)continue;const labels:Record<string,[string,string]>={fuse:['FUSE','#48cfff'],breaker:['BREAKER','#48cfff'],card:['ACCESS CARD','#48cfff'],note:['NOTE','#d8d0ad'],generator:['GENERATOR','#ff78cc'],locker:['LOCKER','#b9c3c5']};const data=labels[item.kind];if(data)add('item-'+item.object.uuid,data[0]+' · '+Math.round(camera.position.distanceTo(item.object.position))+'m',data[1],item.object.position.clone().add(new THREE.Vector3(0,item.kind==='locker'?2.35:1.25,0)));}
 for(const [monster,label] of [[wanderer,'LONELY WANDERER'],[smiler,'SMILER']] as [THREE.Group|null,string][]){if(monster?.visible)add('monster-'+monster.uuid,label+' · '+Math.round(camera.position.distanceTo(monster.position))+'m','#ff4545',monster.position.clone().add(new THREE.Vector3(0,2.4,0)),'monster');}
 if(exitPortal)add('exit-'+exitPortal.uuid,'EXIT · '+Math.round(camera.position.distanceTo(exitPortal.position))+'m','#32eeee',exitPortal.position.clone().add(new THREE.Vector3(0,2.9,0)),'exit');
 for(const [key,el] of espMarkers)if(!seen.has(key)){el.remove();espMarkers.delete(key);}
}
function animate(now:number){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;mixer?.update(dt);
if(playing){if(smiler?.visible){updateMonster(smiler,smilerBrain,'smiler',dt);if(Math.hypot(smiler.position.x-camera.position.x,smiler.position.z-camera.position.z)<1.25)capturePlayer();}if(wanderer?.visible){updateMonster(wanderer,wandererBrain,'wanderer',dt);if(Math.hypot(wanderer.position.x-camera.position.x,wanderer.position.z-camera.position.z)<1.25)capturePlayer();}updateInteractHint();}

if(playing){const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),r=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),d=new THREE.Vector3();if(keys.has(bindings.forward))d.add(f);if(keys.has(bindings.backward))d.sub(f);if(keys.has(bindings.right))d.add(r);if(keys.has(bindings.left))d.sub(r);const moving=d.lengthSq()>0;const sprint=keys.has(bindings.sprint)&&stamina>0&&moving;playerNoise=sprint?1.5:moving?.75:0;if(moving&&!isHiding)d.normalize();if(isHiding)d.set(0,0,0);stamina=Math.max(0,Math.min(100,stamina+(sprint?-34:22)*dt));const move=d.multiplyScalar((sprint?walkSpeed*1.77:walkSpeed)*dt),x=camera.position.clone(),z=camera.position.clone();x.x+=move.x;z.z+=move.z;if(!collides(x))camera.position.x=x.x;if(!collides(z))camera.position.z=z.z;camera.position.y=1.65;$('#stamina b').style.width=stamina+'%';}
if(playing){$('#minimap-wrap').style.display='block';drawMaps();updateEspHighlights();}else{espOverlay.style.display='none';if(menu.classList.contains('visible')||pauseUI.classList.contains('visible')||$('#settings').classList.contains('visible'))$('#minimap-wrap').style.display='none';}renderer.render(scene,camera);}requestAnimationFrame(animate);
$('#import-map').onclick=()=>($('#map-file') as HTMLInputElement).click();
(document.querySelector<HTMLInputElement>('#map-file')!).onchange=async e=>{const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;try{let data:any;if(f.name.endsWith('.backrooms')){const zip=await JSZip.loadAsync(f);const entry=zip.file('map.json');if(!entry)throw new Error('map.json missing from package');data=JSON.parse(await entry.async('text'));}else data=JSON.parse(await f.text());const shapes=data?.data?.shapes??data?.shapes;if(!Array.isArray(shapes))throw new Error('No supported NullZoner shapes found');clearWorld();addBox(240,.2,120,120,-.12,60,floorMat);addBox(240,.2,120,120,3.25,60,ceilMat);let count=0;for(const s of shapes){if((s.kind??s.type)!=='rect'||!s.position||!s.size)continue;const x=Number(s.position.x),z=Number(s.position.z),w=Number(s.size.w),d=Number(s.size.d);if(![x,z,w,d].every(Number.isFinite)||w<=0||d<=0)continue;addBox(w,3.15,d,x+w/2,1.575,z+d/2,wallMat,true);count++;}if(!count)throw new Error('No rectangular wall shapes found');camera.position.set(2,1.65,2);message('Imported map: '+count+' wall shapes.');}catch(err){message('Could not import map: '+(err instanceof Error?err.message:'invalid file'));} };
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
