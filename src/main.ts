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
  <section id="menu" class="visible"><div class="menu-panel"><p class="eyebrow">YOU HAVE NO CLIPPED OUT OF REALITY</p><h1>THE<br><em>BACKROOMS</em></h1><p class="subtitle">There is no way out. Keep moving.</p><button id="start">NEW GAME</button><button id="continue" class="secondary">CONTINUE</button><p class="controls">WASD — MOVE · MOUSE — LOOK<br>SHIFT — SPRINT · F — FLASHLIGHT · E — INTERACT<br>I — INVENTORY · ESC — PAUSE</p></div></section>
  <section id="pause" class="overlay"><div class="panel"><h2>PAUSED</h2><button id="resume">RESUME</button><button id="restart" class="secondary">RESTART LEVEL</button><button id="to-menu" class="secondary">MAIN MENU</button></div></section>
  <section id="inventory" class="overlay"><div class="panel"><h2>INVENTORY</h2><p>Items you discover will appear here.</p><div id="items"><span>Flashlight</span><span>Empty slot</span><span>Empty slot</span></div><button id="close-inventory">CLOSE [I]</button></div></section>
  <section id="level-complete" class="overlay"><div class="panel"><h2 id="complete-title">LEVEL COMPLETE</h2><p id="complete-text"></p><button id="next-level">CONTINUE</button></div></section>
  <input id="map-file" type="file" accept=".backrooms,.json,application/json" hidden/><button id="import-map">IMPORT MAP</button><div id="import-message"></div>
</div>`;

const game=document.querySelector<HTMLElement>('#backrooms-root')!;
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xaaa17b); scene.fog=new THREE.Fog(0xaaa17b,12,55);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.1,150); camera.position.set(0,1.65,8);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15; game.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffedc5,0x4b4635,1.15)); scene.add(new THREE.AmbientLight(0xffe9b5,.35));
const wallMat=new THREE.MeshStandardMaterial({color:0xb6aa78,roughness:.95}), floorMat=new THREE.MeshStandardMaterial({color:0x756c50,roughness:1}), ceilMat=new THREE.MeshStandardMaterial({color:0xbeb48a,roughness:1});
const walls:THREE.Mesh[]=[]; const lights:THREE.PointLight[]=[]; const world=new THREE.Group(); scene.add(world);
let exitPortal: THREE.Group | null = null;
function placeExit(x:number,z:number){if(exitPortal)scene.remove(exitPortal);const g=new THREE.Group();const frame=new THREE.Mesh(new THREE.TorusGeometry(1.05,.12,12,36),new THREE.MeshStandardMaterial({color:0x8b9c76,emissive:0x31482c,emissiveIntensity:1.5}));frame.position.y=1.35;g.add(frame);const glow=new THREE.Mesh(new THREE.PlaneGeometry(1.75,2.35),new THREE.MeshBasicMaterial({color:0x9bd6a0,transparent:true,opacity:.38,side:THREE.DoubleSide}));glow.position.set(0,1.35,-.03);g.add(glow);const lamp=new THREE.PointLight(0x9bd6a0,16,9);lamp.position.set(0,1.5,1);g.add(lamp);g.position.set(x,0,z);scene.add(g);exitPortal=g;}
function addBox(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material,solid=false){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;world.add(m);if(solid)walls.push(m);return m;}
function clearWorld(){while(world.children.length){const o=world.children[0];world.remove(o);if(o instanceof THREE.Mesh){o.geometry.dispose();}}walls.length=0;lights.length=0;}
function makeRoom(){clearWorld();addBox(44,.2,44,0,-.12,0,floorMat);addBox(44,.2,44,0,3.25,0,ceilMat);const h=3.15,t=.28;const wall=(x:number,z:number,w:number,d:number)=>addBox(w,h,d,x,h/2,z,wallMat,true);
wall(-8,0,t,24);wall(8,-5,t,34);wall(0,-12,16,t);wall(-3,12,10,t);wall(-12,-7,t,10);wall(3,5,t,9);wall(12,8,t,12);wall(5,-1,6,t);wall(-5,-4,5,t);wall(-1,8,t,8);wall(4,-9,8,t);wall(-11,5,6,t);
for(const [x,z] of [[-5,-5],[4,-7],[-5,7],[5,7],[0,-14],[-13,0],[12,0]] as number[][]){const l=new THREE.PointLight(0xffe8a8,32,14,1.7);l.position.set(x,2.95,z);world.add(l);lights.push(l);addBox(1.45,.07,.42,x,3.12,z,new THREE.MeshBasicMaterial({color:0xfff2c9}));}
}
makeRoom();
const flashlight=new THREE.SpotLight(0xfff1cf,0,24,Math.PI/7,.45,1.3);camera.add(flashlight);camera.add(flashlight.target);flashlight.target.position.set(0,0,-1);scene.add(camera);
function makeSmilerModel():THREE.Group{
 const g=new THREE.Group();
 const shadow=new THREE.Mesh(new THREE.SphereGeometry(.82,24,18),new THREE.MeshStandardMaterial({color:0x08070b,roughness:1,transparent:true,opacity:.96}));
 shadow.scale.set(1.05,1.35,.48);shadow.position.y=1.45;g.add(shadow);
 const face=new THREE.Mesh(new THREE.SphereGeometry(.58,24,16),new THREE.MeshBasicMaterial({color:0x050407}));face.scale.set(1.12,1,.18);face.position.set(0,1.85,-.38);g.add(face);
 const eyeMat=new THREE.MeshBasicMaterial({color:0xf4fff0});
 for(const x of [-.34,.34]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.115,16,12),eyeMat);eye.position.set(x,2.08,-.52);g.add(eye);}
 const points=[new THREE.Vector3(-.43,1.63,-.55),new THREE.Vector3(-.25,1.49,-.57),new THREE.Vector3(0,1.45,-.58),new THREE.Vector3(.25,1.49,-.57),new THREE.Vector3(.43,1.63,-.55)];
 const grin=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.055,8,false),new THREE.MeshBasicMaterial({color:0xeaffdf}));g.add(grin);
 for(let i=0;i<7;i++){const tooth=new THREE.Mesh(new THREE.BoxGeometry(.075,.13,.035),new THREE.MeshBasicMaterial({color:0xf4fff0}));tooth.position.set(-.3+i*.1,1.55,-.58);g.add(tooth);}
 const haze=new THREE.PointLight(0xd9ffe1,3,5);haze.position.set(0,1.8,-.8);g.add(haze);
 return g;
}
const loader=new GLTFLoader();let wanderer:THREE.Group|null=null;let smiler:THREE.Group|null=null;let mixer:THREE.AnimationMixer|null=null;let actions:Record<string,THREE.AnimationAction>={};let actionName='';
loader.load(import.meta.env.BASE_URL+'models/Lonely_Wanderer.glb',g=>{wanderer=new THREE.Group();const model=g.scene;const b=new THREE.Box3().setFromObject(model),s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());const scale=2.15/Math.max(s.y,.001);model.scale.setScalar(scale);model.position.set(-c.x*scale,-b.min.y*scale,-c.z*scale);wanderer.add(model);wanderer.position.set(18,0,18);wanderer.visible=level===0;scene.add(wanderer);mixer=new THREE.AnimationMixer(model);g.animations.forEach(a=>actions[a.name]=mixer!.clipAction(a));playAnim('Zombie_Walk');},undefined,e=>console.warn('Wanderer model could not load',e));
loader.load(import.meta.env.BASE_URL+'models/Smiler_Level1.glb',g=>{smiler=g.scene;const box=new THREE.Box3().setFromObject(smiler),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const scale=2.4/Math.max(size.y,.001);smiler.scale.setScalar(scale);smiler.position.set(18,0,18);smiler.visible=level===1;scene.add(smiler);},undefined,e=>{console.warn('Smiler model asset unavailable; using built-in 3D model',e);smiler=makeSmilerModel();smiler.position.set(18,0,18);smiler.visible=level===1;scene.add(smiler);});
function playAnim(n:string){const a=actions[n];if(!a||actionName===n)return;a.reset().fadeIn(.2).play();if(actions[actionName])actions[actionName].fadeOut(.2);actionName=n;}
let level=0,playing=false,paused=false,inventoryOpen=false,flashOn=false,stamina=100,yaw=0,pitch=0,last=performance.now(),exitReady=false;
const keys=new Set<string>();const $=(s:string)=>document.querySelector<HTMLElement>(s)!;
const menu=$('#menu'),pauseUI=$('#pause'),inventoryUI=$('#inventory'),completeUI=$('#level-complete'),notice=$('#notice');
const message=(s:string)=>{notice.textContent=s;notice.classList.add('show');};
async function loadUserMap(){
 clearWorld();
 const width=240,depth=120,ceiling=3.2;
 addBox(width,.2,depth,120,-.12,60,floorMat);
 addBox(width,.2,depth,120,ceiling,60,ceilMat);
 for(const [x,z,w,d] of level0Rects) addBox(w,ceiling-.2,d,x+w/2,(ceiling-.2)/2,z+d/2,wallMat,true);
 for(let x=18;x<240;x+=48){for(let z=18;z<120;z+=40){const light=new THREE.PointLight(0xffe8b2,18,20,1.6);light.position.set(x,ceiling-.45,z);world.add(light);lights.push(light);}}
 camera.position.set(2,1.65,2);
 placeExit(232,112);
 message('Original NullZoner map loaded — 382 map shapes.');
 return true;
}
function setLevel(n:number){level=n;$('#level-name').textContent=['LEVEL 0 — LOBBY','LEVEL 1 — HABITUAL ROOMS','LEVEL 2 — SAFE ZONE','LEVEL 3 — THE EXIT'][n];exitReady=false;scene.background=new THREE.Color(n===2?0x89917c:n===3?0x29252b:0xaaa17b);scene.fog=new THREE.Fog(n===2?0x89917c:n===3?0x29252b:0xaaa17b,12,55);if(n<=1){void loadUserMap();}else{makeRoom();camera.position.set(0,1.65,8);placeExit(0,-18);}if(wanderer)wanderer.visible=n===0;if(smiler)smiler.visible=n===1;message(['Find a way out.','Something is watching.','This level seems safe.','You can see daylight ahead.'][n]);}
function begin(){playing=true;paused=false;menu.classList.remove('visible');pauseUI.classList.remove('visible');completeUI.classList.remove('visible');renderer.domElement.requestPointerLock();}
function pause(){if(!playing)return;paused=true;playing=false;pauseUI.classList.add('visible');if(document.pointerLockElement)document.exitPointerLock();}
function resume(){paused=false;pauseUI.classList.remove('visible');begin();}
function endLevel(){playing=false;document.exitPointerLock();completeUI.classList.add('visible');$('#complete-title').textContent=level===3?'TO BE CONTINUED':'LEVEL '+level+' COMPLETE';$('#complete-text').textContent=level===2?'A familiar doorway opens. Beyond it, the halls become darker.':level===3?'The exit was never an exit. Something moves behind the glass.':'You found a passage deeper into the Backrooms.';$('#next-level').textContent=level===3?'RETURN TO MAIN MENU':'ENTER NEXT LEVEL';}
$('#start').onclick=()=>{setLevel(0);begin();};$('#continue').onclick=()=>begin();$('#resume').onclick=()=>resume();$('#restart').onclick=()=>{setLevel(level);pauseUI.classList.remove('visible');begin();};$('#to-menu').onclick=()=>{playing=false;paused=false;document.exitPointerLock();pauseUI.classList.remove('visible');menu.classList.add('visible');};$('#close-inventory').onclick=()=>{inventoryOpen=false;inventoryUI.classList.remove('visible');begin();};
$('#next-level').onclick=()=>{completeUI.classList.remove('visible');if(level>=3){menu.classList.add('visible');return;}setLevel(level+1);begin();};
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==renderer.domElement&&playing){playing=false;paused=true;pauseUI.classList.add('visible');}});
document.addEventListener('mousemove',e=>{if(!playing||document.pointerLockElement!==renderer.domElement)return;yaw-=e.movementX*.0022;pitch=Math.max(-1.45,Math.min(1.45,pitch-e.movementY*.0022));camera.rotation.set(pitch,yaw,0,'YXZ');});
document.addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='Escape'&&playing)pause();if(e.code==='KeyF'&&!e.repeat){flashOn=!flashOn;flashlight.intensity=flashOn?85:0;$('#light-status').textContent='FLASHLIGHT: '+(flashOn?'ON':'OFF')+' [F]';}if(e.code==='KeyI'&&!e.repeat&&playing){inventoryOpen=!inventoryOpen;inventoryUI.classList.toggle('visible',inventoryOpen);if(inventoryOpen){playing=false;document.exitPointerLock();}else begin();}if(e.code==='KeyE'&&!e.repeat&&playing&&exitPortal){const exitDistance=Math.hypot(camera.position.x-exitPortal.position.x,camera.position.z-exitPortal.position.z);if(exitDistance<3.5){if(level<3)endLevel();else message('The door opens onto an empty field. A shadow moves behind you. TO BE CONTINUED.');}else message('Find the glowing doorway to continue.');}});
document.addEventListener('keyup',e=>keys.delete(e.code));document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause();});
const radius=.32;function collides(p:THREE.Vector3){for(const m of walls){const b=new THREE.Box3().setFromObject(m);if(p.x+radius>b.min.x&&p.x-radius<b.max.x&&p.z+radius>b.min.z&&p.z-radius<b.max.z)return true;}return false;}
type MonsterState='patrol'|'investigate'|'search'|'chase'|'stalk';
type MonsterBrain={state:MonsterState;target:THREE.Vector3;lastKnown:THREE.Vector3;origin:THREE.Vector3;timer:number;think:number;};
const wandererBrain:MonsterBrain={state:'patrol',target:new THREE.Vector3(26,0,18),lastKnown:new THREE.Vector3(),origin:new THREE.Vector3(18,0,18),timer:0,think:0};
const smilerBrain:MonsterBrain={state:'stalk',target:new THREE.Vector3(18,0,18),lastKnown:new THREE.Vector3(),origin:new THREE.Vector3(18,0,18),timer:0,think:0};
const sightRay=new THREE.Raycaster();let playerNoise=0;
function hasSight(monster:THREE.Group,range:number,fov:number){const origin=monster.position.clone().add(new THREE.Vector3(0,1.45,0));const target=camera.position.clone();const delta=target.clone().sub(origin);const distance=delta.length();if(distance>range)return false;const forward=new THREE.Vector3(0,0,1).applyQuaternion(monster.quaternion).normalize();if(forward.dot(delta.clone().normalize())<Math.cos(fov/2))return false;sightRay.set(origin,delta.normalize());sightRay.far=Math.max(0,distance-.55);return sightRay.intersectObjects(walls,false).length===0;}
function playerLooksAt(monster:THREE.Group){const to=monster.position.clone().add(new THREE.Vector3(0,1.5,0)).sub(camera.position).normalize();const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();return forward.dot(to)>.91;}
function choosePatrolTarget(monster:THREE.Group,brain:MonsterBrain){for(let i=0;i<10;i++){const p=new THREE.Vector3(brain.origin.x+(Math.random()-.5)*30,0,brain.origin.z+(Math.random()-.5)*30);if(p.x>1&&p.x<239&&p.z>1&&p.z<119&&!collides(p)){brain.target.copy(p);return;}}brain.target.copy(monster.position);}
function moveMonster(monster:THREE.Group,target:THREE.Vector3,speed:number,dt:number){const delta=new THREE.Vector3(target.x-monster.position.x,0,target.z-monster.position.z);if(delta.length()<.05)return;delta.normalize();const step=delta.multiplyScalar(speed*dt);const next=monster.position.clone().add(step);if(!collides(next)){monster.position.copy(next);monster.rotation.y=Math.atan2(step.x,step.z);}else{const side=new THREE.Vector3(-step.z,0,step.x);const alternate=monster.position.clone().add(side);if(!collides(alternate)){monster.position.copy(alternate);monster.rotation.y=Math.atan2(side.x,side.z);}}}
function updateMonster(monster:THREE.Group,brain:MonsterBrain,kind:'wanderer'|'smiler',dt:number){
 const player=camera.position.clone();player.y=0;const distance=monster.position.distanceTo(player);const looking=playerLooksAt(monster);
 if(kind==='smiler'){
   brain.state='stalk';
   if(distance<24&&looking)return;
   if(distance<3.8){const away=monster.position.clone().sub(player).normalize();moveMonster(monster,monster.position.clone().add(away.multiplyScalar(8)),1.45,dt);}
   else if(distance<21){moveMonster(monster,player,1.35,dt);}
   else{brain.think-=dt;if(brain.think<=0||monster.position.distanceTo(brain.target)<1){choosePatrolTarget(monster,brain);brain.think=3+Math.random()*3;}moveMonster(monster,brain.target,.85,dt);}
   return;
 }
 const seen=hasSight(monster,16,Math.PI*.72);
 const heard=playerNoise>0&&distance<(playerNoise>1?19:11);
 if(seen){brain.state='chase';brain.lastKnown.copy(player);brain.timer=0;}
 else if(heard){brain.state='investigate';brain.lastKnown.copy(player);brain.timer=0;}
 else if(brain.state==='chase'){brain.state='search';brain.target.copy(brain.lastKnown);brain.timer=5;}
 if(brain.state==='patrol'){
   brain.think-=dt;if(brain.think<=0||monster.position.distanceTo(brain.target)<1){choosePatrolTarget(monster,brain);brain.think=2+Math.random()*3;}
   moveMonster(monster,brain.target,1.05,dt);playAnim('Zombie_Walk');
 }else if(brain.state==='chase'){
   moveMonster(monster,player,2.7,dt);playAnim('Run_Stealth');
 }else if(brain.state==='investigate'){
   moveMonster(monster,brain.lastKnown,1.7,dt);playAnim('Zombie_Walk');
   if(monster.position.distanceTo(brain.lastKnown)<1.3){brain.state='search';brain.timer=4;}
 }else if(brain.state==='search'){
   brain.timer-=dt;brain.think-=dt;
   if(brain.think<=0||monster.position.distanceTo(brain.target)<.8){const a=Math.random()*Math.PI*2;brain.target.set(brain.lastKnown.x+Math.cos(a)*3,0,brain.lastKnown.z+Math.sin(a)*3);brain.think=1.2;}
   moveMonster(monster,brain.target,1.0,dt);playAnim('Zombie_Walk');
   if(brain.timer<=0){brain.state='patrol';brain.think=0;}
 }
}
function animate(now:number){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;mixer?.update(dt);
if(playing){if(smiler?.visible)updateMonster(smiler,smilerBrain,'smiler',dt);if(wanderer?.visible)updateMonster(wanderer,wandererBrain,'wanderer',dt);}
lights.forEach((l,i)=>l.intensity=Math.sin(now*(.0017+i*.00013)+i*8)>.997?5:32);
if(playing){const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),r=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),d=new THREE.Vector3();if(keys.has('KeyW')||keys.has('ArrowUp'))d.add(f);if(keys.has('KeyS')||keys.has('ArrowDown'))d.sub(f);if(keys.has('KeyD')||keys.has('ArrowRight'))d.add(r);if(keys.has('KeyA')||keys.has('ArrowLeft'))d.sub(r);const moving=d.lengthSq()>0;const sprint=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&stamina>0&&moving;playerNoise=sprint?1.5:moving?.75:0;if(moving)d.normalize();stamina=Math.max(0,Math.min(100,stamina+(sprint?-34:22)*dt));const move=d.multiplyScalar((sprint?6.2:3.5)*dt),x=camera.position.clone(),z=camera.position.clone();x.x+=move.x;z.z+=move.z;if(!collides(x))camera.position.x=x.x;if(!collides(z))camera.position.z=z.z;camera.position.y=1.65;$('#stamina b').style.width=stamina+'%';}
renderer.render(scene,camera);}requestAnimationFrame(animate);
$('#import-map').onclick=()=>($('#map-file') as HTMLInputElement).click();
(document.querySelector<HTMLInputElement>('#map-file')!).onchange=async e=>{const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;try{let data:any;if(f.name.endsWith('.backrooms')){const zip=await JSZip.loadAsync(f);const entry=zip.file('map.json');if(!entry)throw new Error('map.json missing from package');data=JSON.parse(await entry.async('text'));}else data=JSON.parse(await f.text());const shapes=data?.data?.shapes??data?.shapes;if(!Array.isArray(shapes))throw new Error('No supported NullZoner shapes found');clearWorld();addBox(240,.2,120,120,-.12,60,floorMat);addBox(240,.2,120,120,3.25,60,ceilMat);let count=0;for(const s of shapes){if((s.kind??s.type)!=='rect'||!s.position||!s.size)continue;const x=Number(s.position.x),z=Number(s.position.z),w=Number(s.size.w),d=Number(s.size.d);if(![x,z,w,d].every(Number.isFinite)||w<=0||d<=0)continue;addBox(w,3.15,d,x+w/2,1.575,z+d/2,wallMat,true);count++;}if(!count)throw new Error('No rectangular wall shapes found');camera.position.set(2,1.65,2);message('Imported map: '+count+' wall shapes.');}catch(err){message('Could not import map: '+(err instanceof Error?err.message:'invalid file'));} };
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
