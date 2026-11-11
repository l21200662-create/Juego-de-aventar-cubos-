import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const host = document.querySelector('#scene');
const scoreEl = document.querySelector('#score');
const bestEl = document.querySelector('#best');
const remainingEl = document.querySelector('#remaining');
const messageEl = document.querySelector('#message');
const launchButton = document.querySelector('#throw-button');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#071526');
scene.fog = new THREE.Fog('#103044', 32, 90);

// El recorte panorámico de la referencia se usa como cielo 360°.
new THREE.TextureLoader().load('./assets/world-panorama.jpg', texture => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
});

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, .1, 120);
camera.position.set(0, 1.7, 8);
camera.lookAt(0, 3.1, -8);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.xr.enabled = true;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.append(renderer.domElement);
document.body.append(VRButton.createButton(renderer));

scene.add(new THREE.HemisphereLight('#dbfaff', '#183042', 2.6));
const sun = new THREE.DirectionalLight('#fff0c1', 3.5);
sun.position.set(-7, 12, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun);
const cyanLight = new THREE.PointLight('#35f3ff', 22, 22); cyanLight.position.set(-5, 5, -4); scene.add(cyanLight);
const pinkLight = new THREE.PointLight('#ff55d4', 17, 20); pinkLight.position.set(5, 4, -6); scene.add(pinkLight);

const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 80), new THREE.MeshStandardMaterial({ color: '#172f39', roughness: .88, metalness: .08 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -.08; floor.receiveShadow = true; scene.add(floor);
const arena = new THREE.Mesh(new THREE.RingGeometry(7, 7.13, 96), new THREE.MeshBasicMaterial({ color: '#42f6e6', side: THREE.DoubleSide }));
arena.rotation.x = -Math.PI / 2; arena.position.y = .015; scene.add(arena);
const boxGeometry = new THREE.BoxGeometry(.38, .38, .38);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
const targets = [];
const targetColors = ['#ff45bd', '#f9ef46', '#48f4ff', '#ff8a3d', '#8c68ff'];
const targetPlaces = [new THREE.Vector3(-5, 3.7, -8), new THREE.Vector3(0, 3.25, -10), new THREE.Vector3(5, 4.1, -8.5)];
let score = 0;
let best = Number(localStorage.getItem('cubo-blancos-record') || 0);
let busy = false;
let hoveredTarget = null;
let audio;
scoreEl.textContent = score;
bestEl.textContent = best;

function makeTarget(position, index) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.userData.phase = index * 2.2;
  group.userData.baseX = position.x;
  group.userData.baseY = position.y;
  scene.add(group);

  const backing = new THREE.Mesh(new THREE.CylinderGeometry(.86, .86, .16, 48), new THREE.MeshStandardMaterial({ color: '#182333', roughness: .38, metalness: .38 }));
  backing.rotation.x = Math.PI / 2; backing.castShadow = true; backing.receiveShadow = true; group.add(backing);
  const ringSpecs = [
    { radius: .75, color: '#ff3ca6' },
    { radius: .55, color: '#ffe33d' },
    { radius: .35, color: '#36f5ef' },
    { radius: .16, color: '#fff8df' }
  ];
  for (const spec of ringSpecs) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(spec.radius, 48), new THREE.MeshStandardMaterial({ color: spec.color, emissive: spec.color, emissiveIntensity: .38, roughness: .3, side: THREE.DoubleSide }));
    disc.position.z = .095 + (0.75 - spec.radius) * .012; disc.castShadow = true; group.add(disc);
  }
  const hitbox = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  hitbox.position.z = .12; hitbox.userData.targetGroup = group; group.add(hitbox);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.045, .075, position.y - .6, 12), new THREE.MeshStandardMaterial({ color: '#66523a', roughness: .8 }));
  stem.position.set(0, -(position.y - .6) / 2, -.08); stem.castShadow = true; group.add(stem);
  const glow = new THREE.PointLight(targetColors[index % targetColors.length], 5, 4);
  glow.position.set(0, 0, 1); group.add(glow);
  const target = { group, hitbox, glow, index, active: true, restingScale: 1 };
  targets.push(target);
  return target;
}
targetPlaces.forEach(makeTarget);
remainingEl.textContent = targets.length;

const palette = ['#ff42b4', '#ffe545', '#40f2ff', '#88ff59', '#ff873f', '#a879ff'];
function playTone(frequency, duration = .2, kind = 'sine', volume = .15) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = kind;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(65, frequency * .48), audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(); oscillator.stop(audio.currentTime + duration);
  } catch { /* Algunos navegadores pueden tener el audio desactivado. */ }
}

function setAimFromScreen(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(targets.filter(t => t.active).map(t => t.hitbox), false)[0];
  hoveredTarget = hit?.object.userData.targetGroup ? targets.find(t => t.group === hit.object.userData.targetGroup) : null;
}

function respawnTarget(target) {
  const side = target.index % 2 === 0 ? -1 : 1;
  target.group.position.set(side * (2.7 + Math.random() * 2.4), 2.8 + Math.random() * 2.8, -6.5 - Math.random() * 5);
  target.group.userData.baseX = target.group.position.x;
  target.group.userData.baseY = target.group.position.y;
  target.group.userData.phase = Math.random() * 8;
  target.group.visible = true;
  target.group.scale.setScalar(.01);
  target.active = true;
  remainingEl.textContent = targets.filter(t => t.active).length;
}

function getShot(target, controller = null) {
  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3();
  if (controller) {
    controller.updateMatrixWorld(true);
    origin.setFromMatrixPosition(controller.matrixWorld);
    direction.set(0, 0, -1).applyQuaternion(controller.getWorldQuaternion(new THREE.Quaternion())).normalize();
    raycaster.set(origin, direction);
  } else {
    origin.setFromMatrixPosition(camera.matrixWorld);
    camera.getWorldDirection(direction);
    if (target) {
      direction.copy(target.group.position).add(new THREE.Vector3(0, 0, .12)).sub(origin).normalize();
    } else {
      raycaster.setFromCamera(pointer, camera);
      direction.copy(raycaster.ray.direction);
    }
    raycaster.set(origin, direction);
  }
  let chosen = target;
  if (!chosen) {
    const intersection = raycaster.intersectObjects(targets.filter(t => t.active).map(t => t.hitbox), false)[0];
    if (intersection) chosen = targets.find(t => t.group === intersection.object.userData.targetGroup);
  }
  return { origin, direction, target: chosen };
}

function throwCube(target = hoveredTarget, controller = null) {
  if (busy) return;
  busy = true;
  launchButton.disabled = true;
  const shot = getShot(target, controller);
  const destination = shot.target
    ? shot.target.group.position.clone().add(new THREE.Vector3(0, 0, .22))
    : shot.origin.clone().add(shot.direction.clone().multiplyScalar(18));
  const color = palette[score % palette.length];
  const cube = new THREE.Mesh(boxGeometry, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .3, roughness: .25, metalness: .12 }));
  cube.castShadow = true; cube.receiveShadow = true;
  cube.position.copy(shot.origin).add(shot.direction.clone().multiplyScalar(.65));
  scene.add(cube);
  const start = cube.position.clone();
  const duration = Math.min(1350, Math.max(620, start.distanceTo(destination) * 85));
  messageEl.textContent = shot.target ? '¡Cubo lanzado! Sigue su vuelo…' : 'El cubo pasó de largo. Apunta a los anillos.';
  playTone(shot.target ? 500 : 240, .16, 'triangle', .09);
  if (controller) {
    const source = controller.userData.inputSource;
    source?.gamepad?.hapticActuators?.[0]?.pulse?.(.4, 80);
  }
  const launchedAt = performance.now();
  function animateFlight(now) {
    const progress = Math.min((now - launchedAt) / duration, 1);
    cube.position.lerpVectors(start, destination, progress);
    cube.position.y += Math.sin(progress * Math.PI) * 1.6;
    cube.rotation.x += .12; cube.rotation.y += .16; cube.rotation.z += .1;
    if (progress < 1) { requestAnimationFrame(animateFlight); return; }
    if (shot.target && shot.target.active) {
      const struck = shot.target;
      struck.active = false; struck.group.visible = false;
      score++;
      scoreEl.textContent = score;
      if (score > best) {
        best = score; bestEl.textContent = best;
        localStorage.setItem('cubo-blancos-record', best);
      }
      remainingEl.textContent = targets.filter(t => t.active).length;
      messageEl.textContent = `¡Impacto! Blanco ${struck.index + 1}: +1 punto`;
      playTone(660 + (score % 6) * 90, .32, 'sine', .19);
      const hit = new THREE.PointLight(color, 38, 7); hit.position.copy(destination); scene.add(hit);
      setTimeout(() => { scene.remove(hit); hit.dispose?.(); respawnTarget(struck); }, 950);
    } else {
      messageEl.textContent = '¡Casi! Apunta al centro de un blanco y vuelve a lanzar.';
      playTone(150, .28, 'square', .1);
    }
    setTimeout(() => { scene.remove(cube); cube.material.dispose(); }, 450);
    busy = false; launchButton.disabled = false;
  }
  requestAnimationFrame(animateFlight);
}

renderer.domElement.addEventListener('pointermove', event => setAimFromScreen(event.clientX, event.clientY));
renderer.domElement.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  setAimFromScreen(event.clientX, event.clientY);
  throwCube(hoveredTarget);
});
launchButton.addEventListener('click', () => {
  throwCube(hoveredTarget || targets.find(t => t.index === 1 && t.active) || targets.find(t => t.active));
});
addEventListener('keydown', event => {
  if (event.code === 'Space') { event.preventDefault(); launchButton.click(); }
});

const controllers = [];
for (let index = 0; index < 2; index++) {
  const controller = renderer.xr.getController(index);
  controllers.push(controller);
  controller.addEventListener('connected', event => { controller.userData.inputSource = event.data; });
  controller.addEventListener('selectstart', () => {
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyQuaternion(controller.getWorldQuaternion(new THREE.Quaternion())).normalize();
    const hit = raycaster.intersectObjects(targets.filter(t => t.active).map(t => t.hitbox), false)[0];
    const target = hit ? targets.find(t => t.group === hit.object.userData.targetGroup) : null;
    throwCube(target, controller);
  });
  scene.add(controller);
  const beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -18)]), new THREE.LineBasicMaterial({ color: '#68fff2', transparent: true, opacity: .78 }));
  controller.add(beam);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
renderer.setAnimationLoop(time => {
  const seconds = time / 1000;
  if (renderer.xr.isPresenting) {
    hoveredTarget = null;
    for (const controller of controllers) {
      controller.updateMatrixWorld(true);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyQuaternion(controller.getWorldQuaternion(new THREE.Quaternion())).normalize();
      const hit = raycaster.intersectObjects(targets.filter(t => t.active).map(t => t.hitbox), false)[0];
      if (hit) {
        hoveredTarget = targets.find(t => t.group === hit.object.userData.targetGroup);
        break;
      }
    }
  }
  for (const target of targets) {
    if (!target.active) continue;
    target.group.position.x = target.group.userData.baseX + Math.sin(seconds * .6 + target.group.userData.phase) * .22;
    target.group.position.y = target.group.userData.baseY + Math.sin(seconds * .8 + target.group.userData.phase) * .14;
    const isAimed = hoveredTarget === target;
    const desiredScale = isAimed ? 1.12 : 1;
    target.group.scale.lerp(new THREE.Vector3(desiredScale, desiredScale, desiredScale), .12);
    target.glow.intensity = isAimed ? 12 : 5;
  }
  renderer.render(scene, camera);
});
