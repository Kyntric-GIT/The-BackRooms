import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import JSZip from 'jszip';
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
function addBox(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material,solid=false){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;world.add(m);if(solid)walls.push(m);return m;}
function clearWorld(){while(world.children.length){const o=world.children[0];world.remove(o);if(o instanceof THREE.Mesh){o.geometry.dispose();}}walls.length=0;lights.length=0;}
function makeRoom(){clearWorld();addBox(44,.2,44,0,-.12,0,floorMat);addBox(44,.2,44,0,3.25,0,ceilMat);const h=3.15,t=.28;const wall=(x:number,z:number,w:number,d:number)=>addBox(w,h,d,x,h/2,z,wallMat,true);
wall(-8,0,t,24);wall(8,-5,t,34);wall(0,-12,16,t);wall(-3,12,10,t);wall(-12,-7,t,10);wall(3,5,t,9);wall(12,8,t,12);wall(5,-1,6,t);wall(-5,-4,5,t);wall(-1,8,t,8);wall(4,-9,8,t);wall(-11,5,6,t);
for(const [x,z] of [[-5,-5],[4,-7],[-5,7],[5,7],[0,-14],[-13,0],[12,0]] as number[][]){const l=new THREE.PointLight(0xffe8a8,32,14,1.7);l.position.set(x,2.95,z);world.add(l);lights.push(l);addBox(1.45,.07,.42,x,3.12,z,new THREE.MeshBasicMaterial({color:0xfff2c9}));}
}
makeRoom();
const flashlight=new THREE.SpotLight(0xfff1cf,0,24,Math.PI/7,.45,1.3);camera.add(flashlight);camera.add(flashlight.target);flashlight.target.position.set(0,0,-1);scene.add(camera);
const loader=new GLTFLoader();let wanderer:THREE.Group|null=null;let mixer:THREE.AnimationMixer|null=null;let actions:Record<string,THREE.AnimationAction>={};let actionName='';
loader.load(import.meta.env.BASE_URL+'models/Lonely_Wanderer.glb',g=>{wanderer=new THREE.Group();const model=g.scene;const b=new THREE.Box3().setFromObject(model),s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());const scale=2.15/Math.max(s.y,.001);model.scale.setScalar(scale);model.position.set(-c.x*scale,-b.min.y*scale,-c.z*scale);wanderer.add(model);wanderer.position.set(10,0,-10);scene.add(wanderer);mixer=new THREE.AnimationMixer(model);g.animations.forEach(a=>actions[a.name]=mixer!.clipAction(a));playAnim('Zombie_Walk');},undefined,e=>console.warn('Wanderer model could not load',e));
function playAnim(n:string){const a=actions[n];if(!a||actionName===n)return;a.reset().fadeIn(.2).play();if(actions[actionName])actions[actionName].fadeOut(.2);actionName=n;}
let level=0,playing=false,paused=false,inventoryOpen=false,flashOn=false,stamina=100,yaw=0,pitch=0,last=performance.now(),exitReady=false;
const keys=new Set<string>();const $=(s:string)=>document.querySelector<HTMLElement>(s)!;
const menu=$('#menu'),pauseUI=$('#pause'),inventoryUI=$('#inventory'),completeUI=$('#level-complete'),notice=$('#notice');
const message=(s:string)=>{notice.textContent=s;notice.classList.add('show');};
function setLevel(n:number){level=n;$('#level-name').textContent=['LEVEL 0 — LOBBY','LEVEL 1 — HABITUAL ROOMS','LEVEL 2 — SAFE ZONE','LEVEL 3 — THE EXIT'][n];makeRoom();camera.position.set(0,1.65,8);exitReady=false;if(wanderer)wanderer.visible=n===0;message(['Find a way out.','Something is watching.','This level seems safe.','You can see daylight ahead.'][n]);}
function begin(){playing=true;paused=false;menu.classList.remove('visible');pauseUI.classList.remove('visible');completeUI.classList.remove('visible');renderer.domElement.requestPointerLock();}
function pause(){if(!playing)return;paused=true;playing=false;pauseUI.classList.add('visible');if(document.pointerLockElement)document.exitPointerLock();}
function resume(){paused=false;pauseUI.classList.remove('visible');begin();}
function endLevel(){playing=false;document.exitPointerLock();completeUI.classList.add('visible');$('#complete-title').textContent=level===3?'TO BE CONTINUED':'LEVEL '+level+' COMPLETE';$('#complete-text').textContent=level===2?'A familiar doorway opens. Beyond it, the halls become darker.':level===3?'The exit was never an exit. Something moves behind the glass.':'You found a passage deeper into the Backrooms.';$('#next-level').textContent=level===3?'RETURN TO MAIN MENU':'ENTER NEXT LEVEL';}
$('#start').onclick=()=>{setLevel(0);begin();};$('#continue').onclick=()=>begin();$('#resume').onclick=()=>resume();$('#restart').onclick=()=>{setLevel(level);pauseUI.classList.remove('visible');begin();};$('#to-menu').onclick=()=>{playing=false;paused=false;document.exitPointerLock();pauseUI.classList.remove('visible');menu.classList.add('visible');};$('#close-inventory').onclick=()=>{inventoryOpen=false;inventoryUI.classList.remove('visible');begin();};
$('#next-level').onclick=()=>{completeUI.classList.remove('visible');if(level>=3){menu.classList.add('visible');return;}setLevel(level+1);begin();};
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==renderer.domElement&&playing){playing=false;paused=true;pauseUI.classList.add('visible');}});
document.addEventListener('mousemove',e=>{if(!playing||document.pointerLockElement!==renderer.domElement)return;yaw-=e.movementX*.0022;pitch=Math.max(-1.45,Math.min(1.45,pitch-e.movementY*.0022));camera.rotation.set(pitch,yaw,0,'YXZ');});
document.addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='Escape'&&playing)pause();if(e.code==='KeyF'&&!e.repeat){flashOn=!flashOn;flashlight.intensity=flashOn?85:0;$('#light-status').textContent='FLASHLIGHT: '+(flashOn?'ON':'OFF')+' [F]';}if(e.code==='KeyI'&&!e.repeat&&playing){inventoryOpen=!inventoryOpen;inventoryUI.classList.toggle('visible',inventoryOpen);if(inventoryOpen){playing=false;document.exitPointerLock();}else begin();}if(e.code==='KeyE'&&!e.repeat&&playing&&camera.position.length()<5){if(level<3)endLevel();else message('The exit door is locked. Something is on the other side.');}});
document.addEventListener('keyup',e=>keys.delete(e.code));document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause();});
const radius=.32;function collides(p:THREE.Vector3){for(const m of walls){const b=new THREE.Box3().setFromObject(m);if(p.x+radius>b.min.x&&p.x-radius<b.max.x&&p.z+radius>b.min.z&&p.z-radius<b.max.z)return true;}return false;}
function animate(now:number){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;mixer?.update(dt);
if(wanderer?.visible&&playing){const to=new THREE.Vector3(camera.position.x-wanderer.position.x,0,camera.position.z-wanderer.position.z),dist=to.length();if(dist<12){playAnim('Run_Stealth');const step=to.normalize().multiplyScalar(2.35*dt),next=wanderer.position.clone().add(step);if(!collides(next))wanderer.position.copy(next);wanderer.rotation.y=Math.atan2(step.x,step.z);}else playAnim('Zombie_Walk');}
lights.forEach((l,i)=>l.intensity=Math.sin(now*(.0017+i*.00013)+i*8)>.997?5:32);
if(playing){const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),r=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),d=new THREE.Vector3();if(keys.has('KeyW')||keys.has('ArrowUp'))d.add(f);if(keys.has('KeyS')||keys.has('ArrowDown'))d.sub(f);if(keys.has('KeyD')||keys.has('ArrowRight'))d.add(r);if(keys.has('KeyA')||keys.has('ArrowLeft'))d.sub(r);if(d.lengthSq())d.normalize();const sprint=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&stamina>0&&d.lengthSq()>0;stamina=Math.max(0,Math.min(100,stamina+(sprint?-34:22)*dt));const move=d.multiplyScalar((sprint?6.2:3.5)*dt),x=camera.position.clone(),z=camera.position.clone();x.x+=move.x;z.z+=move.z;if(!collides(x))camera.position.x=x.x;if(!collides(z))camera.position.z=z.z;camera.position.y=1.65;$('#stamina b').style.width=stamina+'%';}
renderer.render(scene,camera);}requestAnimationFrame(animate);
$('#import-map').onclick=()=>($('#map-file') as HTMLInputElement).click();
(document.querySelector<HTMLInputElement>('#map-file')!).onchange=async e=>{const f=(e.target as HTMLInputElement).files?.[0];if(!f)return;try{let data:any;if(f.name.endsWith('.backrooms')){const zip=await JSZip.loadAsync(f);const entry=zip.file('map.json');if(!entry)throw new Error('map.json missing from package');data=JSON.parse(await entry.async('text'));}else data=JSON.parse(await f.text());const shapes=data?.data?.shapes??data?.shapes;if(!Array.isArray(shapes))throw new Error('No supported NullZoner shapes found');clearWorld();addBox(240,.2,120,120,-.12,60,floorMat);addBox(240,.2,120,120,3.25,60,ceilMat);let count=0;for(const s of shapes){if(s.type!=='rect'||!s.position||!s.size)continue;const x=Number(s.position.x),z=Number(s.position.z),w=Number(s.size.w),d=Number(s.size.d);if(![x,z,w,d].every(Number.isFinite)||w<=0||d<=0)continue;addBox(w,3.15,d,x+w/2,1.575,z+d/2,wallMat,true);count++;}if(!count)throw new Error('No rectangular wall shapes found');camera.position.set(2,1.65,2);message('Imported map: '+count+' wall shapes.');}catch(err){message('Could not import map: '+(err instanceof Error?err.message:'invalid file'));} };
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
