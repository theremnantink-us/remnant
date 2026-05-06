import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('hero-canvas');
const heroEl = document.getElementById('hero');

/* ── Renderer ── */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setClearColor(0x000000, 0); // прозрачный фон — текст героя виден сквозь canvas
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

/* ── Scene ── */
const scene = new THREE.Scene();
// Без scene.background — canvas прозрачен, HTML-фон (#080808) просвечивает
scene.fog = new THREE.FogExp2(0x080808, 0.14);

/* ── Camera ── */
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
camera.position.set(0, 0.0, 3.8);

/* ── Lights ── */
scene.add(new THREE.AmbientLight(0x1a1520, 2.5));

const key = new THREE.DirectionalLight(0xfff6e8, 5.5);
key.position.set(3.5, 7, 4.5);
scene.add(key);

const fill = new THREE.DirectionalLight(0x8090c0, 1.2);
fill.position.set(-4, 1, 3);
scene.add(fill);
                  
const rim = new THREE.DirectionalLight(0x5060c8, 2.2);
rim.position.set(-2, 4, -6);
scene.add(rim);

const bot = new THREE.DirectionalLight(0x80600a, 0.3);
bot.position.set(0, -5, 2);
scene.add(bot);

/* Cursor-reactive point light — warm gold, follows mouse */
const cursorPL = new THREE.PointLight(0xc4a882, 0, 10);
cursorPL.position.set(0, 0, 3);
scene.add(cursorPL);

/* ── Mouse tracking ── */
const mouse = { x: 0, y: 0, tx: 0, ty: 0, speed: 0, prevX: 0, prevY: 0 };
document.addEventListener('mousemove', e => {
  const nx = (e.clientX / window.innerWidth - 0.5) * 2;
  const ny = (e.clientY / window.innerHeight - 0.5) * 2;
  mouse.speed = Math.sqrt((nx - mouse.tx) ** 2 + (ny - mouse.ty) ** 2);
  mouse.tx = nx;
  mouse.ty = ny;
}, { passive: true });

/* ── Resize ── */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

/* ── Load model ── */
let bust = null;
let bustBaseY = 0;
let bustBaseX = 0;
const rotProxy = { y: 4.2, z: 0 }; // лицо ~¾ к зрителю
const BASE_ROT_X = -0.08; // лёгкий наклон вниз
const FRAMING_TARGET = new THREE.Vector3(0, -0.5, 0);
let floatTime = 0;

function showHeroText() {
  const heroText = document.getElementById('hero-text');
  heroText.style.transition = 'opacity 1.5s ease, transform 1.5s ease';
  heroText.style.opacity = '1';
  heroText.style.transform = 'none';
}

const loader = new GLTFLoader();
loader.load(
  '/source/female_head_usdz.glb',
  gltf => {
    bust = gltf.scene;

    // Normalize to unit size
    const box = new THREE.Box3().setFromObject(bust);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2.2 / maxDim;
    bust.scale.setScalar(scale);

    // Center at origin
    const center = box.getCenter(new THREE.Vector3());
    bust.position.sub(center.multiplyScalar(scale));

    bust.position.x += 0;
    bust.position.y -= 0.65;

    // Store base position for float animation
    bustBaseY = bust.position.y;
    bustBaseX = bust.position.x;

    // Сохраняем встроенный GLB-материал (текстуры уже корректны из USDZ),
    // только выключаем тени
    bust.traverse(child => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    bust.rotation.x = BASE_ROT_X;
    bust.rotation.y = rotProxy.y;
    scene.add(bust);
    setupTextureScroll(bust);   // ← progressive texture reveal
    showHeroText();

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      // Proxy for cinematic camera (position + orbit offset)
      const camProxy = { x: 0, y: 0.1, z: camera.position.z };

      const startY = rotProxy.y; // 4.2 — ¾ лицо
      const PI = Math.PI;
      const FULL = PI * 2; // полный оборот

      const scrollTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 3,
          onUpdate: self => {
            // 3D canvas всегда поверх фона, ниже контент-карточек (z-index 15+)
            const rootStyle = document.documentElement.style;
            rootStyle.setProperty('--canvas-z', self.progress > 0.005 ? '8' : '2');
          }
        }
      });

      scrollTimeline
        // ── 1. Intro drift (0–10%) — медленный наезд, лёгкий поворот ──
        .to(rotProxy,  { y: startY - 0.5, duration: 0.10, ease: 'power1.inOut' }, 0)
        .to(camProxy,  { z: 3.2, duration: 0.10, ease: 'sine.inOut' }, 0)

        // ── 2. Profile snap (10–22%) — резкий переход на левый профиль ──
        .to(rotProxy,  { y: startY - PI * 0.5, duration: 0.12, ease: 'power3.inOut' }, 0.10)
        .to(rotProxy,  { z: 0.03, duration: 0.06, ease: 'power2.out' }, 0.10) // dutch angle
        .to(camProxy,  { z: 2.4, x: 0.15, duration: 0.12, ease: 'power2.inOut' }, 0.10)

        // ── 3. Back reveal (22–40%) — плавный разворот на затылок (ТАТУ) ──
        .to(rotProxy,  { y: startY - PI, z: 0, duration: 0.18, ease: 'sine.inOut' }, 0.22)
        .to(camProxy,  { z: 3.2, x: 0, duration: 0.18, ease: 'sine.inOut' }, 0.22)

        // ── 4. Hold tattoo (40–50%) — пауза на затылке, зум на тату ──
        .to(rotProxy,  { y: startY - PI - 0.3, duration: 0.10, ease: 'sine.inOut' }, 0.40)
        .to(camProxy,  { z: 2.6, y: 0.0, duration: 0.10, ease: 'power1.inOut' }, 0.40)

        // ── 5. Whip pan (50–62%) — хлёст на правый профиль ──
        .to(rotProxy,  { y: startY - PI * 1.5, z: -0.04, duration: 0.12, ease: 'power3.in' }, 0.50)
        .to(camProxy,  { z: 3.8, x: -0.12, y: 0.1, duration: 0.12, ease: 'power2.inOut' }, 0.50)

        // ── 6. Dramatic return (62–80%) — возврат к лицу, крупный план ──
        .to(rotProxy,  { y: startY - FULL + 0.3, z: 0, duration: 0.18, ease: 'power2.inOut' }, 0.62)
        .to(camProxy,  { z: 2.2, x: 0, y: 0.15, duration: 0.18, ease: 'power2.inOut' }, 0.62)

        // ── 7. Final settle (80–100%) — отъезд, финальная позиция ──
        .to(rotProxy,  { y: startY - FULL, duration: 0.20, ease: 'sine.inOut' }, 0.80)
        .to(camProxy,  { z: 3.8, x: 0, y: 0.1, duration: 0.20, ease: 'sine.inOut' }, 0.80);

      // REMNANT уходит за 3D модель — scale вверх + blur + opacity
      // canvas z=10 уже перекрывает hero-content z=1, поэтому title визуально
      // тонет в сцене как будто уходит за скульптуру
      gsap.to('#hero-text', {
        opacity: 0,
        scale: 1.08,
        filter: 'blur(4px)',
        ease: 'power1.in',
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: '38% top',
          scrub: 1.5
        }
      });

      // Применяем proxy-значение z в рендер-цикле
      camera.userData.camProxy = camProxy;
    }
  },
  undefined,
  err => {
    console.warn('Model not loaded (need local server). Showing particle fallback.');
    showParticles();
    showHeroText();
  }
);

/* ══════════════════════════════════════════════════════════
   TATTOO REVEAL — 7 состояний (head0..head6)
   Одна геометрия, текстура меняется при скролле.
   Переход: cross-dissolve через второй «transition» меш.
   Состояние 0 — чистая кожа, 1–6 — по одному тату.
   Последнее (6) появляется у футера (~90% прокрутки).
══════════════════════════════════════════════════════════ */

async function setupTextureScroll(bustGroup) {
  let headMesh = null;
  bustGroup.traverse(child => { if (child.isMesh) headMesh = child; });
  if (!headMesh) return;

  // Делаем материал уникальным, чтобы менять .map без side-effects
  headMesh.material = headMesh.material.clone();

  // Загрузка текстуры (GLB-конвенция: flipY=false, SRGB для color, linear для data)
  function loadTex(url, srgb = true) {
    return new Promise(resolve => {
      new THREE.TextureLoader().load(url, tex => {
        tex.flipY      = false;
        tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        resolve(tex);
      }, undefined, () => resolve(null));
    });
  }

  // Грузим все 7 состояний в фоне — порядок: 6→0 (много тату → чистая кожа наоборот)
  // state[0] = head6 (все тату), state[6] = head0 (чистая кожа)
  const states = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const idx = 6 - i; // реверс: 0→6, 1→5, ..., 6→0
      return Promise.all([
        loadTex(`/textures/head${idx}-color.png`,     true),
        loadTex(`/textures/head${idx}-roughness.png`, false),
        loadTex(`/textures/head${idx}-metallic.png`,  false),
      ]);
    })
  );

  // Применяем state 0 к базовому мешу (если GLB-текстура уже корректна — не трогаем)
  const [c0, r0, m0] = states[0];
  if (c0) {
    headMesh.material.map          = c0;
    headMesh.material.roughnessMap = r0 || null;
    headMesh.material.metalnessMap = m0 || null;
    headMesh.material.color.set(0xffffff);
    headMesh.material.needsUpdate  = true;
  }

  // «Transition mesh» — второй меш поверх базового для cross-dissolve
  const transMat = new THREE.MeshStandardMaterial({
    transparent:         true,
    opacity:             0,
    depthWrite:          false,
    polygonOffset:       true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits:  -1,
  });
  const transMesh = new THREE.Mesh(headMesh.geometry, transMat);
  transMesh.position.copy(headMesh.position);
  transMesh.rotation.copy(headMesh.rotation);
  transMesh.scale.copy(headMesh.scale);
  transMesh.visible = false;
  headMesh.parent.add(transMesh);

  let currentState = 0;
  let targetState  = 0;
  let transitioning = false;

  function doTransition(next) {
    const [cn, rn, mn] = states[next] || [];
    if (!cn) { currentState = next; transitioning = false; checkNext(); return; }

    transMat.map          = cn;
    transMat.roughnessMap = rn || null;
    transMat.metalnessMap = mn || null;
    transMat.roughness    = headMesh.material.roughness;
    transMat.metalness    = headMesh.material.metalness;
    transMat.color.set(0xffffff);
    transMat.needsUpdate  = true;
    transMesh.visible     = true;

    gsap.fromTo(transMat, { opacity: 0 }, {
      opacity:  1,
      duration: 0.55,
      ease:     'power2.inOut',
      onComplete() {
        // Swap: переносим текстуру на базовый меш, сбрасываем transition
        headMesh.material.map          = cn;
        headMesh.material.roughnessMap = rn || null;
        headMesh.material.metalnessMap = mn || null;
        headMesh.material.needsUpdate  = true;
        transMat.opacity  = 0;
        transMesh.visible = false;
        currentState      = next;
        transitioning     = false;
        checkNext();
      }
    });
  }

  function checkNext() {
    if (transitioning || targetState === currentState) return;
    transitioning = true;
    doTransition(targetState);
  }

  if (!window.gsap || !window.ScrollTrigger) return;

  // Пороги: state 0 сразу, state 1–6 от 12% до 88%
  const thresholds = [0, 0.12, 0.25, 0.40, 0.56, 0.72, 0.88];

  function stateForProgress(p) {
    let t = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (p >= thresholds[i]) t = i;
    }
    return t;
  }

  let maxProgress  = 0;  // максимально достигнутый прогресс — тату не уходят назад
  let resetTimer   = null;
  const RESET_DELAY = 7000; // 7 секунд до исчезновения

  ScrollTrigger.create({
    trigger: document.body,
    start:   'top top',
    end:     'bottom bottom',
    onUpdate(self) {
      const p = self.progress;

      // Прогресс только вперёд — при скролле назад тату остаются
      if (p > maxProgress) maxProgress = p;

      const t = stateForProgress(maxProgress);
      if (t !== targetState) {
        targetState = t;
        checkNext();
      }

      // Сброс таймера при любом скролле
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        // Через 7 сек без скролла — откатываем к реальной позиции
        maxProgress = p;
        const newTarget = stateForProgress(p);
        if (newTarget !== targetState) {
          targetState = newTarget;
          checkNext();
        }
      }, RESET_DELAY);
    }
  });
}

/* ── Particle fallback ── */
function showParticles() {
  const geo = new THREE.BufferGeometry();
  const count = 3000;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 8;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xc4a882, size: 0.025, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(geo, mat));
}

/* ── Visibility-aware animation loop ── */
const clock = new THREE.Clock();
let heroVisible = true;

// Pause rendering when hero canvas is off-screen
const heroObserver = new IntersectionObserver(entries => {
  heroVisible = entries[0].isIntersecting;
  if (heroVisible) clock.getDelta(); // reset delta to avoid jump
}, { threshold: 0 });
heroObserver.observe(canvas);

function animate() {
  requestAnimationFrame(animate);

  // Skip all work when canvas is off-screen
  if (!heroVisible) return;

  const dt = clock.getDelta();
  floatTime += dt;

  // Smooth mouse lerp
  mouse.x += (mouse.tx - mouse.x) * 0.04;
  mouse.y += (mouse.ty - mouse.y) * 0.04;

  if (bust) {
    bust.rotation.x = BASE_ROT_X + mouse.y * 0.09;
    bust.rotation.y = rotProxy.y + mouse.x * 0.13;
    bust.rotation.z = rotProxy.z;
    // Absolute float — no cumulative drift
    bust.position.y = bustBaseY + Math.sin(floatTime * 0.6) * 0.04;
  }

  // Cursor point light: follows mouse, intensity driven by distance from center
  const dist = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
  cursorPL.position.set(mouse.x * 3.5, -mouse.y * 2.5, 3.2);
  cursorPL.intensity += (dist * 3.5 + mouse.speed * 8 - cursorPL.intensity) * 0.06;

  // Camera: cinematic orbit + mouse drift
  const cp = camera.userData.camProxy;
  if (cp) {
    const tx = cp.x + mouse.tx * 0.08;
    const ty = cp.y - mouse.ty * 0.05;
    camera.position.x += (tx - camera.position.x) * 0.03;
    camera.position.y += (ty - camera.position.y) * 0.03;
    camera.position.z += (cp.z - camera.position.z) * 0.05;
  } else {
    camera.position.x += (mouse.tx * 0.08 - camera.position.x) * 0.015;
    camera.position.y += (-mouse.ty * 0.05 + 0.1 - camera.position.y) * 0.015;
  }

  camera.lookAt(FRAMING_TARGET);

  renderer.render(scene, camera);
}
animate();
