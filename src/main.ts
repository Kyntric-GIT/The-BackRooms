import * as THREE from 'three';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="game">
    <div id="hud">
      <div class="brand">THE BACKROOMS <span>LEVEL 0</span></div>
      <div class="hud-right"><span id="light-status">FLASHLIGHT: OFF [F]</span><span id="stamina">STAMINA <i><b></b></i></span></div>
    </div>
    <div id="crosshair"></div>
    <div id="vignette"></div>
    <div id="menu" class="visible">
      <div class="menu-panel">
        <p class="eyebrow">YOU HAVE NO CLIPPed OUT OF REALITY</p>
        <h1>THE<br><em>BACKROOMS</em></h1>
        <p class="subtitle">There is no way out. Keep moving.</p>
        <button id="start">ENTER LEVEL 0</button>
        <p class="controls">WASD — MOVE &nbsp; · &nbsp; MOUSE — LOOK<br>SHIFT — SPRINT &nbsp; · &nbsp; F — FLASHLIGHT<br>ESC — PAUSE</p>
      </div>
    </div>
    <div id="notice">Find a way out.</div>
    <input id="map-file" type="file" accept=".backrooms,.json,application/json" hidden />
    <button id="import-map" title="Import a map file">IMPORT MAP</button>
    <div id="import-message"></div>
  </div>
`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaaa17b);
scene.fog = new THREE.Fog(0xaaa17b, 12, 48);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.65, 8);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.querySelector('#game')!.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffedc5, 0x4b4635, 1.25));
const ambient = new THREE.AmbientLight(0xffe9b5, 0.38);
scene.add(ambient);

const wallMat = new THREE.MeshStandardMaterial({ color: 0xb6aa78, roughness: 0.94 });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x756c50, roughness: 1 });
const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xbeb48a, roughness: 1 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x665e46, roughness: 1 });

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}

// A winding, open-ended starter layout. NullZoner map import will replace this block once
// we have a real exported sample and can confirm its file format.
box(44, 0.2, 44, floorMat, 0, -0.12, 0);
box(44, 0.2, 44, ceilingMat, 0, 3.25, 0);
const wallHeight = 3.15;
const wallThickness = 0.28;
const walls: THREE.Mesh[] = [];
function wall(x: number, z: number, width: number, depth: number) {
  const mesh = box(width, wallHeight, depth, wallMat, x, wallHeight / 2, z);
  walls.push(mesh);
}
wall(-8, 0, 0.3, 24); wall(8, -5, 0.3, 34);
wall(0, -12, 16, 0.3); wall(-3, 12, 10, 0.3);
wall(-12, -7, 0.3, 10); wall(3, 5, 0.3, 9);
wall(12, 8, 0.3, 12); wall(5, -1, 6, 0.3);
wall(-5, -4, 5, 0.3); wall(-1, 8, 0.3, 8);
wall(4, -9, 8, 0.3); wall(-11, 5, 6, 0.3);
for (let i = -2; i <= 2; i++) {
  box(0.08, 0.08, 0.08, trimMat, i * 3, 0.02, -15);
}

const ceilingLights: THREE.PointLight[] = [];
for (const [x, z] of [[-5, -5], [4, -7], [-5, 7], [5, 7], [0, -14], [-13, 0], [12, 0]] as number[][]) {
  const light = new THREE.PointLight(0xffe8a8, 34, 13, 1.7);
  light.position.set(x, 2.95, z);
  scene.add(light);
  ceilingLights.push(light);
  const fixture = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.07, 0.42),
    new THREE.MeshBasicMaterial({ color: 0xfff2c9 })
  );
  fixture.position.set(x, 3.12, z);
  scene.add(fixture);
}

const flashlight = new THREE.SpotLight(0xfff1cf, 0, 22, Math.PI / 7, 0.45, 1.3);
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
camera.add(flashlight);
camera.add(flashlight.target);
scene.add(camera);

const keys = new Set<string>();
let playing = false;
let flashlightOn = false;
let yaw = 0;
let pitch = 0;
let stamina = 100;
let lastTime = performance.now();
const menu = document.querySelector<HTMLElement>('#menu')!;
const lightStatus = document.querySelector<HTMLElement>('#light-status')!;
const staminaBar = document.querySelector<HTMLElement>('#stamina b')!;
const importMessage = document.querySelector<HTMLElement>('#import-message')!;

function startGame() {
  playing = true;
  menu.classList.remove('visible');
  renderer.domElement.requestPointerLock();
}
document.querySelector('#start')!.addEventListener('click', startGame);
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== renderer.domElement && playing) {
    playing = false;
    menu.classList.add('visible');
  }
});
document.addEventListener('mousemove', (event) => {
  if (!playing || document.pointerLockElement !== renderer.domElement) return;
  yaw -= event.movementX * 0.0022;
  pitch -= event.movementY * 0.0022;
  pitch = Math.max(-1.45, Math.min(1.45, pitch));
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
});
document.addEventListener('keydown', (event) => {
  keys.add(event.code);
  if (event.code === 'KeyF' && !event.repeat) {
    flashlightOn = !flashlightOn;
    flashlight.intensity = flashlightOn ? 85 : 0;
    lightStatus.textContent = `FLASHLIGHT: ${flashlightOn ? 'ON' : 'OFF'} [F]`;
  }
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && playing) document.exitPointerLock();
});

const playerRadius = 0.32;
const raycaster = new THREE.Raycaster();
function collides(position: THREE.Vector3) {
  for (const mesh of walls) {
    const bounds = new THREE.Box3().setFromObject(mesh);
    if (
      position.x + playerRadius > bounds.min.x &&
      position.x - playerRadius < bounds.max.x &&
      position.z + playerRadius > bounds.min.z &&
      position.z - playerRadius < bounds.max.z
    ) return true;
  }
  return false;
}

function animate(now: number) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  // Subtle fluorescent flicker.
  ceilingLights.forEach((light, index) => {
    const flicker = Math.sin(now * (0.0017 + index * 0.00013) + index * 8) > 0.997;
    light.intensity = flicker ? 5 : 34;
  });

  if (playing) {
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const direction = new THREE.Vector3();
    if (keys.has('KeyW') || keys.has('ArrowUp')) direction.add(forward);
    if (keys.has('KeyS') || keys.has('ArrowDown')) direction.sub(forward);
    if (keys.has('KeyD') || keys.has('ArrowRight')) direction.add(right);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) direction.sub(right);
    if (direction.lengthSq() > 0) direction.normalize();

    const sprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && stamina > 0 && direction.lengthSq() > 0;
    stamina = Math.max(0, Math.min(100, stamina + (sprinting ? -34 : 22) * dt));
    const speed = sprinting ? 6.2 : 3.5;
    const move = direction.multiplyScalar(speed * dt);
    const nextX = camera.position.clone(); nextX.x += move.x;
    const nextZ = camera.position.clone(); nextZ.z += move.z;
    if (!collides(nextX)) camera.position.x = nextX.x;
    if (!collides(nextZ)) camera.position.z = nextZ.z;
    camera.position.y = 1.65;
    staminaBar.style.width = `${stamina}%`;
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

document.querySelector('#import-map')!.addEventListener('click', () => {
  (document.querySelector('#map-file') as HTMLInputElement).click();
});
document.querySelector<HTMLInputElement>('#map-file')!.addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text) as { walls?: Array<{ x: number; z: number; width: number; depth: number; height?: number }> };
    if (!Array.isArray(data.walls)) throw new Error('No walls array found.');
    importMessage.textContent = 'This JSON uses the game interchange format. Native NullZoner .backrooms support needs a sample export to map its format safely.';
  } catch {
    importMessage.textContent = 'File received. We need to inspect a real NullZoner export before enabling its importer.';
  }
  importMessage.classList.add('show');
  setTimeout(() => importMessage.classList.remove('show'), 6500);
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
