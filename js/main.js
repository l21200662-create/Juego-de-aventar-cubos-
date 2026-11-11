import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const host = document.querySelector('#scene');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const messageEl = document.querySelector('#message');
const button = document.querySelector('#throw-button');
const levelEl = document.querySelector('#level');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#10051f');
scene.fog = new THREE.Fog('#10051f', 21, 48);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 100);
camera.position.set(8, 8, 13);
camera.lookAt(0, 3, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.xr.enabled = true;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
host.append(renderer.domElement);
document.body.append(VRButton.createButton(renderer));
scene.add(new THREE.HemisphereLight('#ffd9ff', '#311355', 2.6));
const sun = new THREE.DirectionalLight('#fff0a8', 3.6);
sun.position.set(-5, 12, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun);
const pinkLight = new THREE.PointLight('#ff36bd', 36, 18); pinkLight.position.set(5, 4, 1); scene.add(pinkLight);
const cyanLight = new THREE.PointLight('#31f4e0', 26, 16); cyanLight.position.set(-4, 3, -2); scene.add(cyanLight);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#23104a', roughness: .68, metalness: .15 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -.08; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(80, 80, '#ff43c6', '#6840ad'); grid.position.y = -.06; scene.add(grid);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const base = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: '#5716a6', emissive: '#340b74', emissiveIntensity: .38, roughness: .3, metalness: .22 }));
base.position.set(0, .35, 0); base.scale.set(2.2, .7, 2.2); base.receiveShadow = true; base.castShadow = true; scene.add(base);
const platformGlow = new THREE.Mesh(new THREE.TorusGeometry(1.56, .045, 10, 64), new THREE.MeshBasicMaterial({ color: '#a84cff' }));
platformGlow.rotation.x = Math.PI / 2; platformGlow.position.y = .012; scene.add(platformGlow);
const blocks = [];
const palette = ['#62e6d4','#ffb86b','#a78bfa','#ff6b8a','#72b7ff','#d9f36a','#ff83df'];
let score = 0, best = Number(localStorage.getItem('cubo-record') || 0), busy = false, audio;
bestEl.textContent = best;
const target = new THREE.Mesh(
  new THREE.RingGeometry(.78, .94, 48),
  new THREE.MeshBasicMaterial({ color: '#ff3ec9', side: THREE.DoubleSide, transparent: true, opacity: .98 })
);
target.rotation.x = -Math.PI / 2;
target.position.y = .015;
scene.add(target);
let gameTime = 0;
function targetXAt(time) {
  const speed = 1.35 + Math.min(score * .16, 2.5);
  return Math.sin(time * speed) * 2.35;
}
function hitTolerance() { return Math.max(.18, .9 - score * .055); }

function sound(frequency = 420, duration = .12, type = 'sine', volume = .12) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(70, frequency * .52), audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
  } catch { /* Audio puede no estar disponible en algunos navegadores. */ }
}
function throwCube() {
  if (busy) return;
  busy = true; button.disabled = true;
  const shotX = target.position.x;
  const hit = Math.abs(shotX) <= hitTolerance();
  const color = palette[score % palette.length];
  const material = new THREE.MeshStandardMaterial({ color, roughness: .25, metalness: .12, emissive: color, emissiveIntensity: .24 });
  const cube = new THREE.Mesh(boxGeo, material);
  cube.castShadow = true; cube.receiveShadow = true;
  cube.position.set(shotX, 7 + Math.min(score * .15, 3), 5.8);
  cube.rotation.set(.15, .18, .08);
  scene.add(cube);
  const start = performance.now(), duration = 1300;
  const startY = cube.position.y, landingY = hit ? 1.2 + score : .5;
  messageEl.textContent = '¡Cubo en el aire!';
  sound(560, .18, 'triangle', .07);
  function fall(now) {
    const t = Math.min((now - start) / duration, 1);
    cube.position.z = 5.8 * (1 - t);
    cube.position.y = landingY + (startY - landingY) * (1 - t) ** 2;
    cube.rotation.x += .045; cube.rotation.z += .035;
    if (t < 1) { requestAnimationFrame(fall); return; }
    cube.position.set(hit ? 0 : shotX, landingY, 0); cube.rotation.set(0, 0, 0);
    if (!hit) {
      messageEl.textContent = 'Falló. Espera a que el blanco cruce la torre.';
      sound(135, .35, 'square', .13);
      setTimeout(() => { scene.remove(cube); cube.material.dispose(); }, 900);
      busy = false; button.disabled = false;
      return;
    }
    blocks.push(cube); score++; scoreEl.textContent = score;
    levelEl.textContent = Math.floor(score / 3) + 1;
    if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('cubo-record', best); }
    messageEl.textContent = `¡Acierto! Nivel ${Math.floor(score / 3) + 1}: el blanco va más rápido.`;
    sound(220 + score * 28, .28, 'sine', .18);
    camera.position.y = Math.max(8, score + 7); camera.lookAt(0, score / 2 + 2, 0);
    busy = false; button.disabled = false;
  }
  requestAnimationFrame(fall);
}
button.addEventListener('click', throwCube);
renderer.domElement.addEventListener('click', throwCube);
addEventListener('keydown', event => { if (event.code === 'Space') { event.preventDefault(); throwCube(); } });
for (let index = 0; index < 2; index++) {
  const controller = renderer.xr.getController(index);
  controller.addEventListener('selectstart', throwCube);
  scene.add(controller);
  const ray = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -3)]),
    new THREE.LineBasicMaterial({ color: '#63e6d2', transparent: true, opacity: .8 })
  );
  controller.add(ray);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
renderer.setAnimationLoop((time) => {
  gameTime = time / 1000;
  target.position.x = targetXAt(gameTime);
  const tolerance = hitTolerance();
  target.scale.setScalar(tolerance / .9);
  const aligned = Math.abs(target.position.x) <= tolerance;
  target.material.color.set(aligned ? '#caff38' : '#ff3ec9');
  renderer.render(scene, camera);
});
