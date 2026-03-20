const canvas = document.getElementById('c');
const H = 520, W = canvas.clientWidth || 720;
canvas.width = W; canvas.height = H;

const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
R.setSize(W, H); R.setPixelRatio(Math.min(devicePixelRatio, 2)); R.shadowMap.enabled = true;

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(42, W/H, 0.1, 100);
cam.position.set(5, 3.5, 6); cam.lookAt(0, 0.2, 0);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const kl = new THREE.DirectionalLight(0xffffff, 1.1);
kl.position.set(5,8,5); kl.castShadow = true; scene.add(kl);
const fl = new THREE.DirectionalLight(0xaaccff, 0.4);
fl.position.set(-4,2,-3); scene.add(fl);

// Materials
const mat = (c,m,r) => new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r});
const S = mat(0xc8cdd8,.85,.2), D = mat(0x555e6e,.8,.3), G = mat(0xc8922a,.85,.25), F = mat(0x9aa4b4,.7,.35);

// Mesh helper
const mk = (geo, m, parent, rx, rz, py, sh) => {
  const mesh = new THREE.Mesh(geo, m);
  if (rx) mesh.rotation.x = rx;
  if (rz) mesh.rotation.z = rz;
  if (py) mesh.position.y = py;
  if (sh) mesh.castShadow = true;
  parent.add(mesh); return mesh;
};

// Groups
const PG = new THREE.Group(), GG = new THREE.Group(), WG = new THREE.Group();
scene.add(PG); PG.add(GG); GG.add(WG);

// Rings
mk(new THREE.TorusGeometry(1.05,.055,18,72), S, PG, Math.PI/2, 0, 0, true);
mk(new THREE.TorusGeometry(0.85,.045,16,64), D, GG, 0, 0, 0, true);

// Outer pivots
[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]].forEach(([x,y,z]) => {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,.18,10), G);
  p.position.set(x*1.05,y*1.05,z*1.05); if(x) p.rotation.z = Math.PI/2; PG.add(p);
  const b = new THREE.Mesh(new THREE.SphereGeometry(.042,14,14), G);
  b.position.set(x*1.05,y*1.05,z*1.05); PG.add(b);
});

// Inner pivots
[-1,1].forEach(x => {
  const p = mk(new THREE.CylinderGeometry(.022,.022,.15,10), G, GG, 0, Math.PI/2);
  p.position.x = x*.85;
  const b = mk(new THREE.SphereGeometry(.035,12,12), G, GG);
  b.position.x = x*.85;
});

// Flywheel
mk(new THREE.CylinderGeometry(.62,.62,.14,64), F, WG, 0, Math.PI/2, 0, true);
mk(new THREE.TorusGeometry(.62,.07,14,72), S, WG, 0,0,0, true);
for(let i=0;i<8;i++){
  const a=(i/8)*Math.PI*2, s=mk(new THREE.CylinderGeometry(.016,.016,.58,8),D,WG,0,Math.PI/2);
  s.position.set(Math.cos(a)*.29,0,Math.sin(a)*.29); s.rotation.y=-a;
}
mk(new THREE.CylinderGeometry(.1,.1,.2,28), G, WG, 0, Math.PI/2);
[-0.11,0.11].forEach(x => { const c=mk(new THREE.SphereGeometry(.072,16,16),G,WG); c.position.x=x; });
mk(new THREE.CylinderGeometry(.026,.026,1.8,14), S, WG, 0, Math.PI/2);

// Stand
mk(new THREE.CylinderGeometry(.035,.035,1.45,14), D, scene, 0,0,-0.83, true);
mk(new THREE.CylinderGeometry(.16,.22,.1,32),     D, scene, 0,0,-1.58, true);
mk(new THREE.SphereGeometry(.065,16,16),          G, scene, 0,0,-0.06);
const fl2 = mk(new THREE.PlaneGeometry(12,12), mat(0x1e2228,.05,.9), scene, -Math.PI/2,0,-1.64);
fl2.receiveShadow = true;

// Arrows
const arrow = (color, len) => {
  const m = mat(color,.1,.6), g = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,len,10), m);
  sh.position.y = len/2;
  const hd = new THREE.Mesh(new THREE.ConeGeometry(.045,.14,12), m);
  hd.position.y = len+.07;
  g.add(sh,hd); return g;
};

const wA = arrow(0x3a7acc,1.3); wA.rotation.z=-Math.PI/2; wA.position.x=.7; WG.add(wA);
const pA = arrow(0xcc3a3a,1.0); pA.position.y=1.15; scene.add(pA);
const cA = arrow(0xe8960a,1.0); cA.rotation.x=Math.PI/2; scene.add(cA);

// Animation
let sa=0, pa=0, ss=5, ps=.55, running=false, id=null;
const draw = () => R.render(scene,cam);

function loop() {
  id = requestAnimationFrame(loop);
  sa+=ss*.016; pa+=ps*.016;
  PG.rotation.y=pa; GG.rotation.z=Math.sin(pa*.5)*.06; WG.rotation.x=sa;
  cA.rotation.y=pa+Math.PI/2;
  draw();
}

draw();
window.addEventListener('resize', () => {
  const w=canvas.clientWidth; cam.aspect=w/H; cam.updateProjectionMatrix(); R.setSize(w,H);
});

// Panel
const $ = id => document.getElementById(id);
const vals = () => ['inp-I','inp-rpm','inp-prec'].map(id=>parseFloat($(id).value));
const box = $('result-box');

$('btn-calc').onclick = () => {
  const [I,rpm,prec]=vals();
  box.textContent = vals().some(isNaN) ? 'Fill all fields' : 'C = '+(I*rpm*2*Math.PI/60*prec).toFixed(2)+' N·m';
};

$('btn-apply').onclick = () => {
  const [I,rpm,prec]=vals();
  if(vals().some(isNaN)){box.textContent='Fill all fields first';return;}
  ss=Math.min(Math.max(rpm*2*Math.PI/60*.01,.5),20);
  ps=Math.min(Math.max(prec*.5,.1),4);
  if(!running){running=true;loop();}
};
