import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js';

const DATA = window.BERLAYAR_DATA;
const sceneHost = document.getElementById('scene');
const blockDrawer = document.getElementById('blockDrawer');
const unitDialog = document.getElementById('unitDialog');
const sourcesDialog = document.getElementById('sourcesDialog');
const labels = new Map();
const blockMeshes = [];
const blockGroups = new Map();
let selectedBlock = null;
let activeType = 'all';
let cameraTween = null;

const typeLabel = key => DATA.flatTypes[key]?.label || key;
const money = n => new Intl.NumberFormat('en-SG', { style:'currency', currency:'SGD', maximumFractionDigits:0 }).format(n);
const floorNumber = floor => String(floor).padStart(2, '0');

function residentialFloors(block) {
  const exclude = new Set(block.floors.exclude || []);
  const floors = [];
  for (let f = block.floors.min; f <= block.floors.max; f++) {
    if (!exclude.has(f)) floors.push(f);
  }
  return floors;
}

function makeUnits() {
  const units = [];
  for (const block of DATA.blocks) {
    const floors = residentialFloors(block);
    for (const floor of floors) {
      for (const stack of block.stacks) {
        units.push({
          id: `${block.id}-${floorNumber(floor)}-${stack.no}`,
          block: block.id,
          floor,
          stack: stack.no,
          type: stack.type,
          status: 'available',
          basis: 'Initial published project supply; not live HDB availability.'
        });
      }
    }
  }
  return units;
}

const units = makeUnits();

function validateData() {
  const errors = [];
  const total = units.length;
  if (total !== DATA.project.totalUnits) errors.push(`Generated ${total} units, expected ${DATA.project.totalUnits}.`);
  for (const [type, meta] of Object.entries(DATA.flatTypes)) {
    const actual = units.filter(u => u.type === type).length;
    if (actual !== meta.total) errors.push(`${type}: generated ${actual}, expected ${meta.total}.`);
  }
  for (const block of DATA.blocks) {
    const actual = units.filter(u => u.block === block.id).length;
    if (actual !== block.total) errors.push(`${block.id}: generated ${actual}, expected ${block.total}.`);
  }
  if (errors.length) {
    console.error('Berlayar data validation failed:', errors);
  } else {
    console.info(`Berlayar dataset validated: ${total.toLocaleString()} units across ${DATA.blocks.length} residential blocks.`);
  }
}
validateData();

function statusCounts(subset = units) {
  return subset.reduce((acc, u) => { acc[u.status] = (acc[u.status] || 0) + 1; return acc; }, {available:0,reported:0,taken:0,unknown:0});
}

function updateSummary() {
  const c = statusCounts();
  document.getElementById('totalUnits').textContent = units.length.toLocaleString();
  document.getElementById('availableUnits').textContent = c.available.toLocaleString();
  document.getElementById('reportedUnits').textContent = c.reported.toLocaleString();
  document.getElementById('takenUnits').textContent = c.taken.toLocaleString();
}
updateSummary();

// ---------- THREE.JS SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1713);
scene.fog = new THREE.Fog(0x0a1713, 52, 92);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
camera.position.set(36, 42, 50);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sceneHost.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .07;
controls.minDistance = 20;
controls.maxDistance = 88;
controls.maxPolarAngle = Math.PI * .47;
controls.target.set(-2, 3, 2);

scene.add(new THREE.HemisphereLight(0xdfe9dc, 0x22352d, 2.3));
const sun = new THREE.DirectionalLight(0xfff3d2, 3.2);
sun.position.set(-24, 45, -18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -45; sun.shadow.camera.right = 45; sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
scene.add(sun);

const groundMat = new THREE.MeshStandardMaterial({ color:0x43594a, roughness:.95 });
const ground = new THREE.Mesh(new THREE.BoxGeometry(60, 1.2, 56), groundMat);
ground.position.y = -.7;
ground.receiveShadow = true;
scene.add(ground);

function addRoad(x, z, w, d, rot=0) {
  const road = new THREE.Mesh(new THREE.BoxGeometry(w,.09,d), new THREE.MeshStandardMaterial({color:0x303936,roughness:1}));
  road.position.set(x,.02,z); road.rotation.y=rot; road.receiveShadow=true; scene.add(road);
}
addRoad(0,-27,62,7,0);      // Telok Blangah Rd / highway edge
addRoad(-28,2,6,55,-.03);   // Berlayar Street
addRoad(1,27,58,6,.03);     // Berlayar Drive
addRoad(7,7,5,33,.38);      // internal spine
addRoad(-5,4,25,3,.03);
addRoad(-10,16,22,3,.03);

function addPath(x,z,w,d,rot=0) {
  const p = new THREE.Mesh(new THREE.BoxGeometry(w,.06,d), new THREE.MeshStandardMaterial({color:0xb9b5a6,roughness:1}));
  p.position.set(x,.08,z); p.rotation.y=rot; scene.add(p);
}
addPath(-4,-5,38,1.2,0);
addPath(-8,9,28,1.2,-.05);
addPath(1,18,31,1.2,.02);

function addTree(x,z,s=1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,.75,6), new THREE.MeshStandardMaterial({color:0x5c4834}));
  trunk.position.set(x,.43,z);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.46*s,1), new THREE.MeshStandardMaterial({color:0x668a65,roughness:1}));
  crown.position.set(x,1.02,z);
  scene.add(trunk,crown);
}
for (let i=0;i<42;i++) {
  const a = (i/42)*Math.PI*2;
  const rx = 24 + Math.sin(i*1.7)*2.5;
  const rz = 22 + Math.cos(i*2.1)*2;
  addTree(Math.cos(a)*rx, Math.sin(a)*rz, .8 + (i%4)*.08);
}
for (const [x,z] of [[-10,2],[-13,6],[-8,7],[6,-1],[12,3],[5,14],[11,13],[-19,10],[-20,14],[-10,21],[0,22]]) addTree(x,z,1.15);

function facadeTexture(block) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e7e3d9'; ctx.fillRect(0,0,512,256);
  const stacks = block.stacks.length;
  ctx.fillStyle = '#26352f';
  for (let row=0;row<9;row++) {
    for (let col=0;col<stacks;col++) {
      const x = 26 + col*(460/stacks);
      const y = 21 + row*25;
      ctx.fillRect(x,y,Math.max(13, 29-(stacks-6)*2),10);
    }
  }
  ctx.fillStyle = '#b9b5a9';
  ctx.fillRect(0,238,512,18);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBuilding(block) {
  const g = new THREE.Group();
  const h = block.storeys * .39;
  const mat = new THREE.MeshStandardMaterial({ map:facadeTexture(block), color:0xffffff, roughness:.8 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(block.model.width,h,block.model.depth), mat);
  tower.position.y = h/2;
  tower.castShadow = true; tower.receiveShadow = true;
  tower.userData.blockId = block.id;
  blockMeshes.push(tower);
  g.add(tower);

  const podium = new THREE.Mesh(new THREE.BoxGeometry(block.model.width*1.04,.75,block.model.depth*1.08), new THREE.MeshStandardMaterial({color:0xc8c3b6,roughness:1}));
  podium.position.y=.38; podium.castShadow=true; g.add(podium);

  // Narrow rooftop greenery on selected tall blocks, deliberately abstract rather than architectural detail.
  if (block.id === '201A' || block.id === '201B') {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(block.model.width*.44,.16,block.model.depth*.8), new THREE.MeshStandardMaterial({color:0x6f936a}));
    roof.position.set(block.model.width*.2,h+.12,0); g.add(roof);
  }

  g.position.set(block.model.x,0,block.model.z);
  g.rotation.y = block.model.rotationY || 0;
  scene.add(g);
  blockGroups.set(block.id,g);
  return g;
}
DATA.blocks.forEach(makeBuilding);

// Ancillary massing from the published site plan: MSCP and community buildings.
function addLowBuilding(x,z,w,d,h,color=0x776d58,rot=0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({color,roughness:.9}));
  mesh.position.set(x,h/2,z); mesh.rotation.y=rot; mesh.castShadow=true; mesh.receiveShadow=true; scene.add(mesh); return mesh;
}
addLowBuilding(12,7.5,10,9,2.6,0x766f57,.15); // MSCP abstract mass
addLowBuilding(-19,-18,4,4,2.2,0x7d765e,.12); // preschool/service mass
addLowBuilding(18,18,5,4,1.5,0x6f795f,-.18);

// tiny water hint toward southern edge
const water = new THREE.Mesh(new THREE.PlaneGeometry(66,15), new THREE.MeshStandardMaterial({color:0x315969,roughness:.5,metalness:.05,transparent:true,opacity:.7}));
water.rotation.x=-Math.PI/2; water.position.set(0,-.02,38); scene.add(water);

// HTML labels above residential blocks.
for (const block of DATA.blocks) {
  const el = document.createElement('div');
  el.className = 'block-label';
  el.innerHTML = `<strong>Block ${block.id}</strong><span>${block.total.toLocaleString()} / ${block.total.toLocaleString()} available</span>`;
  sceneHost.appendChild(el);
  labels.set(block.id, el);
}

function resize() {
  const r = sceneHost.getBoundingClientRect();
  renderer.setSize(r.width,r.height,false);
  camera.aspect = r.width/r.height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function updateLabels() {
  const r = sceneHost.getBoundingClientRect();
  for (const block of DATA.blocks) {
    const group = blockGroups.get(block.id);
    const pos = new THREE.Vector3(block.model.x, block.storeys*.39 + 1.7, block.model.z);
    pos.project(camera);
    const x = (pos.x*.5+.5)*r.width;
    const y = (-pos.y*.5+.5)*r.height;
    const el = labels.get(block.id);
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    el.style.display = pos.z > 1 ? 'none' : '';
  }
}

function animate(t) {
  requestAnimationFrame(animate);
  if (cameraTween) {
    const p = Math.min(1,(t-cameraTween.start)/cameraTween.duration);
    const e = 1-Math.pow(1-p,3);
    camera.position.lerpVectors(cameraTween.fromPos,cameraTween.toPos,e);
    controls.target.lerpVectors(cameraTween.fromTarget,cameraTween.toTarget,e);
    if (p>=1) cameraTween=null;
  }
  controls.update();
  updateLabels();
  renderer.render(scene,camera);
}
requestAnimationFrame(animate);

function flyToBlock(block) {
  const toTarget = new THREE.Vector3(block.model.x, block.storeys*.16, block.model.z);
  const toPos = new THREE.Vector3(block.model.x + 17, block.storeys*.26 + 14, block.model.z + 20);
  cameraTween = {
    start: performance.now(), duration: 800,
    fromPos: camera.position.clone(), toPos,
    fromTarget: controls.target.clone(), toTarget
  };
}
function resetView() {
  cameraTween = {
    start: performance.now(), duration: 850,
    fromPos: camera.position.clone(), toPos:new THREE.Vector3(36,42,50),
    fromTarget: controls.target.clone(), toTarget:new THREE.Vector3(-2,3,2)
  };
}
document.getElementById('resetViewBtn').addEventListener('click', resetView);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.domElement.addEventListener('pointerup', e => {
  if (e.button !== 0) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX-rect.left)/rect.width)*2-1;
  pointer.y = -((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hit = raycaster.intersectObjects(blockMeshes,false)[0];
  if (!hit) return;
  const block = DATA.blocks.find(b => b.id === hit.object.userData.blockId);
  if (block) openBlock(block);
});

// ---------- FILTERS ----------
document.getElementById('typeFilters').addEventListener('click', e => {
  const btn = e.target.closest('[data-type]');
  if (!btn) return;
  activeType = btn.dataset.type;
  document.querySelectorAll('#typeFilters .filter').forEach(b => b.classList.toggle('active', b === btn));
  for (const block of DATA.blocks) {
    const hasType = activeType === 'all' || block.stacks.some(s => s.type === activeType);
    const g = blockGroups.get(block.id);
    g.traverse(obj => { if (obj.isMesh) obj.material.opacity = hasType ? 1 : .18; if (obj.isMesh) obj.material.transparent = !hasType; });
    labels.get(block.id).classList.toggle('dimmed', !hasType);
  }
});

// ---------- BLOCK DRAWER ----------
function blockUnits(id) { return units.filter(u => u.block === id); }
function openBlock(block) {
  selectedBlock = block;
  flyToBlock(block);
  const subset = blockUnits(block.id);
  const c = statusCounts(subset);
  document.getElementById('drawerBlockName').textContent = `Block ${block.id}`;
  document.getElementById('drawerBlockMeta').textContent = `${block.storeys} storeys · ${block.stacks.length} stacks · ${block.stacks.map(s=>s.no).join(', ')}`;
  document.getElementById('drawerAvailable').textContent = c.available.toLocaleString();
  document.getElementById('drawerTotal').textContent = block.total.toLocaleString();
  document.getElementById('drawerWait').textContent = `${block.waitMonths} mo`;
  document.getElementById('drawerTypeFilter').value = 'all';
  document.getElementById('drawerStatusFilter').value = 'all';
  renderUnitGrid();
  blockDrawer.classList.add('open');
  blockDrawer.setAttribute('aria-hidden','false');
}
function closeDrawer() {
  blockDrawer.classList.remove('open');
  blockDrawer.setAttribute('aria-hidden','true');
}
document.getElementById('closeDrawerBtn').addEventListener('click', closeDrawer);

document.getElementById('drawerTypeFilter').addEventListener('change', renderUnitGrid);
document.getElementById('drawerStatusFilter').addEventListener('change', renderUnitGrid);

function renderUnitGrid() {
  if (!selectedBlock) return;
  const typeFilter = document.getElementById('drawerTypeFilter').value;
  const statusFilter = document.getElementById('drawerStatusFilter').value;
  const head = document.getElementById('unitTableHead');
  const body = document.getElementById('unitTableBody');
  head.innerHTML = `<tr><th class="floor-head">Floor</th>${selectedBlock.stacks.map(s=>`<th><span>${s.no}</span><br><small>${typeLabel(s.type).replace('2-Room Flexi ','')}</small></th>`).join('')}</tr>`;
  body.innerHTML = '';
  const floors = residentialFloors(selectedBlock).sort((a,b)=>b-a);
  const byKey = new Map(blockUnits(selectedBlock.id).map(u=>[`${u.floor}-${u.stack}`,u]));
  for (const floor of floors) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<th>${floorNumber(floor)}</th>`;
    for (const stack of selectedBlock.stacks) {
      const u = byKey.get(`${floor}-${stack.no}`);
      const td = document.createElement('td');
      if (!u) { td.innerHTML = '<button class="unit-cell empty" tabindex="-1"></button>'; tr.appendChild(td); continue; }
      const btn = document.createElement('button');
      btn.type='button'; btn.className=`unit-cell ${u.status}`; btn.textContent=`#${floorNumber(floor)}-${stack.no}`;
      if (typeFilter !== 'all' && u.type !== typeFilter) btn.classList.add('hidden-type');
      if (statusFilter !== 'all' && u.status !== statusFilter) btn.classList.add('hidden-status');
      btn.addEventListener('click',()=>openUnit(u));
      td.appendChild(btn); tr.appendChild(td);
    }
    body.appendChild(tr);
  }
}

// ---------- UNIT DIALOG ----------
function openUnit(u) {
  const meta = DATA.flatTypes[u.type];
  document.getElementById('unitTitle').textContent = `#${floorNumber(u.floor)}-${u.stack}`;
  document.getElementById('unitBlock').textContent = `Block ${u.block}`;
  document.getElementById('unitFloor').textContent = floorNumber(u.floor);
  document.getElementById('unitStack').textContent = u.stack;
  document.getElementById('unitType').textContent = meta.label;
  document.getElementById('unitArea').textContent = `${meta.area} sqm estimated · ${meta.internalArea} sqm internal`;
  document.getElementById('unitPrice').textContent = `${money(meta.price99[0])} – ${money(meta.price99[1])} (99-year, indicative)`;
  const pill = document.getElementById('unitStatusPill');
  pill.className=`status-pill ${u.status}`;
  pill.textContent = u.status === 'reported' ? 'Reported taken' : u.status[0].toUpperCase()+u.status.slice(1);
  unitDialog.showModal();
}
document.getElementById('closeUnitBtn').addEventListener('click',()=>unitDialog.close());

// ---------- SOURCES ----------
const sourcesList = document.getElementById('sourcesList');
sourcesList.innerHTML = DATA.sources.map(s => `<div class="source-item"><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name}</a><p>${s.use}</p></div>`).join('');
document.getElementById('sourcesBtn').addEventListener('click',()=>sourcesDialog.showModal());
document.getElementById('closeSourcesBtn').addEventListener('click',()=>sourcesDialog.close());
