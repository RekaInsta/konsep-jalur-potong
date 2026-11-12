// Denah ruang potong 3D beranimasi. Koordinat mengikuti denah 2D (viewBox 1000x660): 100 satuan = 1 meter.
// Three.js dimuat saat bagian ini hampir terlihat. Gambar poster (img/denah-3d.webp) tampil selama memuat
// dan tetap tampil kalau WebGL tidak ada. Mode ?snapd dipakai untuk membuat poster itu.
const wrap = document.getElementById('d3');
const SNAP = new URLSearchParams(location.search).has('snapd');
const REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function punyaWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

if (wrap && punyaWebGL()) {
  if (SNAP) document.documentElement.classList.add('snapd');
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); start().catch((err) => console.error(err)); }
  }, { rootMargin: '300px' });
  io.observe(wrap);
} else if (wrap) {
  wrap.classList.add('no3d');
}

async function start() {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  try { await document.fonts.ready; } catch (e) {}

  const canvas = document.getElementById('d3-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SNAP ? 2 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.fog = new THREE.Fog(0x0e1013, 16, 30);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = false;
  controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.2;
  controls.autoRotate = !REDUCE && !SNAP; controls.autoRotateSpeed = 0.35;
  let idle;
  controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idle); });
  controls.addEventListener('end', () => { idle = setTimeout(() => { if (playing) controls.autoRotate = true; }, 5000); });

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-4, 9, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -6.5, right: 6.5, top: 5, bottom: -5, near: 1, far: 25 });
  key.shadow.bias = -0.0008; scene.add(key);
  scene.add(new THREE.HemisphereLight(0xcfdbe6, 0x0e1013, 0.35));
  const rim = new THREE.DirectionalLight(0x9fd3f7, 1.0); rim.position.set(5, 4, -6); scene.add(rim);

  // ---------- bantuan ----------
  const S = 100, CX = 530, CY = 340;
  const X = (x) => (x - CX) / S, Z = (y) => (y - CY) / S, D = (n) => n / S;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const glow = (c, k = 1) => std({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.4 });
  const basic = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: o >= 1 });
  const M = {
    steel: std({ color: 0xc8cfd5, metalness: 0.8, roughness: 0.32 }),
    steelDark: std({ color: 0x8a939b, metalness: 0.75, roughness: 0.42 }),
    wall: std({ color: 0x343b42, roughness: 0.8 }),
    wallTop: new THREE.MeshBasicMaterial({ color: 0xc9ced3 }),
    plastic: std({ color: 0x2b3036, roughness: 0.55 }),
    plasticLight: std({ color: 0xb8bfc5, roughness: 0.5 }),
    crate: std({ color: 0x2a5f84, roughness: 0.6 }),
    crateY: std({ color: 0x9c8136, roughness: 0.6 }),
    water: std({ color: 0x4fa3dc, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1 }),
    ice: std({ color: 0xeaf6fd, roughness: 0.1 }),
    meat: std({ color: 0xe9c5a6, roughness: 0.55 }),
    feather: std({ color: 0xf0ece3, roughness: 0.9 }),
    blood: std({ color: 0x3a1c1c, roughness: 0.3, metalness: 0.2 }),
    carton: std({ color: 0xb9a888, roughness: 0.85 }),
    apron: std({ color: 0xd9dde0, roughness: 0.7 }),
    skin: std({ color: 0xc99a78, roughness: 0.7 }),
    boot: std({ color: 0x1c2024, roughness: 0.6 }),
    tire: std({ color: 0x111315, roughness: 0.9 }),
    cabO: std({ color: 0xe8772e, roughness: 0.45, metalness: 0.2 }),
    cabB: std({ color: 0x3b7fb5, roughness: 0.45, metalness: 0.2 }),
    green: glow(0x7bd88f, 1.6), redOff: std({ color: 0x5a2a27, roughness: 0.35 }), orangeLit: glow(0xf2a26a, 1.4),
  };
  const shade = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const box = (w, h, d, mat, x, y, z) => { const m = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); scene.add(m); return m; };
  // kotak yang menutup persegi panjang denah (x1,y1)-(x2,y2), tinggi h, alas di y0
  const boxP = (x1, y1, x2, y2, h, mat, y0 = 0) => box(D(x2 - x1), h, D(y2 - y1), mat, X((x1 + x2) / 2), y0 + h / 2, Z((y1 + y2) / 2));
  const cylP = (x, y, r, h, mat, y0 = 0, seg = 24) => { const m = shade(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat)); m.position.set(X(x), y0 + h / 2, Z(y)); scene.add(m); return m; };
  function tex(cw, ch, draw) { const c = document.createElement('canvas'); c.width = cw; c.height = ch; draw(c.getContext('2d'), cw, ch); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  const MONO = '"IBM Plex Mono", ui-monospace, Consolas, monospace';
  const SANS = '"IBM Plex Sans", system-ui, sans-serif';

  // ---------- tanah, lantai zona, dinding ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), std({ color: 0x0e1013, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  boxP(100, 60, 520, 560, 0.03, std({ color: 0x1d2024, roughness: 0.9 }));
  boxP(520, 60, 960, 400, 0.03, std({ color: 0x18242e, roughness: 0.6, metalness: 0.1 }));
  boxP(520, 400, 760, 560, 0.03, std({ color: 0x15233a, roughness: 0.5, metalness: 0.1 }));
  boxP(760, 400, 960, 560, 0.03, std({ color: 0x1c221d, roughness: 0.9 }));
  // grid blueprint tipis di lantai bangunan
  const bp = new THREE.GridHelper(8.6, 43, 0x2c3238, 0x262d34); bp.scale.set(1, 1, 5 / 8.6); bp.position.set(X(530), 0.032, Z(310)); bp.material.transparent = true; bp.material.opacity = 0.55; scene.add(bp);
  const WH = 0.55, WT = 5;
  function wall(x1, y1, x2, y2) {
    if (x1 === x2) { boxP(x1 - WT / 2, Math.min(y1, y2), x1 + WT / 2, Math.max(y1, y2), WH, M.wall); boxP(x1 - WT / 2, Math.min(y1, y2), x1 + WT / 2, Math.max(y1, y2), 0.015, M.wallTop, WH); }
    else { boxP(Math.min(x1, x2), y1 - WT / 2, Math.max(x1, x2), y1 + WT / 2, WH, M.wall); boxP(Math.min(x1, x2), y1 - WT / 2, Math.max(x1, x2), y1 + WT / 2, 0.015, M.wallTop, WH); }
  }
  [[100, 60, 960, 60], [960, 60, 960, 560], [960, 560, 660, 560], [600, 560, 100, 560], [100, 560, 100, 200], [100, 120, 100, 60],
    [520, 60, 520, 262], [520, 298, 520, 560], [520, 400, 540, 400], [580, 400, 840, 400], [880, 400, 960, 400], [760, 400, 760, 560]].forEach((w) => wall(...w));

  function floorText(text, x, y, w, color = '#A7AFB6') {
    const t = tex(1024, 128, (g, cw, ch) => { g.fillStyle = color; g.font = `500 64px ${MONO}`; g.textBaseline = 'middle'; g.fillText(text, 8, ch / 2); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(D(w), D(w) / 8), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(X(x) + D(w) / 2, 0.035, Z(y)); scene.add(m);
  }
  const labels = [];
  function zoneLabel(text, x, y, color = '#C9CED3') {
    const t = tex(640, 80, (g, cw, ch) => { g.font = `500 40px ${MONO}`; const w = g.measureText(text).width + 40; const x0 = (cw - w) / 2;
      g.fillStyle = 'rgba(14,16,19,0.78)'; g.fillRect(x0, 8, w, ch - 16); g.strokeStyle = 'rgba(201,206,211,0.35)'; g.lineWidth = 2; g.strokeRect(x0, 8, w, ch - 16);
      g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, ch / 2 + 2); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.scale.set(1.6, 0.2, 1); labels.push([sp, 1.6, 0.2]); sp.position.set(X(x), 0.75, Z(y)); sp.renderOrder = 9; scene.add(sp);
  }
  zoneLabel('AREA KOTOR', 200, 540); zoneLabel('AREA BERSIH', 640, 330);
  zoneLabel('COLD STORAGE −18 °C', 640, 548, '#8CCBF5'); zoneLabel('RUANG KONTROL', 860, 548);
  floorText('TRUK AYAM HIDUP', 2, 222, 150); floorText('TRUK PENGIRIMAN', 684, 600, 200);

  // ---------- truk ----------
  function truck(t, cab, cabMat, bodyMat) {
    const [tx1, ty1, tx2, ty2] = t, [cx1, cy1, cx2, cy2] = cab;
    boxP(tx1, ty1, tx2, ty2, 0.62, bodyMat, 0.14);
    boxP(cx1, cy1, cx2, cy2, 0.48, cabMat, 0.12);
    const wheelGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.07, 18);
    const vertical = (ty2 - ty1) > (tx2 - tx1) || (cy1 >= ty2 - 1);
    const pts = vertical ? [[tx1 + 4, ty1 + 14], [tx2 - 4, ty1 + 14], [tx1 + 4, ty2 - 10], [tx2 - 4, ty2 - 10]] : [[tx1 + 14, ty1 + 4], [tx1 + 14, ty2 - 4], [tx2 - 14, ty1 + 4], [tx2 - 14, ty2 - 4]];
    pts.forEach(([x, y]) => { const w = shade(new THREE.Mesh(wheelGeo, M.tire)); if (vertical) w.rotation.z = Math.PI / 2; else w.rotation.x = Math.PI / 2; w.position.set(X(x), 0.09, Z(y)); scene.add(w); });
  }
  truck([24, 126, 94, 194], [4, 138, 24, 182], M.cabO, M.plasticLight);
  truck([592, 566, 668, 624], [604, 624, 656, 646], M.cabB, std({ color: 0xc4ccd2, roughness: 0.5 }));

  // ---------- 01 timbangan duduk ----------
  boxP(140, 132, 210, 180, 0.05, M.steel);
  boxP(150, 138, 200, 174, 0.22, M.crate, 0.05);
  cylP(214, 136, 0.015, 0.62, M.steelDark);
  const ind = box(0.2, 0.12, 0.05, M.plastic, X(214), 0.66, Z(136));
  const indS = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.06), basic(0xf2a26a)); indS.position.set(X(214), 0.67, Z(136) + 0.026); scene.add(indS);

  // ---------- 02 area tunggu: tumpukan keranjang + kipas ----------
  const crateGeo = new THREE.BoxGeometry(0.24, 0.12, 0.18);
  const heights = [3, 2, 3, 1, 2, 3, 2, 2, 3, 1, 3, 2, 2, 3, 2, 1, 3, 2, 2, 3];
  let k = 0;
  for (let c = 0; c < 4; c++) for (let r = 0; r < 5; r++) {
    const h = heights[k++ % heights.length];
    for (let s = 0; s < h; s++) { const m = shade(new THREE.Mesh(crateGeo, (c + r + s) % 4 === 0 ? M.crateY : M.crate)); m.position.set(X(132 + c * 32), 0.09 + s * 0.125, Z(260 + r * 32)); scene.add(m); }
  }
  cylP(130, 446, 0.012, 0.42, M.steelDark);
  const fan = new THREE.Group(); fan.position.set(X(130), 0.48, Z(446));
  const fanRing = shade(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.01, 8, 32), M.steelDark)); fan.add(fanRing);
  const blades = new THREE.Group(); for (let i = 0; i < 3; i++) { const b = shade(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.005), M.plasticLight)); b.position.y = 0.065; const p = new THREE.Group(); p.add(b); p.rotation.z = (i * Math.PI * 2) / 3; blades.add(p); }
  fan.add(blades); fan.rotation.y = -0.6; scene.add(fan);

  // ---------- rel gantung + ayam ----------
  const RY = 0.98;
  const railPts = [[300, 500], [300, 110], [470, 110], [470, 282]].map(([x, y]) => new THREE.Vector3(X(x), RY, Z(y)));
  for (let i = 0; i < railPts.length - 1; i++) {
    const a = railPts[i], b = railPts[i + 1]; const len = a.distanceTo(b);
    const m = shade(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, len), M.steelDark)); m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); scene.add(m);
  }
  [[300, 500], [300, 300], [300, 110], [470, 110], [470, 282]].forEach(([x, y]) => cylP(x, y, 0.016, RY, M.steelDark, 0, 10));
  const railCurve = new THREE.CurvePath();
  for (let i = 0; i < railPts.length - 1; i++) railCurve.add(new THREE.LineCurve3(railPts[i], railPts[i + 1]));
  const chickenGeo = new THREE.LatheGeometry([[0, 0], [0.03, 0.012], [0.062, 0.05], [0.088, 0.11], [0.096, 0.17], [0.084, 0.225], [0.056, 0.265], [0.03, 0.285], [0, 0.295]].map(([x, y]) => new THREE.Vector2(x * 0.8, y * 0.8)), 16);
  chickenGeo.translate(0, -0.236, 0);
  const legGeo = new THREE.CylinderGeometry(0.008, 0.007, 0.09, 6);
  const chickens = [];
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group();
    const body = shade(new THREE.Mesh(chickenGeo, M.feather)); body.position.y = -0.1; body.scale.set(1, 1, 0.82); g.add(body);
    for (const dx of [-0.018, 0.018]) { const l = new THREE.Mesh(legGeo, M.meat); l.position.set(dx, -0.055, 0); g.add(l); }
    const hook = new THREE.Mesh(legGeo, M.steelDark); hook.position.y = -0.01; g.add(hook);
    scene.add(g); chickens.push({ g, body, off: i / 16 });
  }
  // 03 juru sembelih, 04 talang tiris + lampu, 05 bak rendam, 06 mesin cabut bulu
  function worker(x, y, ry = 0) {
    const g = new THREE.Group();
    const torso = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.3, 6, 14), M.apron)); torso.position.y = 0.42; g.add(torso);
    const head = shade(new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), M.skin)); head.position.y = 0.72; g.add(head);
    const cap = shade(new THREE.Mesh(new THREE.SphereGeometry(0.078, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.apron)); cap.position.y = 0.735; g.add(cap);
    for (const dx of [-0.04, 0.04]) { const b = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), M.boot)); b.position.set(dx, 0.11, 0); g.add(b); }
    g.position.set(X(x), 0, Z(y)); g.rotation.y = ry; scene.add(g); return g;
  }
  worker(268, 520, Math.PI / 2);
  boxP(288, 300, 312, 470, 0.12, M.steel); boxP(292, 304, 308, 466, 0.005, M.blood, 0.12);
  cylP(342, 380, 0.012, 0.8, M.steelDark);
  cylP(342, 380, 0.035, 0.07, M.green, 0.8); cylP(342, 380, 0.035, 0.07, M.redOff, 0.875);
  const scald = boxP(326, 88, 430, 128, 0.42, M.steel);
  boxP(330, 92, 426, 124, 0.005, M.water, 0.42);
  boxP(436, 86, 452, 98, 0.16, M.plastic, 0.42);
  const pluckers = [];
  for (const y of [170, 222]) {
    cylP(470, y, 0.17, 0.5, M.steel, 0, 28);
    const top = cylP(470, y, 0.13, 0.02, M.plastic, 0.5, 20);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.03), M.steelDark); fin.position.set(X(470), 0.525, Z(y)); scene.add(fin);
    pluckers.push(fin);
  }

  // ---------- area bersih ----------
  function table(x1, y1, x2, y2, h = 0.42) {
    boxP(x1, y1, x2, y2, 0.03, M.steel, h - 0.03);
    [[x1 + 4, y1 + 4], [x2 - 4, y1 + 4], [x1 + 4, y2 - 4], [x2 - 4, y2 - 4]].forEach(([x, y]) => cylP(x, y, 0.012, h - 0.03, M.steel, 0, 8));
    boxP(x1 + 3, y1 + 3, x2 - 3, y2 - 3, 0.015, M.steel, 0.1);
  }
  table(560, 264, 700, 296);
  boxP(572, 270, 594, 290, 0.006, M.water, 0.42); boxP(666, 270, 688, 290, 0.006, M.water, 0.42);
  worker(630, 246, 0);
  boxP(730, 258, 870, 302, 0.38, M.steel);
  boxP(733, 261, 867, 299, 0.005, M.water, 0.38);
  for (let i = 0; i < 14; i++) { const c = box(0.05, 0.04, 0.05, M.ice, X(740 + (i * 37) % 120), 0.395, Z(266 + ((i * 13) % 28))); c.rotation.y = i; }
  boxP(800, 252, 814, 258, 0.1, M.plastic, 0.32);
  boxP(890, 170, 940, 210, 0.36, M.plastic); boxP(893, 173, 937, 207, 0.02, M.steel, 0.36);
  [[902, M.orangeLit], [915, M.redOff], [928, M.redOff]].forEach(([x, m]) => cylP(x, 162, 0.018, 0.05, m, 0.5, 12));
  cylP(915, 162, 0.006, 0.5, M.steelDark, 0, 6);
  table(570, 104, 860, 144);
  boxP(580, 112, 602, 136, 0.1, M.plastic, 0.42);
  for (let i = 0; i < 6; i++) boxP(640 + i * 34, 114, 664 + i * 34, 132, 0.03, M.meat, 0.42);
  worker(660, 90, 0); worker(790, 90, 0); worker(915, 230, Math.PI);

  // ---------- cold storage + ruang kontrol ----------
  const coolLight = new THREE.PointLight(0x8ccbf5, 1.2, 3); coolLight.position.set(X(640), 0.9, Z(480)); scene.add(coolLight);
  const cartonGeo = new THREE.BoxGeometry(0.16, 0.1, 0.12);
  [446, 472, 498, 524].forEach((ry, r) => {
    boxP(540, ry, 740, ry + 16, 0.012, M.steelDark, 0.22); boxP(540, ry, 740, ry + 16, 0.012, M.steelDark, 0.44);
    [540, 640, 738].forEach((x) => cylP(x, ry + 8, 0.008, 0.46, M.steelDark, 0, 6));
    for (let i = 0; i < 10; i++) for (const lv of [0.232, 0.452]) { if ((i + r + (lv > 0.3 ? 1 : 0)) % 4 === 3) continue; const c = shade(new THREE.Mesh(cartonGeo, M.carton)); c.position.set(X(550 + i * 19), lv + 0.05, Z(ry + 8)); scene.add(c); }
  });
  boxP(800, 470, 940, 500, 0.03, std({ color: 0x3a4047, roughness: 0.6 }), 0.36);
  [[805, 475], [935, 475], [805, 495], [935, 495]].forEach(([x, y]) => cylP(x, y, 0.01, 0.36, M.steelDark, 0, 6));
  const dash = tex(512, 256, (g, w, h) => {
    g.fillStyle = '#121417'; g.fillRect(0, 0, w, h);
    [['642', '#ECEEF0'], ['71,4%', '#ECEEF0'], ['428', '#ECEEF0'], ['1', '#F2A26A']].forEach(([v, c], i) => { g.fillStyle = i === 3 ? '#2A1F17' : '#1B1F23'; g.fillRect(12 + i * 124, 14, 114, 70); g.fillStyle = c; g.font = `500 34px ${MONO}`; g.fillText(v, 22 + i * 124, 64); });
    g.strokeStyle = '#8CCBF5'; g.lineWidth = 4; g.beginPath(); [40, 36, 38, 22, 26, 18, 20, 16].forEach((y, i) => { const px = 16 + i * 34, py = 110 + y * 2.4; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
    g.fillStyle = '#E8772E'; g.fillRect(300, 120, 190, 14); g.fillRect(300, 150, 160, 14); g.fillStyle = '#C9CED3'; g.fillRect(300, 180, 200, 14);
  });
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.42), new THREE.MeshBasicMaterial({ map: dash, toneMapped: false }));
  tv.position.set(X(850), 0.32, Z(400) + 0.03); scene.add(tv);
  boxP(774, 512, 800, 534, 0.3, M.plasticLight, 0.12);
  [[-0.06, 0x7bd88f], [0, 0x8ccbf5], [0.06, 0xf2a26a]].forEach(([dx, c]) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), basic(c)); l.position.set(X(787) + dx, 0.38, Z(534) + 0.003); scene.add(l); });
  worker(870, 455, Math.PI);

  // ---------- penanda alat (melayang) + garis data ke kotak penghubung ----------
  const T = { o: ['#E8772E', '#F2A26A', '#2A1F17', 0xf2a26a], b: ['#4FA3DC', '#8CCBF5', '#16232D', 0x8ccbf5], g: ['#A7AFB6', '#ECEEF0', '#20262B', 0xc9ced3] };
  function markerTex(label, t) {
    const [stroke, fg, bg] = T[t];
    return tex(128, 128, (g) => { g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.fillStyle = bg; g.fill(); g.lineWidth = 9; g.strokeStyle = stroke; g.stroke(); g.fillStyle = fg; g.font = `600 46px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 64, 67); });
  }
  const gate = new THREE.Vector3(X(787), 0.45, Z(523));
  const devices = [
    ['01', 't', 'o', 214, 136, 0.72], ['02', 't', 'b', 130, 446, 0.62], ['03', 't', 'g', 300, 480, 1.05], ['04', 't', 'g', 342, 380, 0.95],
    ['05', 't', 'b', 444, 92, 0.6], ['06', 't', 'g', 470, 196, 0.6], ['07', 't', 'o', 630, 280, 0.45], ['08', 't', 'b', 807, 255, 0.45],
    ['09', 't', 'o', 915, 190, 0.4], ['10', 't', 'o', 591, 124, 0.55], ['F', 't', 'b', 716, 470, 0.5], ['K', 'k', 'g', 787, 523, 0.45], ['L', 'k', 'g', 850, 400, 0.55],
  ];
  const markers = [], pulses = [], rings = [];
  const ringGeo = new THREE.RingGeometry(0.1, 0.13, 40);
  devices.forEach(([label, kind, t, x, y, top], i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex(label, t), depthTest: false, transparent: true }));
    sp.scale.set(0.3, 0.3, 1); labels.push([sp, 0.3, 0.3]); sp.position.set(X(x), top + 0.55, Z(y)); sp.renderOrder = 10; scene.add(sp);
    const ln = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.4, 6), basic(T[t][3], 0.55)); ln.position.set(X(x), top + 0.2, Z(y)); scene.add(ln);
    markers.push({ sp, base: top + 0.55, ph: i * 0.7 });
    if (t === 'b') { const r = new THREE.Mesh(ringGeo, basic(0x8ccbf5, 0.6)); r.rotation.x = -Math.PI / 2; r.position.set(X(x), 0.04, Z(y)); scene.add(r); rings.push({ r, ph: i * 0.37, alarm: label === '08' }); }
    if (kind === 't') {
      const a = new THREE.Vector3(X(x), top, Z(y));
      const mid = a.clone().add(gate).multiplyScalar(0.5); mid.y = 1.9 + a.distanceTo(gate) * 0.08;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, gate);
      const tubeM = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.005, 6, false), basic(T[t][3], 0.22)); scene.add(tubeM);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), basic(T[t][3])); scene.add(dot);
      pulses.push({ curve, dot, ph: (i * 0.29) % 1 });
    }
  });
  // cincin alarm oranye di pendingin (sesuai contoh layar: air pendingin naik)
  const alarmRing = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 48), basic(0xf2a26a, 0.7)); alarmRing.rotation.x = -Math.PI / 2; alarmRing.position.set(X(800), 0.4, Z(280)); scene.add(alarmRing);

  // ---------- aliran potongan (area bersih) + karton ke truk ----------
  const path = (pts, y) => { const c = new THREE.CurvePath(); for (let i = 0; i < pts.length - 1; i++) c.add(new THREE.LineCurve3(new THREE.Vector3(X(pts[i][0]), y, Z(pts[i][1])), new THREE.Vector3(X(pts[i + 1][0]), y, Z(pts[i + 1][1])))); return c; };
  const cleanCurve = path([[520, 280], [915, 280], [915, 124], [560, 124]], 0.47);
  const outCurve = path([[548, 124], [548, 470], [630, 470], [630, 600]], 0.1);
  const karkasGeo = new THREE.SphereGeometry(0.07, 14, 10);
  const items = [];
  for (let i = 0; i < 9; i++) { const m = shade(new THREE.Mesh(karkasGeo, M.meat)); m.scale.set(1.3, 0.7, 1); scene.add(m); items.push({ m, curve: cleanCurve, off: i / 9, speed: 0.045 }); }
  for (let i = 0; i < 6; i++) { const m = shade(new THREE.Mesh(cartonGeo, M.carton)); scene.add(m); items.push({ m, curve: outCurve, off: i / 6, speed: 0.06 }); }

  // ---------- kamera & ukuran ----------
  const stage = wrap;
  let zoom = 1;
  function frame() {
    const aspect = camera.aspect || 1.6;
    const halfW = 5.0, halfH = 3.3;
    const vf = THREE.MathUtils.degToRad(camera.fov / 2), hf = Math.atan(Math.tan(vf) * aspect);
    const dist = Math.max(halfW / Math.tan(hf), halfH / Math.tan(vf)) * 1.02 / zoom;
    controls.target.set(0, 0.2, 0.25);
    const dir = new THREE.Vector3(-0.22, 0.95, 0.72).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    camera.updateProjectionMatrix(); controls.update();
  }
  function setZoom(z) {
    zoom = Math.min(3, Math.max(0.8, z));
    const dir = camera.position.clone().sub(controls.target).normalize();
    const aspect = camera.aspect || 1.6; const vf = THREE.MathUtils.degToRad(camera.fov / 2), hf = Math.atan(Math.tan(vf) * aspect);
    const dist = Math.max(5.0 / Math.tan(hf), 3.3 / Math.tan(vf)) * 1.02 / zoom;
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    scene.fog.near = dist * 1.4; scene.fog.far = dist * 2.8; camera.far = dist * 4; camera.updateProjectionMatrix(); controls.update();
  }
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); setZoom(zoom);
    const k = w < 600 ? 1.7 : 1; labels.forEach(([sp, sx, sy]) => sp.scale.set(sx * k, sy * k, 1));
  }
  camera.aspect = stage.clientWidth / Math.max(1, stage.clientHeight); frame();
  new ResizeObserver(resize).observe(stage); resize();
  if (stage.clientWidth < 600) setZoom(1.3);

  let playing = !REDUCE;
  const pauseBtn = document.getElementById('d3-pause');
  const syncPause = () => { pauseBtn.textContent = playing ? 'Jeda' : 'Putar'; pauseBtn.setAttribute('aria-pressed', playing ? 'false' : 'true'); };
  syncPause();
  pauseBtn.addEventListener('click', () => { playing = !playing; controls.autoRotate = playing; syncPause(); });
  document.getElementById('d3-plus').addEventListener('click', () => setZoom(zoom * 1.25));
  document.getElementById('d3-minus').addEventListener('click', () => setZoom(zoom / 1.25));

  // ---------- animasi ----------
  let visible = true;
  new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }).observe(stage);
  const clock = new THREE.Clock();
  let t = SNAP ? 3.2 : 0;
  const tmp = new THREE.Vector3();
  function update(dt) {
    t += dt;
    chickens.forEach((c) => {
      const u = (t * 0.035 + c.off) % 1;
      railCurve.getPointAt(u, tmp); c.g.position.copy(tmp);
      c.body.material = u > 0.9 ? M.meat : M.feather;
      const s = Math.min(1, u / 0.04, (1 - u) / 0.04); c.g.scale.setScalar(Math.max(0.001, s));
      c.g.rotation.z = Math.sin(t * 3 + c.off * 20) * 0.06;
    });
    items.forEach((it) => { const u = (t * it.speed + it.off) % 1; it.curve.getPointAt(u, tmp); it.m.position.copy(tmp); const s = Math.min(1, u / 0.05, (1 - u) / 0.05); it.m.visible = s > 0.02; });
    pulses.forEach((p) => { const u = (t * 0.32 + p.ph) % 1; p.curve.getPointAt(u, tmp); p.dot.position.copy(tmp); p.dot.scale.setScalar(Math.sin(u * Math.PI) * 1.1 + 0.15); });
    markers.forEach((m) => { m.sp.position.y = m.base + Math.sin(t * 1.6 + m.ph) * 0.03; });
    rings.forEach((r) => { const u = (t * 0.6 + r.ph) % 1; r.r.scale.setScalar(1 + u * 2.2); r.r.material.opacity = 0.6 * (1 - u); });
    const a = (t * 1.4) % 1; alarmRing.scale.setScalar(1 + a * 1.6); alarmRing.material.opacity = 0.75 * (1 - a);
    blades.rotation.z -= dt * 9; pluckers.forEach((f) => { f.rotation.y += dt * 8; });
  }
  update(0);
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return;
    if (playing && !SNAP) update(dt);
    controls.update(); renderer.render(scene, camera);
    if (!wrap.classList.contains('live')) wrap.classList.add('live');
    if (SNAP) window.__dframe = (window.__dframe || 0) + 1;
  });
}
