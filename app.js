// 종묘제례악 악기 연주 — 스크래치 작품(.sb3)을 웹으로 옮긴 버전.
// 좌표계는 스크래치와 같다: 무대 480×360, 가운데가 (0,0), 위쪽이 +y.
'use strict';

const W = 480, H = 360;
const ASSET = 'assets/';

// 모양: [파일, 회전중심X, 회전중심Y, 해상도] — sb3의 costume 값 그대로
const C = (file, rcx, rcy, res = 2) => ({ file, rcx, rcy, res });

// 편종·편경 음: 왼쪽부터 원작 배치 순서, 키보드 A~J
const NOTES = [
  { id: 'cheongtae',   name: '청태', key: 'a' },
  { id: 'cheonghwang', name: '청황', key: 's' },
  { id: 'nam',         name: '남',   key: 'd' },
  { id: 'im',          name: '임',   key: 'f' },
  { id: 'jung',        name: '중',   key: 'g' },
  { id: 'tae',         name: '태',   key: 'h' },
  { id: 'hwang',       name: '황',   key: 'j' },
];
const JONG_X = [-136, -91, -46, -1, 44, 89, 134];
const GYEONG_X = [-131, -86, -42, 3, 50, 97, 138];
const JONG_LAYER = [11, 5, 2, 3, 4, 1, 10];
const GYEONG_LAYER = [19, 14, 15, 13, 16, 17, 18];

const SPRITES = {
  // 시작 화면 버튼 (그림이 무대 크기 캔버스라 회전중심이 480,360)
  btnJong:   { x: -115, y: -90, size: 45, layer: 6,  costumes: [C('btn-jong.png', 480, 360)] },
  btnGyeong: { x: 115,  y: -90, size: 45, layer: 9,  costumes: [C('btn-gyeong.png', 480, 360)] },
  btnChuk:   { x: -55,  y: 76,  size: 40, layer: 20, costumes: [C('btn-chuk.png', 480, 360)] },
  btnBak:    { x: -168, y: 65,  size: 40, layer: 26, costumes: [C('btn-bak.png', 480, 360)] },
  btnEo:     { x: 55,   y: 65,  size: 40, layer: 24, costumes: [C('btn-eo.png', 480, 360)] },
  btnJeolgo: { x: 168,  y: 70,  size: 40, layer: 27, costumes: [C('btn-jeolgo.png', 480, 360)] },
  back:      { x: -217, y: 150, size: 30, layer: 7,  costumes: [C('btn-back.png', 90, 143)] },

  jongFrame:   { x: -3, y: 5,  size: 125, layer: 25, costumes: [C('jong-frame.png', 359, 284)] },
  gyeongFrame: { x: 0,  y: -2, size: 110, layer: 12, costumes: [C('gyeong-frame.png', 412, 356)] },

  chukStick: { x: -15, y: 93,  size: 30, layer: 22,
    costumes: [C('chuk-stick-up.png', -22, 286), C('chuk-stick-down.png', -22, 165)] },
  chukBody:  { x: -2,  y: -25, size: 80, layer: 21, costumes: [C('chuk-body.png', 220, 198)] },

  bak:       { x: 25,  y: -15, size: 90, layer: 34,
    costumes: [C('bak-open.png', 394, 332), C('bak-closed.png', 241, 322)] },
  bakHitbox: { x: -71, y: 42,  size: 100, layer: 35, ghost: 99,
    costumes: [C('bak-hitbox.svg', 115.2, 109.17, 1)] },

  eoBody:  { x: -2,   y: -60, size: 70, layer: 23, costumes: [C('eo-body.png', 428, 314)] },
  eoBack:  { x: 55,   y: -60, size: 70, layer: 30, costumes: [C('eo-back.png', 304, 314)] },
  eoHead:  { x: -154, y: -60, size: 70, layer: 31, costumes: [C('eo-head.png', -91, 272)] },
  eoStick: { x: 10,   y: 30,  size: 60, layer: 32,
    costumes: [C('eo-stick-play.png', 108, 25), C('eo-stick-ready.png', -177, 360)] },

  jeolgoStand:  { x: -36, y: 0,   size: 100, layer: 28, costumes: [C('jeolgo-stand.png', 214, 272)] },
  jeolgoDrum:   { x: -36, y: -1,  size: 100, layer: 29, costumes: [C('jeolgo-drum.png', 194, 272)] },
  jeolgoMallet: { x: 60,  y: -40, size: 50,  layer: 33,
    costumes: [C('jeolgo-mallet-hit.png', 256, 309), C('jeolgo-mallet-ready.png', -137, 307)] },
};
NOTES.forEach((n, i) => {
  SPRITES['jong-' + n.id] = { x: JONG_X[i], y: -14, size: 18, layer: JONG_LAYER[i], note: n,
    costumes: [C(`jong-${n.id}.png`, 229, 360)] };
  SPRITES['gyeong-' + n.id] = { x: GYEONG_X[i], y: -25, size: 30, layer: GYEONG_LAYER[i], note: n,
    costumes: [C(`gyeong-${n.id}.png`, 480, 360)] };
});

const SCENES = {
  start:  { bg: 'bg-start.png',  sprites: ['btnJong', 'btnGyeong', 'btnChuk', 'btnBak', 'btnEo', 'btnJeolgo'] },
  jong:   { bg: 'bg-jong.png',   sprites: ['back', 'jongFrame', ...NOTES.map(n => 'jong-' + n.id)],
            sounds: NOTES.map(n => `jong-${n.id}.wav`), keys: true },
  gyeong: { bg: 'bg-gyeong.png', sprites: ['back', 'gyeongFrame', ...NOTES.map(n => 'gyeong-' + n.id)],
            sounds: NOTES.map(n => `gyeong-${n.id}.wav`), keys: true },
  chuk:   { bg: 'bg-chuk.png',   sprites: ['back', 'chukStick', 'chukBody'], sounds: ['chuk.wav'] },
  bak:    { bg: 'bg-bak.png',    sprites: ['back', 'bak', 'bakHitbox'], sounds: ['bak.wav'] },
  eo:     { bg: 'bg-eo.png',     sprites: ['back', 'eoBody', 'eoBack', 'eoHead', 'eoStick'],
            sounds: ['eo-head.wav', 'eo-back.wav'] },
  jeolgo: { bg: 'bg-jeolgo.png', sprites: ['back', 'jeolgoStand', 'jeolgoDrum', 'jeolgoMallet'],
            sounds: ['jeolgo.wav'] },
};
const SCENE_ORDER = ['start', 'jong', 'gyeong', 'chuk', 'bak', 'eo', 'jeolgo'];

// ---------- 자원 불러오기 ----------
const images = {};   // file -> { img, alpha: Uint8ClampedArray, w, h, bbox }
const buffers = {};  // file -> AudioBuffer
const audio = new (window.AudioContext || window.webkitAudioContext)();
const loaded = {};   // scene -> Promise

function loadImage(file) {
  if (images[file]) return images[file].ready;
  const entry = images[file] = {};
  entry.ready = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0, w, h);
      const data = cx.getImageData(0, 0, w, h).data;
      const alpha = new Uint8ClampedArray(w * h);
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let i = 0; i < w * h; i++) {
        const a = data[i * 4 + 3];
        alpha[i] = a;
        if (a > 0) {
          const x = i % w, y = (i / w) | 0;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      Object.assign(entry, { img, alpha, w, h, bbox: { x0, y0, x1, y1 } });
      resolve(entry);
    };
    img.onerror = () => reject(new Error('이미지를 불러오지 못했어요: ' + file));
    img.src = ASSET + file;
  });
  return entry.ready;
}

function loadSound(file) {
  if (buffers[file]) return buffers[file];
  return buffers[file] = fetch(ASSET + file)
    .then(r => { if (!r.ok) throw new Error('소리를 불러오지 못했어요: ' + file); return r.arrayBuffer(); })
    .then(b => new Promise((res, rej) => audio.decodeAudioData(b, res, rej)));
}

function loadScene(name) {
  if (loaded[name]) return loaded[name];
  const s = SCENES[name];
  const files = [s.bg];
  s.sprites.forEach(id => SPRITES[id].costumes.forEach(c => files.push(c.file)));
  return loaded[name] = Promise.all([
    ...files.map(loadImage),
    ...(s.sounds || []).map(loadSound),
  ]);
}

// ---------- 소리 ----------
// 스크래치처럼 같은 스프라이트의 같은 소리를 다시 내면 처음부터 다시 재생한다.
const playing = {};
async function play(file, channel = file) {
  if (audio.state !== 'running') audio.resume();
  const buf = await loadSound(file);
  if (playing[channel]) { try { playing[channel].stop(); } catch (e) {} }
  const src = audio.createBufferSource();
  src.buffer = buf;
  src.connect(audio.destination);
  src.onended = () => { if (playing[channel] === src) delete playing[channel]; };
  src.start();
  playing[channel] = src;
}

// ---------- 스프라이트 상태와 스크립트 ----------
const state = {};
function resetSprite(id) {
  const s = SPRITES[id];
  state[id] = { x: s.x, y: s.y, costume: 0, flash: 0 };
}
Object.keys(SPRITES).forEach(resetSprite);

// 스크래치의 "클릭했을 때" 스크립트처럼, 같은 스크립트를 다시 시작하면 이전 실행은 멈춘다.
const STOP = Symbol('stop');
const threads = {};
let sceneToken = 0;
function run(id, fn) {
  const t = (threads[id] = (threads[id] || 0) + 1);
  const scene = sceneToken;
  const dead = () => threads[id] !== t || sceneToken !== scene;
  fn(dead).catch(e => { if (e !== STOP) console.error(e); });
}
const wait = (sec, dead) => new Promise((res, rej) =>
  setTimeout(() => (dead() ? rej(STOP) : res()), sec * 1000));
// 위치는 그릴 때마다 시간으로 계산한다 (화면이 느려도 정해진 시간에 도착)
function glide(id, sec, x, y, dead) {
  const st = state[id];
  const g = st.glide = { x0: st.x, y0: st.y, x, y, t0: performance.now(), ms: sec * 1000 };
  return wait(sec, dead).finally(() => {
    if (st.glide === g) { st.x = x; st.y = y; st.glide = null; }
  });
}
function updateGlide(st, now) {
  const g = st.glide;
  if (!g) return;
  const k = Math.min(1, (now - g.t0) / g.ms);
  st.x = g.x0 + (g.x - g.x0) * k;
  st.y = g.y0 + (g.y - g.y0) * k;
}
const costume = (id, name) => { state[id].costume = name; };
const goto = (id, x, y) => { Object.assign(state[id], { x, y, glide: null }); };

// 연주 동작
function strikeNote(instrument, note) {
  const id = `${instrument}-${note.id}`;
  state[id].flash = performance.now();
  play(`${id}.wav`);
}
function playChuk() {
  run('chuk', async dead => {
    costume('chukStick', 1);
    play('chuk.wav');
    await wait(0.2, dead);
    costume('chukStick', 0);
  });
}
function playBak() {
  run('bak', async dead => {
    costume('bak', 1);
    play('bak.wav');
    await wait(0.5, dead);
    costume('bak', 0);
  });
}
function playEoHead() {
  play('eo-head.wav');
  run('eoStick', async dead => {
    costume('eoStick', 0);
    goto('eoStick', -75, 40);
    await wait(0.2, dead);
    costume('eoStick', 1);
    goto('eoStick', 10, 30);
  });
}
function playEoBack() {
  play('eo-back.wav');
  run('eoStick', async dead => {
    costume('eoStick', 0);
    goto('eoStick', -48, 45);
    await glide('eoStick', 0.7, 30, 60, dead);
    costume('eoStick', 1);
    goto('eoStick', 10, 30); // 원작은 여기서 제자리로 돌아오지 않았다
  });
}
function playJeolgo() {
  play('jeolgo.wav');
  run('jeolgoMallet', async dead => {
    costume('jeolgoMallet', 0);
    await wait(0.3, dead);
    costume('jeolgoMallet', 1);
  });
}

const ON_CLICK = {
  btnJong: () => go('jong'), btnGyeong: () => go('gyeong'), btnChuk: () => go('chuk'),
  btnBak: () => go('bak'), btnEo: () => go('eo'), btnJeolgo: () => go('jeolgo'),
  back: () => go('start'),
  chukStick: playChuk, chukBody: playChuk,
  bak: playBak, bakHitbox: playBak,
  eoHead: playEoHead, eoBack: playEoBack,
  jeolgoDrum: playJeolgo,
};
NOTES.forEach(n => {
  ON_CLICK['jong-' + n.id] = () => strikeNote('jong', n);
  ON_CLICK['gyeong-' + n.id] = () => strikeNote('gyeong', n);
});

// 배경이 바뀔 때의 초기 상태 (원작의 "배경이 ~로 바뀌었을 때" 스크립트)
const ON_ENTER = {
  eo: () => { costume('eoStick', 1); goto('eoStick', 10, 30); },
  jeolgo: () => { goto('jeolgoMallet', 60, -40); costume('jeolgoMallet', 1); },
};

// ---------- 화면 전환 ----------
let scene = null;
let loading = null; // 불러오는 중이면 화면 이름
async function go(name) {
  sceneToken++;
  loading = name;
  updateHint();
  try {
    await loadScene(name);
  } catch (e) {
    console.error(e);
    loading = null;
    errorMsg = e.message;
    return;
  }
  if (loading !== name) return; // 그 사이에 다른 화면을 골랐다
  loading = null;
  Object.keys(playing).forEach(k => { try { playing[k].stop(); } catch (e) {} delete playing[k]; });
  SCENES[name].sprites.forEach(resetSprite);
  if (ON_ENTER[name]) ON_ENTER[name]();
  scene = name;
  updateHint();
}

// ---------- 그리기 ----------
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
let scale = 1, errorMsg = null;

// 화면 크기는 CSS가 정하고, 캔버스 해상도만 실제 크기에 맞춘다
function layout() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = canvas.clientWidth || W;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(w * 0.75 * dpr);
  scale = canvas.width / W;
}
new ResizeObserver(layout).observe(canvas);

function placement(id) {
  const s = SPRITES[id], st = state[id], c = s.costumes[st.costume];
  const k = s.size / 100 / c.res; // 그림 픽셀 → 무대 단위
  const left = W / 2 + st.x - c.rcx * k;
  const top = H / 2 - st.y - c.rcy * k;
  return { c, k, left, top };
}

function drawSprite(id, now) {
  const s = SPRITES[id];
  const { c, k, left, top } = placement(id);
  const im = images[c.file];
  if (!im || !im.img) return;
  const w = im.w * k, h = im.h * k;
  ctx.globalAlpha = s.ghost ? 1 - s.ghost / 100 : 1;
  ctx.drawImage(im.img, left, top, w, h);
  // 편종·편경을 쳤을 때 잠깐 밝게
  const f = 1 - (now - state[id].flash) / 250;
  if (f > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.45 * f;
    ctx.drawImage(im.img, left, top, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
}

function drawKeyLabel(id) {
  const { c, k, left, top } = placement(id);
  const b = images[c.file].bbox;
  const x = left + (b.x0 + b.x1) / 2 * k;
  const y = top + b.y1 * k + 9;
  const label = SPRITES[id].note.key.toUpperCase();
  ctx.font = '600 9px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(20,16,12,.72)';
  roundRect(x - 7, y - 6.5, 14, 13, 3);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(label, x, y + 0.5);
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const showKeys = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function render(now) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (scene) {
    const sc = SCENES[scene];
    ctx.drawImage(images[sc.bg].img, 0, 0, W, H);
    const ids = sc.sprites.slice().sort((a, b) => SPRITES[a].layer - SPRITES[b].layer);
    ids.forEach(id => updateGlide(state[id], now));
    ids.forEach(id => drawSprite(id, now));
    if (sc.keys && showKeys) ids.filter(id => SPRITES[id].note).forEach(drawKeyLabel);
  }
  if (loading || errorMsg) {
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = '600 15px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(errorMsg || '불러오는 중…', W / 2, H / 2);
  }
  requestAnimationFrame(render);
}

// ---------- 입력 ----------
function hitTest(sx, sy) {
  if (!scene || loading) return null;
  const ids = SCENES[scene].sprites.slice().sort((a, b) => SPRITES[b].layer - SPRITES[a].layer);
  for (const id of ids) {
    const { c, k, left, top } = placement(id);
    const im = images[c.file];
    const ix = Math.floor((sx - left) / k), iy = Math.floor((sy - top) / k);
    if (ix < 0 || iy < 0 || ix >= im.w || iy >= im.h) continue;
    if (im.alpha[iy * im.w + ix] > 0) return id;
  }
  return null;
}

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (audio.state !== 'running') audio.resume();
  const r = canvas.getBoundingClientRect();
  const sx = (e.clientX - r.left) / r.width * W;
  const sy = (e.clientY - r.top) / r.height * H;
  const id = hitTest(sx, sy);
  if (id && ON_CLICK[id]) ON_CLICK[id]();
});
canvas.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect();
  const id = hitTest((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
  canvas.style.cursor = id && ON_CLICK[id] ? 'pointer' : 'default';
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (audio.state !== 'running') audio.resume();
  if (!scene || loading) return;
  if ((e.key === 'Escape' || e.key === 'Backspace') && scene !== 'start') { go('start'); return; }
  if (!SCENES[scene].keys) return; // 원작은 어느 화면에서나 편종 키가 울렸다
  const note = NOTES.find(n => n.key === e.key.toLowerCase() || 'Key' + n.key.toUpperCase() === e.code);
  if (note) strikeNote(scene, note);
});

// ---------- 안내 문구 ----------
const hint = document.getElementById('hint');
function updateHint() {
  const s = loading || scene;
  if (s === 'start') hint.textContent = '연주하고 싶은 악기를 눌러 보세요.';
  else if (SCENES[s] && SCENES[s].keys && showKeys)
    hint.innerHTML = (s === 'jong' ? '종을' : '경을') + ' 누르거나 키보드 <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> <kbd>F</kbd> <kbd>G</kbd> <kbd>H</kbd> <kbd>J</kbd> 로 연주해요. <kbd>Esc</kbd> 처음으로';
  else if (s === 'eo') hint.textContent = '호랑이 머리를 치거나 등을 긁어 보세요.';
  else hint.textContent = '악기를 눌러 연주해 보세요.';
}

// ---------- 전체 화면 ----------
const fsBtn = document.getElementById('fsBtn');
if (document.documentElement.requestFullscreen) {
  fsBtn.addEventListener('click', () => document.documentElement.requestFullscreen().catch(() => {}));
} else {
  fsBtn.hidden = true; // iPhone 사파리는 전체 화면을 지원하지 않는다
}
document.addEventListener('fullscreenchange', () => {
  document.body.classList.toggle('fs', !!document.fullscreenElement);
  layout();
});

// ---------- 시작 ----------
layout();
requestAnimationFrame(render);
go('start').then(() => {
  // 나머지 화면은 미리 받아 둔다 (순서대로 하나씩)
  SCENE_ORDER.slice(1).reduce((p, n) => p.then(() => loadScene(n).catch(() => {})), Promise.resolve());
});
