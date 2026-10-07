// 제례악 작곡가 — 크롬 뮤직 랩 송메이커처럼 칸을 눌러 종묘제례악 악기 소리를 찍고 연주한다.
// 한 칸 = 한 박, 한 마디 = 4박. 악보 데이터는 항상 16마디(64박) 크기로 두고 "길이"만큼만 보여 준다.
'use strict';

const ASSET = 'assets/';
const BEATS = 4;
const MAX_STEPS = 16 * BEATS;

// 편종·편경 음: 위쪽이 높은 소리 (청태 > 청황 > 남 > 임 > 중 > 태 > 황)
const NOTES = [
  { id: 'cheongtae', name: '청태' }, { id: 'cheonghwang', name: '청황' }, { id: 'nam', name: '남' },
  { id: 'im', name: '임' }, { id: 'jung', name: '중' }, { id: 'tae', name: '태' }, { id: 'hwang', name: '황' },
];
const pitched = (inst, hue, sat) => NOTES.map((n, i) => ({
  key: n.id, label: n.name, sound: `${inst}-${n.id}.wav`,
  color: `hsl(${hue} ${sat}% ${54 - i * 3.5}%)`,
}));

// bbox: btn-*.png 안에서 그림이 있는 영역 (투명 여백을 잘라 작게 보여 준다)
const SECTIONS = [
  { id: 'jong', img: 'btn-jong.png', bbox: [6, 0, 946, 720], rows: pitched('jong', 40, 78) },
  { id: 'gyeong', img: 'btn-gyeong.png', bbox: [56, 4, 894, 666], rows: pitched('gyeong', 170, 48) },
  { id: 'chuk', img: 'btn-chuk.png', bbox: [220, 0, 700, 696], perc: true,
    rows: [{ key: 'chuk', label: '축', sound: 'chuk.wav', color: '#b8432f' }] },
  { id: 'bak', img: 'btn-bak.png', bbox: [140, 24, 834, 646], perc: true,
    rows: [{ key: 'bak', label: '박', sound: 'bak.wav', color: '#8b5a2b' }] },
  { id: 'eo', img: 'btn-eo.png', bbox: [120, 30, 832, 632], perc: true,
    rows: [{ key: 'head', label: '어 치기', sound: 'eo-head.wav', color: '#35507a' },
           { key: 'back', label: '어 긁기', sound: 'eo-back.wav', color: '#5b7cab' }] },
  { id: 'jeolgo', img: 'btn-jeolgo.png', bbox: [256, 46, 696, 662], perc: true,
    rows: [{ key: 'jeolgo', label: '절고', sound: 'jeolgo.wav', color: '#7b3f6e' }] },
];
const ROWS = [];
SECTIONS.forEach(sec => sec.rows.forEach(r => { r.sec = sec; r.index = ROWS.length; ROWS.push(r); }));
const rowOf = (secId, key) => ROWS.find(r => r.sec.id === secId && r.key === key).index;

// ---------- 곡 상태 ----------
const song = {
  data: ROWS.map(() => new Uint8Array(MAX_STEPS)),
  bars: 8, tempo: 80, loop: true,
};
const steps = () => song.bars * BEATS;

// ---------- 소리 ----------
const audio = new (window.AudioContext || window.webkitAudioContext)();
const master = audio.createGain();
master.gain.value = 0.55;
const comp = audio.createDynamicsCompressor();
master.connect(comp).connect(audio.destination);

// 녹음 앞쪽의 조용한 부분을 건너뛰어 박자에 딱 맞게 울리도록 시작 위치를 구해 둔다
function onsetOf(buf) {
  const d = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > peak) peak = Math.abs(d[i]);
  let i = 0;
  while (i < d.length && Math.abs(d[i]) < peak * 0.1) i++;
  return Math.max(0, i / buf.sampleRate - 0.012);
}
const sounds = {};
function loadSound(file) {
  return sounds[file] || (sounds[file] = fetch(ASSET + file)
    .then(r => { if (!r.ok) throw new Error(file); return r.arrayBuffer(); })
    .then(b => new Promise((res, rej) => audio.decodeAudioData(b, res, rej)))
    .then(buf => ({ buf, offset: onsetOf(buf) })));
}
const allLoaded = Promise.all(ROWS.map(r => loadSound(r.sound)));

const voices = new Set();
const lastVoice = []; // 줄마다 마지막 소리 — 같은 줄을 다시 치면 앞 소리를 짧게 줄인다
async function playRow(row, time) {
  const { buf, offset } = await loadSound(ROWS[row].sound);
  time = Math.max(time ?? 0, audio.currentTime);
  const prev = lastVoice[row];
  if (prev) {
    prev.g.gain.setTargetAtTime(0, time, 0.03);
    try { prev.src.stop(time + 0.25); } catch (e) {}
  }
  const src = audio.createBufferSource();
  const g = audio.createGain();
  src.buffer = buf;
  src.connect(g).connect(master);
  src.start(time, offset);
  const v = { src, g };
  voices.add(v);
  lastVoice[row] = v;
  src.onended = () => { voices.delete(v); if (lastVoice[row] === v) lastVoice[row] = null; };
}
function fadeAll() {
  const now = audio.currentTime;
  voices.forEach(({ src, g }) => {
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + 0.25);
    try { src.stop(now + 0.3); } catch (e) {}
  });
}
const wake = () => { if (audio.state !== 'running') audio.resume(); };

// ---------- 악보 그리기 ----------
const $ = id => document.getElementById(id);
const scroller = $('scroller'), sheet = $('sheet');
let colCells = [];   // 박마다 그 세로줄의 칸들
let cellEls = [];    // [줄][박]
const thumbs = {};   // 구역 id → 그림 요소

function build() {
  const n = steps();
  sheet.style.setProperty('--steps', n);
  sheet.textContent = '';
  colCells = Array.from({ length: n }, () => []);
  cellEls = ROWS.map(() => []);

  const head = el('div', 'barnum');
  head.append(el('div', 'pad'));
  const nums = el('div', 'nums');
  for (let b = 0; b < song.bars; b++) {
    const s = el('span', '', String(b + 1));
    s.style.gridColumn = `span ${BEATS}`;
    nums.append(s);
  }
  head.append(nums);
  sheet.append(head);

  SECTIONS.forEach(sec => {
    const rowH = sec.perc ? 'var(--prow)' : 'var(--row)';
    const box = el('div', 'sec' + (sec.perc ? ' perc' : ''));
    const lab = el('div', 'lab');
    lab.style.gridTemplateRows = `repeat(${sec.rows.length}, ${rowH})`;
    const th = el('div', 'thumb');
    th.style.gridRow = '1 / -1';
    th.title = '눌러서 소리 듣기';
    th.append(thumbCanvas(sec));
    th.addEventListener('pointerdown', () => { wake(); playRow(sec.rows[0].index); bump(sec.id); });
    thumbs[sec.id] = th;
    lab.append(th);

    const cells = el('div', 'cells');
    cells.style.gridTemplateRows = `repeat(${sec.rows.length}, ${rowH})`;
    sec.rows.forEach((r, ri) => {
      const nl = el('div', 'note', r.label);
      nl.style.background = r.color;
      nl.style.gridRow = String(ri + 1);
      if (r.label.length > 2) nl.style.fontSize = '.7rem';
      nl.addEventListener('pointerdown', () => { wake(); playRow(r.index); bump(sec.id); });
      lab.append(nl);
      for (let c = 0; c < n; c++) {
        const cell = el('div', 'cell');
        if (Math.floor(c / BEATS) % 2) cell.classList.add('alt');
        if (c % BEATS === 0 && c) cell.classList.add('beat0');
        if (ri === sec.rows.length - 1) cell.classList.add('last');
        if (song.data[r.index][c]) cell.classList.add('on');
        cell.dataset.r = r.index;
        cell.dataset.c = c;
        cell.dataset.t = sec.perc ? '' : r.label;
        cell.style.setProperty('--c', r.color);
        cells.append(cell);
        colCells[c].push(cell);
        cellEls[r.index][c] = cell;
      }
    });
    box.append(lab, cells);
    sheet.append(box);
  });
  shownStep = -1;
  fit();
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// 악기 그림: 투명 여백을 잘라 칸 크기에 맞춰 그린다
const imgCache = {};
function thumbCanvas(sec) {
  const cv = document.createElement('canvas');
  const img = imgCache[sec.img] || (imgCache[sec.img] = Object.assign(new Image(), { src: ASSET + sec.img }));
  const draw = () => {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h || !img.complete || !img.naturalWidth) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const [x0, y0, x1, y1] = sec.bbox, bw = x1 - x0, bh = y1 - y0;
    const k = Math.min(cv.width / bw, cv.height / bh);
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x0, y0, bw, bh, (cv.width - bw * k) / 2, (cv.height - bh * k) / 2, bw * k, bh * k);
  };
  img.addEventListener('load', draw);
  new ResizeObserver(draw).observe(cv);
  return cv;
}

function bump(secId) {
  const t = thumbs[secId];
  if (!t) return;
  t.classList.remove('bump');
  void t.offsetWidth;
  t.classList.add('bump');
}

// 화면 높이에 맞춰 줄 높이를, 너비에 맞춰 칸 너비를 정한다
function fit() {
  const css = getComputedStyle(document.documentElement);
  const labelW = parseFloat(css.getPropertyValue('--label-w')) || 176;
  const units = 14 + 5 * 1.5;
  const avail = scroller.clientHeight - 26 - 20 - 8 * (SECTIONS.length - 1);
  const row = Math.max(20, Math.min(40, Math.floor(avail / units)));
  const cw = Math.max(26, Math.min(72, Math.floor((scroller.clientWidth - labelW - 12) / steps())));
  const root = document.documentElement.style;
  root.setProperty('--row', row + 'px');
  root.setProperty('--prow', Math.round(row * 1.5) + 'px');
  root.setProperty('--cw', cw + 'px');
}
new ResizeObserver(fit).observe(scroller);

// ---------- 칸 찍기 (누른 채 끌면 같은 동작을 이어서) ----------
let paint = null; // { on, snap, changed }
function cellAt(x, y) {
  const e = document.elementFromPoint(x, y);
  return e && e.closest && e.closest('.cell');
}
function applyCell(cell) {
  const r = +cell.dataset.r, c = +cell.dataset.c;
  const v = paint.on ? 1 : 0;
  if (song.data[r][c] === v) return;
  if (!paint.changed) { pushUndo(paint.snap); paint.changed = true; }
  song.data[r][c] = v;
  cell.classList.toggle('on', !!v);
  if (v) { playRow(r); bump(ROWS[r].sec.id); }
}
// 빠르게 끌면 pointermove 사이에 칸을 건너뛰므로 지난 칸과 이번 칸 사이를 이어서 채운다
function paintTo(cell) {
  const r = +cell.dataset.r, c = +cell.dataset.c;
  const [r0, c0] = paint.last || [r, c];
  const n = Math.max(Math.abs(r - r0), Math.abs(c - c0));
  for (let i = 1; i <= n; i++) {
    const e = cellEls[Math.round(r0 + (r - r0) * i / n)][Math.round(c0 + (c - c0) * i / n)];
    if (e) applyCell(e);
  }
  paint.last = [r, c];
}
sheet.addEventListener('pointerdown', e => {
  const cell = e.target.closest('.cell');
  if (!cell || e.button > 0) return;
  e.preventDefault();
  wake();
  paint = { on: !song.data[+cell.dataset.r][+cell.dataset.c], snap: snapshot(), changed: false };
  try { sheet.setPointerCapture(e.pointerId); } catch (err) {}
  applyCell(cell);
  paint.last = [+cell.dataset.r, +cell.dataset.c];
});
sheet.addEventListener('pointermove', e => {
  if (!paint) return;
  const cell = cellAt(e.clientX, e.clientY);
  if (cell) paintTo(cell);
});
const endPaint = () => { if (paint && paint.changed) save(); paint = null; };
sheet.addEventListener('pointerup', endPaint);
sheet.addEventListener('pointercancel', endPaint);
sheet.addEventListener('contextmenu', e => e.preventDefault());

// ---------- 되돌리기 ----------
const undoStack = [];
const snapshot = () => ({ data: song.data.map(a => a.slice()), bars: song.bars });
function pushUndo(snap = snapshot()) {
  undoStack.push(snap);
  if (undoStack.length > 60) undoStack.shift();
  $('undoBtn').disabled = false;
}
function undo() {
  const s = undoStack.pop();
  if (!s) return;
  song.data = s.data;
  if (s.bars !== song.bars) { song.bars = s.bars; $('bars').value = s.bars; }
  build();
  save();
  $('undoBtn').disabled = !undoStack.length;
}

// ---------- 재생 ----------
const LOOKAHEAD = 0.12;
let playing = false, timer = null, step = 0, nextTime = 0, endAt = null;
let visQ = [], shownStep = -1;

function tick() {
  while (nextTime < audio.currentTime + LOOKAHEAD) {
    if (step >= steps()) {
      if (song.loop) step = 0;
      else { clearInterval(timer); timer = null; endAt = nextTime; return; }
    }
    for (let r = 0; r < ROWS.length; r++) if (song.data[r][step]) playRow(r, nextTime);
    visQ.push({ step, time: nextTime });
    nextTime += 60 / song.tempo;
    step++;
  }
}
async function play() {
  wake();
  playing = true;
  setPlayIcon();
  try { await allLoaded; } catch (e) { toast('소리를 불러오지 못했어요. 새로고침해 보세요.'); stop(); return; }
  if (!playing) return;
  step = 0; endAt = null; visQ = [];
  nextTime = audio.currentTime + 0.08;
  tick();
  timer = setInterval(tick, 25);
}
function stop(fade = true) {
  playing = false;
  clearInterval(timer); timer = null;
  visQ = []; endAt = null;
  if (fade) fadeAll();
  showStep(-1);
  setPlayIcon();
}
function setPlayIcon() {
  const b = $('playBtn');
  b.innerHTML = playing
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
  b.setAttribute('aria-label', playing ? '멈춤' : '재생');
}

function showStep(s) {
  if (shownStep >= 0 && colCells[shownStep]) colCells[shownStep].forEach(c => c.classList.remove('now'));
  shownStep = s;
  if (s < 0 || !colCells[s]) return;
  const hitSecs = new Set();
  colCells[s].forEach(c => {
    c.classList.add('now');
    if (c.classList.contains('on')) {
      c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit');
      hitSecs.add(ROWS[+c.dataset.r].sec.id);
    }
  });
  hitSecs.forEach(bump);
  // 재생 위치가 화면 밖으로 나가면 따라간다
  const cell = colCells[s][0];
  const labelW = scroller.querySelector('.lab').offsetWidth;
  const x = cell.offsetLeft + cell.parentElement.offsetLeft;
  if (x < scroller.scrollLeft + labelW || x + cell.offsetWidth > scroller.scrollLeft + scroller.clientWidth) {
    scroller.scrollTo({ left: x - labelW - 8, behavior: 'smooth' });
  }
}
function frame() {
  if (playing) {
    const now = audio.currentTime;
    let s = null;
    while (visQ.length && visQ[0].time <= now + 0.015) s = visQ.shift().step;
    if (s != null) showStep(s);
    if (endAt != null && !visQ.length && now >= endAt) stop(false); // 끝까지 연주하면 소리는 자연스럽게 울리게 둔다
  }
  requestAnimationFrame(frame);
}

// ---------- 저장·공유 ----------
const STORE = 'jongmyo-maker-v1';
function encode() {
  const r = song.data.map(a => {
    let h = '';
    for (let i = 0; i < MAX_STEPS; i += 4) h += (a[i] | a[i + 1] << 1 | a[i + 2] << 2 | a[i + 3] << 3).toString(16);
    return h.replace(/0+$/, '');
  });
  const o = { v: 1, n: $('songName').value.trim(), a: $('author').value.trim(),
    t: song.tempo, b: song.bars, l: song.loop ? 1 : 0, r };
  const bytes = new TextEncoder().encode(JSON.stringify(o));
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
  if (!o || o.v !== 1 || !Array.isArray(o.r)) throw new Error('bad song');
  const data = ROWS.map((_, i) => {
    const a = new Uint8Array(MAX_STEPS), h = String(o.r[i] || '');
    for (let j = 0; j < h.length && j * 4 < MAX_STEPS; j++) {
      const v = parseInt(h[j], 16) || 0;
      for (let k = 0; k < 4; k++) a[j * 4 + k] = (v >> k) & 1;
    }
    return a;
  });
  return { data, name: String(o.n || ''), author: String(o.a || ''),
    tempo: clamp(+o.t || 80, 40, 160), bars: [4, 8, 12, 16].includes(+o.b) ? +o.b : 8, loop: o.l !== 0 };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function apply(s) {
  song.data = s.data; song.bars = s.bars; song.tempo = s.tempo; song.loop = s.loop;
  $('songName').value = s.name; $('author').value = s.author;
  syncControls();
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, encode()); } catch (e) {} }, 200);
}
async function share() {
  const url = location.href.split('#')[0] + '#s=' + encode();
  try {
    await navigator.clipboard.writeText(url);
    toast('링크를 복사했어요! 선생님이나 친구에게 보내면 내 곡을 들을 수 있어요.');
  } catch (e) {
    window.prompt('아래 링크를 복사하세요.', url);
  }
}

let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- 예시 곡 ----------
// 박으로 열고 축으로 시작 → 편종이 부르면 편경이 받고 → 어를 치고 긁어 마친 뒤 박으로 닫는다
function exampleSong() {
  const data = ROWS.map(() => new Uint8Array(MAX_STEPS));
  const on = (sec, key, ...cols) => cols.forEach(c => { data[rowOf(sec, key)][c] = 1; });
  on('bak', 'bak', 0, 31);
  on('chuk', 'chuk', 1, 2, 3);
  on('jeolgo', 'jeolgo', 4, 12, 20);
  const melody = ['hwang', 'tae', 'jung', 'tae', 'im', 'jung', 'tae', 'hwang', 'jung', 'im', 'nam', 'cheonghwang'];
  melody.forEach((k, i) => { on('jong', k, 4 + i * 2); on('gyeong', k, 5 + i * 2); });
  on('eo', 'head', 28);
  on('eo', 'back', 29, 30);
  return { data, name: '예시 곡: 축으로 열고 어로 닫기', author: '', tempo: 72, bars: 8, loop: true };
}

// ---------- 도구줄 ----------
function syncControls() {
  $('tempo').value = song.tempo; $('tempoVal').textContent = song.tempo;
  $('bars').value = song.bars;
  $('loopBtn').setAttribute('aria-pressed', String(song.loop));
}
$('playBtn').addEventListener('click', () => (playing ? stop() : play()));
$('loopBtn').addEventListener('click', () => {
  song.loop = !song.loop;
  $('loopBtn').setAttribute('aria-pressed', String(song.loop));
  // 한 번만 연주가 끝나 가는 중에 반복을 켜면 처음부터 다시 이어 간다
  if (song.loop && playing && !timer && endAt != null) { endAt = null; timer = setInterval(tick, 25); }
  save();
});
$('tempo').addEventListener('input', e => {
  song.tempo = +e.target.value;
  $('tempoVal').textContent = song.tempo;
  save();
});
$('bars').addEventListener('change', e => {
  pushUndo();
  song.bars = +e.target.value;
  if (step > steps()) step = steps();
  build();
  save();
});
$('undoBtn').addEventListener('click', undo);
$('clearBtn').addEventListener('click', () => {
  if (!song.data.some(a => a.some(Boolean))) return;
  pushUndo();
  song.data = ROWS.map(() => new Uint8Array(MAX_STEPS));
  build();
  save();
  toast('모두 지웠어요. 「되돌리기」를 누르면 다시 살아나요.');
});
$('exampleBtn').addEventListener('click', () => {
  pushUndo();
  apply(exampleSong());
  build();
  save();
  toast('예시 곡을 불러왔어요. ▶ 를 눌러 들어 보세요.');
});
$('shareBtn').addEventListener('click', share);
$('songName').addEventListener('input', save);
$('author').addEventListener('input', save);

const tip = $('tip');
$('tipBtn').addEventListener('click', () => tip.classList.add('show'));
$('tipClose').addEventListener('click', () => { tip.classList.remove('show'); wake(); });
tip.addEventListener('click', e => { if (e.target === tip) tip.classList.remove('show'); });

window.addEventListener('keydown', e => {
  if (e.target.matches('input, select')) return;
  if (e.key === 'Escape' && tip.classList.contains('show')) { tip.classList.remove('show'); return; }
  if (e.code === 'Space') { e.preventDefault(); $('playBtn').click(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
});

// ---------- 시작 ----------
(function init() {
  let loaded = false;
  const m = location.hash.match(/^#s=([\w-]+)/);
  if (m) {
    try { apply(decode(m[1])); loaded = true; toast('공유받은 곡을 불러왔어요. ▶ 를 눌러 들어 보세요.'); }
    catch (e) { toast('링크에 담긴 곡을 읽지 못했어요.'); }
    history.replaceState(null, '', location.pathname + location.search);
  }
  if (!loaded) {
    try { const s = localStorage.getItem(STORE); if (s) { apply(decode(s)); loaded = true; } } catch (e) {}
  }
  if (loaded) save(); else syncControls();
  build();
  setPlayIcon();
  requestAnimationFrame(frame);
  let seen = false;
  try { seen = localStorage.getItem(STORE + '-tip') === '1'; localStorage.setItem(STORE + '-tip', '1'); } catch (e) {}
  if (!seen && !m) tip.classList.add('show');
})();
