// Penampil 3D alat. Kartu di halaman memakai gambar render 3D (ringan); tombol "Putar 3D" membuka
// model interaktif di jendela. Model disusun dari bentuk dasar (bukan file model). Three.js baru
// diunduh saat jendela pertama kali dibuka. Mode ?snap dipakai untuk membuat gambar kartu (img/alat-N.webp).
const dlg = document.getElementById('v3d');
const figs = [...document.querySelectorAll('#alat-grid figure')];
const capDi = document.getElementById('v3d-di');
const capNama = document.getElementById('v3d-nama');
const capKet = document.getElementById('v3d-ket');
const loadEl = document.getElementById('v3d-load');
const SNAP = new URLSearchParams(location.search).has('snap');

function punyaWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch (e) { return false; }
}

let current = 0;
let engine = null;
function setCaption(i) {
  const f = figs[i];
  capDi.textContent = f.querySelector('.di').textContent;
  capNama.textContent = f.querySelector('b').textContent;
  capKet.textContent = f.querySelector('p').textContent;
}
async function open(i) {
  current = (i + figs.length) % figs.length;
  setCaption(current);
  if (!dlg.open) dlg.showModal();
  if (!engine) engine = start().catch((err) => { console.error(err); loadEl.textContent = 'Model 3D tidak bisa dimuat di perangkat ini.'; return null; });
  const e = await engine;
  if (e) e.show(current);
}

if (punyaWebGL() && dlg && typeof dlg.showModal === 'function') {
  document.querySelectorAll('.putar').forEach((b) => { b.hidden = false; b.addEventListener('click', () => open(Number(b.dataset.i))); });
  document.getElementById('v3d-tutup').addEventListener('click', () => dlg.close());
  document.getElementById('v3d-prev').addEventListener('click', () => open(current - 1));
  document.getElementById('v3d-next').addEventListener('click', () => open(current + 1));
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });
  if (SNAP) { document.documentElement.classList.add('snap'); window.__pilih = (i) => open(i); window.__frame = 0; }
}

async function start() {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  try { await document.fonts.ready; } catch (e) {}

  const canvas = document.getElementById('v3d-canvas');
  const stage = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 60);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.1;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.45;
  let idle;
  controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idle); });
  controls.addEventListener('end', () => { idle = setTimeout(() => { controls.autoRotate = true; }, 4000); });

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(2.2, 4.2, 2.8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.8, right: 1.8, top: 1.8, bottom: -1.8, near: 0.5, far: 12 });
  key.shadow.bias = -0.0006;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xdfe8ef, 0x15181b, 0.6));
  const rim = new THREE.DirectionalLight(0x9fd3f7, 1.6); rim.position.set(-3, 2.6, -3.2); scene.add(rim);
  const fillL = new THREE.DirectionalLight(0xffe2c8, 0.5); fillL.position.set(-3, 1.2, 2.5); scene.add(fillL);

  // lantai studio: piringan pudar ke tepi + bayangan saja, supaya tidak ada garis cakrawala
  const fade = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256); gr.addColorStop(0, 'rgba(58,66,74,0.95)'); gr.addColorStop(0.55, 'rgba(40,46,52,0.6)'); gr.addColorStop(1, 'rgba(30,34,38,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(140,203,245,0.10)'; g.lineWidth = 2; for (const r of [120, 190]) { g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshBasicMaterial({ map: fade, transparent: true, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.001; scene.add(disc);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.45 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.002; floor.receiveShadow = true; scene.add(floor);

  // ---------- bahan ----------
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const glow = (c, k = 0.8) => std({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.4 });
  const M = {
    steel: std({ color: 0xc8cfd5, metalness: 0.85, roughness: 0.3 }),
    steelDark: std({ color: 0x8a939b, metalness: 0.8, roughness: 0.42 }),
    plastic: std({ color: 0x2b3036, roughness: 0.55 }),
    plasticMid: std({ color: 0x4a525a, roughness: 0.5 }),
    plasticLight: std({ color: 0xd3d8dc, roughness: 0.5 }),
    crate: std({ color: 0x2f6f9a, roughness: 0.6 }),
    water: std({ color: 0x4fa3dc, transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0.1, depthWrite: false }),
    ice: std({ color: 0xeaf6fd, transparent: true, opacity: 0.75, roughness: 0.08 }),
    meat: std({ color: 0xe9c5a6, roughness: 0.55 }),
    feather: std({ color: 0xece8df, roughness: 0.9 }),
    blood: std({ color: 0x3a1c1c, roughness: 0.35, metalness: 0.2 }),
    wall: std({ color: 0x2a2f34, roughness: 0.92 }),
    heater: glow(0xb5552a, 0.35),
    green: glow(0x7bd88f, 1.6),
    redOff: std({ color: 0x5a2a27, roughness: 0.35 }),
    ledB: glow(0x8ccbf5, 1.4),
    ledO: glow(0xf2a26a, 1.4),
    beam: new THREE.MeshBasicMaterial({ color: 0x8ccbf5, transparent: true, opacity: 0.85 }),
    cableO: std({ color: 0xe8772e, roughness: 0.5 }),
    cableB: std({ color: 0x4fa3dc, roughness: 0.5 }),
    cableG: std({ color: 0x3a4047, roughness: 0.5 }),
  };

  // ---------- bentuk dasar ----------
  const shade = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); return m; };
  const cyl = (rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 28) => { const m = shade(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat)); m.position.set(x, y, z); return m; };
  const sph = (r, mat, x = 0, y = 0, z = 0) => { const m = shade(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat)); m.position.set(x, y, z); return m; };
  const tube = (pts, r, mat) => shade(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 64, r, 8, false), mat));

  function tex(cw, ch, draw) {
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d'); draw(g, cw, ch);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const MONO = '"IBM Plex Mono", ui-monospace, Consolas, monospace';
  const SANS = '"IBM Plex Sans", system-ui, sans-serif';
  function screen(text, { fg = '#F2A26A', bg = '#2A1F17', w = 0.2, h = 0.08, size = 64 } = {}) {
    const cw = 320, ch = Math.round(320 * h / w);
    const t = tex(cw, ch, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
      g.fillStyle = fg; g.font = `500 ${size}px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, cw / 2, ch / 2 + 2);
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
  }
  function plane(w, h, map) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, toneMapped: false })); }
  const labelTex = () => tex(200, 280, (g, w, h) => {
    g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#121417'; g.font = `600 34px ${MONO}`; g.fillText('0,512 kg', 18, 50);
    g.font = `400 22px ${MONO}`; g.fillText('12-11 · B03', 18, 88); g.fillText('Paha atas', 18, 118);
    for (let x = 18, i = 0; x < 182; i++) { const bw = [3, 2, 5, 2, 3, 6, 2][i % 7]; g.fillRect(x, 150, bw, 90); x += bw + [3, 4, 2, 5][i % 4]; }
  });

  const chickenGeo = new THREE.LatheGeometry(
    [[0, 0], [0.03, 0.012], [0.062, 0.05], [0.088, 0.11], [0.096, 0.17], [0.084, 0.225], [0.056, 0.265], [0.03, 0.285], [0, 0.295]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
  function hangingChicken(x, railY, mat, z = 0) {
    const g = new THREE.Group();
    const hook = shade(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 8, 24, Math.PI), M.steelDark));
    hook.rotation.z = Math.PI; hook.position.set(x, railY - 0.03, z); g.add(hook);
    g.add(cyl(0.008, 0.008, 0.06, M.steelDark, x, railY - 0.005, z, 8));
    for (const dx of [-0.025, 0.025]) g.add(cyl(0.012, 0.009, 0.12, M.meat, x + dx, railY - 0.115, z, 10));
    const body = shade(new THREE.Mesh(chickenGeo, mat));
    body.scale.set(1, 1, 0.82); body.position.set(x, railY - 0.165 - 0.295, z); g.add(body);
    return g;
  }
  function rail(x0, x1, y, z = 0) {
    const g = new THREE.Group();
    g.add(box(x1 - x0, 0.04, 0.04, M.steelDark, (x0 + x1) / 2, y, z));
    for (const x of [x0 + 0.02, x1 - 0.02]) g.add(cyl(0.022, 0.022, y, M.steelDark, x, y / 2, z, 12));
    return g;
  }

  // ---------- 8 alat ----------
  function timbanganDuduk() {
    const g = new THREE.Group();
    for (const [x, z] of [[-0.45, -0.35], [0.45, -0.35], [-0.45, 0.35], [0.45, 0.35]]) g.add(cyl(0.03, 0.035, 0.03, M.plastic, x, 0.015, z));
    g.add(box(1.0, 0.07, 0.8, M.steel, 0, 0.065, 0));
    const c = new THREE.Group(); const cw = 0.78, ch = 0.34, cd = 0.56, t = 0.02;
    c.add(box(cw, t, cd, M.crate, 0, t / 2, 0));
    const bars = (len, alongX, pos) => { const n = Math.round(len / 0.065); for (let i = 0; i <= n; i++) { const p = -len / 2 + (i * len) / n; c.add(alongX ? box(0.022, ch, t, M.crate, p, ch / 2, pos) : box(t, ch, 0.022, M.crate, pos, ch / 2, p)); } };
    bars(cw, true, cd / 2); bars(cw, true, -cd / 2); bars(cd, false, cw / 2); bars(cd, false, -cw / 2);
    for (const y of [ch - 0.015, 0.12]) { c.add(box(cw, 0.03, t, M.crate, 0, y, cd / 2)); c.add(box(cw, 0.03, t, M.crate, 0, y, -cd / 2)); c.add(box(t, 0.03, cd, M.crate, cw / 2, y, 0)); c.add(box(t, 0.03, cd, M.crate, -cw / 2, y, 0)); }
    c.position.y = 0.1; g.add(c);
    g.add(cyl(0.11, 0.12, 0.02, M.steelDark, 0.62, 0.01, -0.3));
    g.add(cyl(0.02, 0.02, 1.02, M.steelDark, 0.62, 0.53, -0.3, 12));
    g.add(box(0.36, 0.22, 0.09, M.plastic, 0.62, 1.12, -0.3));
    const s = screen('182,4', { w: 0.27, h: 0.1 }); s.position.set(0.62, 1.15, -0.254); g.add(s);
    for (const dx of [-0.08, 0, 0.08]) { const b = cyl(0.012, 0.012, 0.01, M.plasticMid, 0.62 + dx, 1.05, -0.25, 12); b.rotation.x = Math.PI / 2; g.add(b); }
    g.add(cyl(0.007, 0.007, 0.14, M.plastic, 0.76, 1.3, -0.3, 8)); g.add(sph(0.012, M.ledB, 0.76, 1.375, -0.3));
    g.add(tube([[0.5, 0.06, -0.3], [0.58, 0.04, -0.3], [0.62, 0.05, -0.3]], 0.008, M.cableG));
    return g;
  }

  function timbanganMeja() {
    const g = new THREE.Group();
    g.add(box(1.5, 0.04, 0.66, M.steel, 0, 0.85, 0));
    g.add(box(1.44, 0.02, 0.6, M.steel, 0, 0.22, 0));
    for (const [x, z] of [[-0.71, -0.29], [0.71, -0.29], [-0.71, 0.29], [0.71, 0.29]]) g.add(cyl(0.02, 0.02, 0.83, M.steel, x, 0.415, z, 12));
    g.add(box(0.42, 0.08, 0.36, M.plastic, -0.35, 0.91, 0));
    g.add(box(0.38, 0.02, 0.32, M.steel, -0.35, 0.96, 0));
    const d = screen('0,512', { w: 0.2, h: 0.055, size: 70 }); d.position.set(-0.35, 0.91, 0.181); g.add(d);
    g.add(box(0.25, 0.03, 0.18, M.plasticLight, -0.35, 0.985, 0));
    g.add(box(0.21, 0.035, 0.14, M.meat, -0.35, 1.012, 0));
    const lb = plane(0.07, 0.098, labelTex()); lb.rotation.x = -Math.PI / 2; lb.position.set(-0.32, 1.031, 0.01); g.add(lb);
    g.add(box(0.3, 0.18, 0.3, M.plastic, 0.35, 0.96, 0));
    g.add(box(0.16, 0.012, 0.03, M.plasticMid, 0.35, 1.051, 0.05));
    const out = plane(0.1, 0.14, labelTex()); out.position.set(0.35, 1.12, 0.06); out.rotation.x = -0.28; g.add(out);
    const back = plane(0.1, 0.14, labelTex()); back.position.set(0.35, 1.12, 0.059); back.rotation.set(-0.28, Math.PI, 0);
    back.material = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.8 }); g.add(back);
    g.add(sph(0.01, M.green, 0.47, 1.0, 0.151));
    g.add(tube([[-0.16, 0.9, -0.12], [0, 0.875, -0.2], [0.2, 0.9, -0.13]], 0.008, M.cableO));
    return g;
  }

  function termostat() {
    const g = new THREE.Group();
    const y0 = 0.3, h = 0.5, w = 1.0, d = 0.6, t = 0.02;
    for (const [x, z] of [[-0.46, -0.26], [0.46, -0.26], [-0.46, 0.26], [0.46, 0.26]]) g.add(cyl(0.022, 0.022, y0, M.steel, x, y0 / 2, z, 12));
    g.add(box(w, t, d, M.steel, 0, y0 + t / 2, 0));
    g.add(box(w, h, t, M.steel, 0, y0 + h / 2, d / 2 - t / 2)); g.add(box(w, h, t, M.steel, 0, y0 + h / 2, -d / 2 + t / 2));
    g.add(box(t, h, d, M.steel, w / 2 - t / 2, y0 + h / 2, 0)); g.add(box(t, h, d, M.steel, -w / 2 + t / 2, y0 + h / 2, 0));
    const water = new THREE.Mesh(new THREE.BoxGeometry(w - 0.045, 0.36, d - 0.045), M.water); water.position.set(0, y0 + 0.2, 0); water.renderOrder = 2; g.add(water);
    const pts = []; for (let i = 0; i <= 160; i++) { const a = i * 0.55; pts.push([-0.4 + (i * 0.8) / 160, y0 + 0.07 + 0.028 * Math.sin(a), 0.028 * Math.cos(a)]); }
    g.add(tube(pts, 0.006, M.heater));
    g.add(cyl(0.02, 0.02, 1.2, M.steelDark, 0.7, 0.6, -0.12, 12));
    g.add(box(0.26, 0.32, 0.1, M.plasticMid, 0.7, 1.02, -0.07));
    const s = screen('53,8°', { fg: '#8CCBF5', bg: '#16232D', w: 0.2, h: 0.09 }); s.position.set(0.7, 1.08, -0.019); g.add(s);
    for (const dx of [-0.05, 0.05]) { const b = cyl(0.016, 0.016, 0.012, M.plastic, 0.7 + dx, 0.93, -0.017, 14); b.rotation.x = Math.PI / 2; g.add(b); }
    g.add(sph(0.02, M.redOff, 0.7, 1.2, -0.07));
    g.add(tube([[0.6, 0.98, -0.05], [0.48, 1.02, 0.02], [0.3, 0.95, 0.06], [0.25, 0.8, 0.06], [0.25, 0.58, 0.06]], 0.006, M.cableB));
    g.add(cyl(0.012, 0.012, 0.13, M.steel, 0.25, 0.52, 0.06, 12));
    return g;
  }

  function pendingin() {
    const g = new THREE.Group();
    const dx = -0.32, r = 0.32, y0 = 0.02, h = 0.62;
    const drum = shade(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40, 1, true), M.steel));
    drum.material.side = THREE.DoubleSide; drum.position.set(dx, y0 + h / 2, 0); g.add(drum);
    g.add(cyl(r, r, 0.02, M.steel, dx, y0, 0, 40));
    const torus = shade(new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 48), M.steel)); torus.rotation.x = Math.PI / 2; torus.position.set(dx, y0 + h, 0); g.add(torus);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.012, r - 0.012, 0.5, 40), M.water); water.position.set(dx, y0 + 0.26, 0); water.renderOrder = 2; g.add(water);
    for (const [ix, iz, ry] of [[-0.12, 0.05, 0.3], [0.08, -0.1, 1.1], [0.0, 0.14, 0.7], [-0.16, -0.12, 2], [0.15, 0.08, 0.2], [-0.02, -0.02, 1.6]]) {
      const c = box(0.07, 0.06, 0.07, M.ice, dx + ix, y0 + 0.5, iz); c.rotation.y = ry; g.add(c);
    }
    g.add(box(0.13, 0.09, 0.05, M.plastic, dx, y0 + h + 0.04, r + 0.03));
    const s = screen('1,6°', { fg: '#8CCBF5', bg: '#16232D', w: 0.1, h: 0.05, size: 80 }); s.position.set(dx, y0 + h + 0.045, r + 0.056); g.add(s);
    g.add(cyl(0.006, 0.006, 0.42, M.cableB, dx, y0 + 0.43, r - 0.05, 8));
    g.add(cyl(0.006, 0.006, 0.1, M.plastic, dx + 0.05, y0 + h + 0.13, r + 0.03, 8));
    // meja kecil + karkas + termometer tusuk
    const tx = 0.46;
    g.add(box(0.5, 0.04, 0.42, M.steel, tx, 0.7, 0));
    for (const [x, z] of [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]]) g.add(cyl(0.016, 0.016, 0.68, M.steel, tx + x, 0.34, z, 10));
    g.add(box(0.4, 0.02, 0.3, M.plasticLight, tx, 0.73, 0));
    const body = sph(0.13, M.meat, tx, 0.81, 0); body.scale.set(1.3, 0.72, 1); g.add(body);
    for (const sx of [-1, 1]) { const leg = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.09, 6, 12), M.meat)); leg.position.set(tx + sx * 0.1, 0.79, 0.12); leg.rotation.set(1.2, 0, sx * 0.5); g.add(leg); }
    const th = new THREE.Group();
    th.add(box(0.06, 0.16, 0.03, M.plasticLight, 0, 0.13, 0));
    const ts = screen('3,6°', { fg: '#ECEEF0', bg: '#1B1F23', w: 0.046, h: 0.03, size: 90 }); ts.position.set(0, 0.17, 0.016); th.add(ts);
    th.add(cyl(0.003, 0.003, 0.18, M.steel, 0, -0.04, 0, 8));
    th.position.set(tx + 0.02, 0.93, 0.03); th.rotation.z = -0.25; g.add(th);
    return g;
  }

  function lampuTiris() {
    const g = new THREE.Group();
    const ry = 1.35;
    g.add(rail(-0.85, 0.55, ry));
    for (const x of [-0.62, -0.32, -0.02, 0.28]) g.add(hangingChicken(x, ry, M.feather));
    g.add(box(1.4, 0.02, 0.32, M.steel, -0.15, 0.4, 0));
    g.add(box(1.4, 0.08, 0.02, M.steel, -0.15, 0.44, 0.15)); g.add(box(1.4, 0.08, 0.02, M.steel, -0.15, 0.44, -0.15));
    g.add(box(1.36, 0.01, 0.28, M.blood, -0.15, 0.416, 0));
    for (const x of [-0.8, 0.5]) g.add(cyl(0.016, 0.016, 0.39, M.steel, x, 0.195, 0, 10));
    const lx = 0.82, lz = 0.12;
    g.add(cyl(0.08, 0.09, 0.02, M.plastic, lx, 0.01, lz)); g.add(cyl(0.018, 0.018, 1.08, M.plasticMid, lx, 0.55, lz, 12));
    g.add(cyl(0.05, 0.05, 0.1, M.green, lx, 1.14, lz)); g.add(cyl(0.05, 0.05, 0.1, M.redOff, lx, 1.25, lz)); g.add(cyl(0.052, 0.052, 0.02, M.plastic, lx, 1.31, lz));
    const pl = new THREE.PointLight(0x7bd88f, 0.5, 0.8); pl.position.set(lx, 1.14, lz + 0.12); g.add(pl);
    g.add(box(0.2, 0.1, 0.06, M.plastic, lx, 0.82, lz + 0.03));
    const s = screen('02:40', { fg: '#ECEEF0', bg: '#121417', w: 0.16, h: 0.06 }); s.position.set(lx, 0.82, lz + 0.061); g.add(s);
    return g;
  }

  function penghitung() {
    const g = new THREE.Group();
    const ry = 1.35;
    g.add(rail(-0.9, 0.9, ry));
    for (const x of [-0.6, 0, 0.6]) g.add(hangingChicken(x, ry, M.feather));
    for (const z of [0.3, -0.3]) { g.add(cyl(0.016, 0.016, 1.0, M.plasticMid, 0, 0.5, z, 10)); g.add(box(0.06, 0.08, 0.06, M.plastic, 0, 1.03, z)); g.add(cyl(0.06, 0.07, 0.02, M.plastic, 0, 0.01, z)); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.54, 8), M.beam); beam.rotation.x = Math.PI / 2; beam.position.set(0, 1.03, 0); g.add(beam);
    g.add(cyl(0.016, 0.016, 1.0, M.plasticMid, 0.42, 0.5, 0.44, 10)); g.add(cyl(0.06, 0.07, 0.02, M.plastic, 0.42, 0.01, 0.44));
    g.add(box(0.32, 0.14, 0.06, M.plastic, 0.42, 1.06, 0.47));
    const s = screen('0642', { fg: '#ECEEF0', bg: '#121417', w: 0.27, h: 0.1, size: 78 }); s.position.set(0.42, 1.06, 0.501); g.add(s);
    g.add(tube([[0, 1.0, 0.33], [0.2, 0.96, 0.4], [0.4, 1.0, 0.45]], 0.006, M.cableG));
    return g;
  }

  function kotakPenghubung() {
    const g = new THREE.Group();
    g.add(box(1.4, 1.5, 0.04, M.wall, 0, 0.75, -0.3));
    const bx = -0.16, bz = -0.19;
    g.add(box(0.42, 0.52, 0.18, M.plasticLight, bx, 1.0, bz));
    g.add(box(0.4, 0.004, 0.005, M.plasticMid, bx, 1.0, bz + 0.091));
    [[M.green, -0.12], [M.ledB, -0.08], [M.ledO, -0.04]].forEach(([m, x]) => g.add(sph(0.012, m, bx + x, 1.19, bz + 0.092)));
    for (let i = 0; i < 4; i++) g.add(box(0.22, 0.008, 0.004, M.plasticMid, bx + 0.04, 0.88 - i * 0.03, bz + 0.092));
    const k = screen('ONLINE', { fg: '#7BD88F', bg: '#121417', w: 0.14, h: 0.04, size: 60 }); k.position.set(bx + 0.08, 1.19, bz + 0.092); g.add(k);
    g.add(cyl(0.01, 0.01, 0.2, M.plastic, bx + 0.15, 1.36, bz, 8));
    [[M.cableO, -0.1, [-0.5, 0.03, 0.3]], [M.cableB, 0, [-0.1, 0.03, 0.45]], [M.cableG, 0.1, [0.25, 0.03, 0.4]]].forEach(([m, x, end]) => {
      g.add(tube([[bx + x, 0.74, bz], [bx + x, 0.4, bz], [bx + x, 0.06, bz + 0.05], end], 0.008, m));
    });
    g.add(box(0.24, 0.36, 0.34, M.plastic, 0.42, 0.18, -0.08));
    const u = screen('100%', { fg: '#7BD88F', bg: '#121417', w: 0.12, h: 0.05, size: 70 }); u.position.set(0.42, 0.26, 0.091); g.add(u);
    g.add(sph(0.01, M.green, 0.52, 0.12, 0.091));
    g.add(tube([[0.4, 0.36, -0.18], [0.3, 0.6, -0.22], [0.0, 0.76, -0.22], [-0.05, 0.8, -0.2]], 0.008, M.cableG));
    return g;
  }

  function layarHp() {
    const g = new THREE.Group();
    g.add(box(1.7, 1.6, 0.04, M.wall, 0, 0.8, -0.3));
    g.add(box(1.12, 0.66, 0.04, M.plastic, -0.12, 1.08, -0.26));
    const dash = tex(1024, 592, (c, w, h) => {
      c.fillStyle = '#121417'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#A7AFB6'; c.font = `500 22px ${MONO}`; c.fillText('LAYAR PRODUKSI', 36, 46);
      c.fillStyle = '#ECEEF0'; c.font = `600 34px ${SANS}`; c.fillText('Batch 03 · Truk ketiga', 36, 90);
      c.font = `500 40px ${MONO}`; c.textAlign = 'right'; c.fillText('04:36', w - 36, 84); c.textAlign = 'left';
      const k = [['Ekor', '642', '#ECEEF0', '#2C3238'], ['Hasil karkas', '71,4%', '#ECEEF0', '#2C3238'], ['Ekor/jam', '428', '#ECEEF0', '#2C3238'], ['Alarm', '1', '#F2A26A', '#E8772E']];
      k.forEach(([l, v, col, br], i) => { const x = 36 + i * 242; c.fillStyle = i === 3 ? '#2A1F17' : '#1B1F23'; c.fillRect(x, 120, 226, 120); c.strokeStyle = br; c.lineWidth = 2; c.strokeRect(x, 120, 226, 120);
        c.fillStyle = i === 3 ? '#F2A26A' : '#A7AFB6'; c.font = `400 22px ${SANS}`; c.fillText(l, x + 18, 156); c.fillStyle = col; c.font = `500 52px ${MONO}`; c.fillText(v, x + 18, 218); });
      c.fillStyle = '#1B1F23'; c.fillRect(36, 264, 560, 292); c.fillRect(612, 264, 376, 292);
      c.fillStyle = '#ECEEF0'; c.font = `600 24px ${SANS}`; c.fillText('Suhu', 58, 302); c.fillText('Timbangan 3 titik', 634, 302);
      const lines = [['#8CCBF5', [20, 18, 19, 8, 6, 17, 19, 18, 19]], ['#F2A26A', [26, 26, 25, 24, 22, 19, 15, 12, 10]], ['#8CCBF5', [22, 21, 22, 21, 20, 20, 19, 19, 18]]];
      lines.forEach(([col, ys], r) => { const y0 = 330 + r * 74; c.fillStyle = 'rgba(79,163,220,.18)'; c.fillRect(58, y0 + 8, 516, 26); c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); ys.forEach((y, i) => { const px = 58 + i * 64.5, py = y0 + y * 1.6; i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke(); });
      [[1, '#C9CED3'], [0.714, '#E8772E'], [0.703, '#E8772E']].forEach(([f, col], i) => { const y = 340 + i * 66; c.fillStyle = '#2C3238'; c.fillRect(634, y, 332, 16); c.fillStyle = col; c.fillRect(634, y, 332 * f, 16); });
      c.strokeStyle = '#E8772E'; c.lineWidth = 2; c.strokeRect(634, 500, 332, 40); c.fillStyle = '#F2A26A'; c.font = `600 20px ${SANS}`; c.fillText('Selisih ke pak 12,7 kg', 650, 527);
    });
    const tv = plane(1.08, 0.624, dash); tv.position.set(-0.12, 1.08, -0.239); g.add(tv);
    g.add(cyl(0.12, 0.14, 0.62, M.plasticMid, 0.58, 0.31, 0.22));
    const ph = new THREE.Group();
    ph.add(box(0.16, 0.32, 0.016, M.plastic));
    const pt = tex(300, 600, (c, w, h) => {
      c.fillStyle = '#121417'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#ECEEF0'; c.font = `500 44px ${MONO}`; c.textAlign = 'center'; c.fillText('04:31', w / 2, 90); c.textAlign = 'left';
      c.fillStyle = '#2A1F17'; c.fillRect(16, 130, w - 32, 150); c.strokeStyle = '#E8772E'; c.lineWidth = 3; c.strokeRect(16, 130, w - 32, 150);
      c.fillStyle = '#F2A26A'; c.font = `600 24px ${SANS}`; c.fillText('Alarm', 32, 170);
      c.fillStyle = '#ECEEF0'; c.font = `400 22px ${SANS}`; c.fillText('Air pendingin 2,4 °C.', 32, 210); c.fillText('Tambah es sekarang.', 32, 245);
      c.fillStyle = '#1B1F23'; c.fillRect(16, 300, w - 32, 130); c.fillStyle = '#A7AFB6'; c.font = `400 22px ${SANS}`; c.fillText('Hasil karkas hari ini', 32, 340);
      c.fillStyle = '#ECEEF0'; c.font = `500 46px ${MONO}`; c.fillText('71,4%', 32, 400);
    });
    const ps = plane(0.148, 0.296, pt); ps.position.z = 0.0085; ph.add(ps);
    ph.position.set(0.58, 0.66, 0.22); ph.rotation.set(-0.45, -0.35, 0); g.add(ph);
    g.add(box(0.12, 0.05, 0.08, M.plastic, 0.58, 0.635, 0.24));
    return g;
  }

  const builders = [timbanganDuduk, timbanganMeja, termostat, pendingin, lampuTiris, penghitung, kotakPenghubung, layarHp];
  const cache = [];
  let shown = null;

  function frame(obj) {
    const b = new THREE.Box3().setFromObject(obj);
    const size = b.getSize(new THREE.Vector3());
    const r = size.length() / 2;
    const aspect = camera.aspect || 1;
    const fit = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = fit * (aspect < 1 ? 0.95 / aspect : 0.84);
    controls.target.set(0, size.y * 0.46, 0);
    const dir = new THREE.Vector3(0.6, 0.42, 0.8).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    camera.near = dist / 60; camera.far = dist * 12; camera.updateProjectionMatrix(); controls.update();
  }
  function show(i) {
    if (!cache[i]) {
      const g = builders[i]();
      const b = new THREE.Box3().setFromObject(g); const c = b.getCenter(new THREE.Vector3());
      g.position.x -= c.x; g.position.z -= c.z; cache[i] = g;
    }
    if (shown) scene.remove(shown);
    shown = cache[i]; scene.add(shown); frame(shown);
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (shown) frame(shown);
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  if (SNAP) controls.autoRotate = false;

  renderer.setAnimationLoop(() => {
    if (!dlg.open) return;
    controls.update(); renderer.render(scene, camera);
    loadEl.hidden = true;
    if (SNAP) window.__frame++;
  });
  return { show: (i) => { if (!SNAP) controls.autoRotate = true; show(i); resize(); } };
}
