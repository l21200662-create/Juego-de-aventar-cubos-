import * as THREE from 'three';

const host = document.querySelector('#scene');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const messageEl = document.querySelector('#message');
const button = document.querySelector('#throw-button');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#101827');
scene.fog = new THREE.Fog('#101827', 18, 42);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 100);
camera.position.set(8, 8, 13);
camera.lookAt(0, 3, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
host.append(renderer.domElement);
scene.add(new THREE.HemisphereLight('#d9f6ff', '#223044', 2));
const sun = new THREE.DirectionalLight('#fff1d0', 3.2);
sun.position.set(-5, 12, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#172338', roughness: .85 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -.08; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(80, 80, '#38506a', '#22344a'); grid.position.y = -.06; scene.add(grid);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const base = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: '#263a53', roughness: .38, metalness: .2 }));
base.position.set(0, .35, 0); base.scale.set(2.2, .7, 2.2); base.receiveShadow = true; base.castShadow = true; scene.add(base);
const blocks = [];
const palette = ['#62e6d4','#ffb86b','#a78bfa','#ff6b8a','#72b7ff','#d9f36a','#ff83df'];
let score = 0, best = Number(localStorage.getItem('cubo-record') || 0), busy = false, audio;
bestEl.textContent = best;

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
  const color = palette[score % palette.length];
  const material = new THREE.MeshStandardMaterial({ color, roughness: .28, metalness: .12, emissive: color, emissiveIntensity: .08 });
  const cube = new THREE.Mesh(boxGeo, material);
  cube.castShadow = true; cube.receiveShadow = true;
  cube.position.set(0, 7 + Math.min(score * .15, 3), 5.8);
  cube.rotation.set(.15, .18, .08);
  scene.add(cube);
  const start = performance.now(), duration = 1300;
  const startY = cube.position.y, landingY = 1.2 + score;
  messageEl.textContent = '¡Cubo en el aire!';
  sound(560, .18, 'triangle', .07);
  function fall(now) {
    const t = Math.min((now - start) / duration, 1);
    cube.position.z = 5.8 * (1 - t);
    cube.position.y = landingY + (startY - landingY) * (1 - t) ** 2;
    cube.rotation.x += .045; cube.rotation.z += .035;
    if (t < 1) { requestAnimationFrame(fall); return; }
    cube.position.set(0, landingY, 0); cube.rotation.set(0, 0, 0);
    blocks.push(cube); score++; scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('cubo-record', best); }
    messageEl.textContent = '¡Cayó y cambió de color!';
    sound(220 + score * 28, .28, 'sine', .18);
    camera.position.y = Math.max(8, score + 7); camera.lookAt(0, score / 2 + 2, 0);
    busy = false; button.disabled = false;
  }
  requestAnimationFrame(fall);
}
button.addEventListener('click', throwCube);
renderer.domElement.addEventListener('click', throwCube);
addEventListener('keydown', event => { if (event.code === 'Space') { event.preventDefault(); throwCube(); } });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
function animate() { renderer.render(scene, camera); requestAnimationFrame(animate); }
animate();
