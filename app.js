(async function initialiseBerlayarTracker() {
  const sceneHost = document.getElementById('scene');
  const loadingEl = document.getElementById('sceneLoading');
  const DATA = window.BERLAYAR_DATA;

  const typeLabel = key => DATA.flatTypes[key]?.label || key;
  const money = n => new Intl.NumberFormat('en-SG', { style:'currency', currency:'SGD', maximumFractionDigits:0 }).format(n);
  const floorNumber = floor => String(floor).padStart(2, '0');

  function residentialFloors(block) {
    const exclude = new Set(block.floors.exclude || []);
    const floors = [];
    for (let f = block.floors.min; f <= block.floors.max; f++) if (!exclude.has(f)) floors.push(f);
    return floors;
  }

  function makeUnits() {
    const out = [];
    for (const block of DATA.blocks) {
      for (const floor of residentialFloors(block)) {
        for (const stack of block.stacks) {
          out.push({
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
    return out;
  }

  const units = makeUnits();

  function validateData() {
    const errors = [];
    if (units.length !== DATA.project.totalUnits) errors.push(`Generated ${units.length}, expected ${DATA.project.totalUnits}.`);
    for (const [type, meta] of Object.entries(DATA.flatTypes)) {
      const actual = units.filter(u => u.type === type).length;
      if (actual !== meta.total) errors.push(`${type}: ${actual}, expected ${meta.total}.`);
    }
    for (const block of DATA.blocks) {
      const actual = units.filter(u => u.block === block.id).length;
      if (actual !== block.total) errors.push(`${block.id}: ${actual}, expected ${block.total}.`);
    }
    if (errors.length) console.error('Berlayar dataset validation failed:', errors);
    else console.info(`Berlayar dataset validated: ${units.length.toLocaleString()} units.`);
  }
  validateData();

  function statusCounts(subset = units) {
    return subset.reduce((acc, u) => {
      acc[u.status] = (acc[u.status] || 0) + 1;
      return acc;
    }, {available:0, reported:0, taken:0, unknown:0});
  }

  function updateSummary() {
    const c = statusCounts();
    document.getElementById('totalUnits').textContent = units.length.toLocaleString();
    document.getElementById('availableUnits').textContent = c.available.toLocaleString();
    document.getElementById('reportedUnits').textContent = c.reported.toLocaleString();
    document.getElementById('takenUnits').textContent = c.taken.toLocaleString();
  }
  updateSummary();

  // ---------- DOM: drawers/dialogs ----------
  const blockDrawer = document.getElementById('blockDrawer');
  const unitDialog = document.getElementById('unitDialog');
  const featureDialog = document.getElementById('featureDialog');
  const sourcesDialog = document.getElementById('sourcesDialog');
  let selectedBlock = null;
  let selectedUnit = null;

  function blockUnits(id) { return units.filter(u => u.block === id); }

  function openBlock(block) {
    selectedBlock = block;
    if (window.__berlayarFlyToBlock) window.__berlayarFlyToBlock(block);
    const subset = blockUnits(block.id);
    const c = statusCounts(subset);
    document.getElementById('drawerBlockName').textContent = `Block ${block.id}`;
    document.getElementById('drawerBlockMeta').textContent = `${block.storeys} storeys · ${block.stacks.length} stacks · ${block.stacks.map(s=>s.no).join(', ')}`;
    document.getElementById('drawerGroundMeta').textContent = block.groundAmenities?.length ? `Ground-level community use: ${block.groundAmenities.join(', ')}` : '';
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
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `unit-cell ${u.status}`;
        btn.textContent = `#${floorNumber(floor)}-${stack.no}`;
        btn.title = `${typeLabel(u.type)} · ${u.status}`;
        if (typeFilter !== 'all' && u.type !== typeFilter) btn.classList.add('hidden-type');
        if (statusFilter !== 'all' && u.status !== statusFilter) btn.classList.add('hidden-status');
        btn.addEventListener('click', () => openUnit(u));
        td.appendChild(btn);
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
  }

  function roomRect(x,y,w,h,label,kind='normal') {
    const safe = label.replace(/&/g,'&amp;');
    const words = safe.split(' ');
    let lines = [safe];
    if (safe.length > 14 && words.length > 1) {
      const half = Math.ceil(words.length/2);
      lines = [words.slice(0,half).join(' '), words.slice(half).join(' ')];
    }
    const ty = y + h/2 - (lines.length-1)*8;
    return `<g class="plan-room ${kind}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/><text x="${x+w/2}" y="${ty}" text-anchor="middle">${lines.map((line,i)=>`<tspan x="${x+w/2}" dy="${i===0?0:16}">${line}</tspan>`).join('')}</text></g>`;
  }

  function planSvg(type) {
    let rooms = '';
    if (type === '2R-T1') {
      rooms += roomRect(45,45,245,185,'Living / Dining','living');
      rooms += roomRect(290,45,215,185,'Bedroom','bed');
      rooms += roomRect(45,230,120,110,'Household Shelter','service');
      rooms += roomRect(250,230,135,110,'Bath / WC','wet');
      rooms += roomRect(385,230,120,110,'Air-con Ledge','external');
      rooms += roomRect(190,340,315,90,'Kitchen','kitchen');
      rooms += `<path class="plan-entry" d="M190 430h-42v-56h42"/><text class="plan-entry-label" x="143" y="455">ENTRY</text>`;
    } else if (type === '2R-T2') {
      rooms += roomRect(45,70,255,210,'Living / Dining','living');
      rooms += roomRect(300,45,220,115,'Bedroom','bed');
      rooms += roomRect(300,160,175,120,'Flexible Space','flex');
      rooms += roomRect(45,280,120,105,'Household Shelter','service');
      rooms += roomRect(300,280,120,105,'Bath / WC','wet');
      rooms += roomRect(420,280,100,105,'Air-con Ledge','external');
      rooms += roomRect(215,385,305,70,'Kitchen','kitchen');
      rooms += `<path class="plan-entry" d="M215 455h-45v-55h45"/><text class="plan-entry-label" x="160" y="475">ENTRY</text>`;
    } else if (type === '3R') {
      rooms += roomRect(35,95,275,220,'Living / Dining','living');
      rooms += roomRect(310,45,150,140,'Bedroom','bed');
      rooms += roomRect(460,45,175,195,'Main Bedroom','bed');
      rooms += roomRect(310,185,125,130,'Dry Kitchen','kitchen');
      rooms += roomRect(435,240,100,95,'Bath / WC','wet');
      rooms += roomRect(535,240,100,95,'Bath / WC','wet');
      rooms += roomRect(35,315,125,115,'Household Shelter','service');
      rooms += roomRect(310,335,225,95,'Kitchen / Utility','kitchen');
      rooms += roomRect(535,335,100,95,'Air-con Ledge','external');
      rooms += `<path class="plan-entry" d="M310 430h-58v-54h58"/><text class="plan-entry-label" x="245" y="457">ENTRY</text>`;
    } else {
      rooms += roomRect(35,85,285,230,'Living / Dining','living');
      rooms += roomRect(320,45,135,145,'Bedroom','bed');
      rooms += roomRect(455,45,135,145,'Bedroom','bed');
      rooms += roomRect(590,45,135,205,'Main Bedroom','bed');
      rooms += roomRect(35,315,125,115,'Household Shelter','service');
      rooms += roomRect(455,210,100,100,'Bath / WC','wet');
      rooms += roomRect(555,210,100,100,'Bath / WC','wet');
      rooms += roomRect(300,330,190,100,'Kitchen','kitchen');
      rooms += roomRect(490,330,115,100,'Service Yard','service');
      rooms += roomRect(605,330,120,100,'Air-con Ledge','external');
      rooms += `<path class="plan-entry" d="M300 430h-58v-54h58"/><text class="plan-entry-label" x="235" y="457">ENTRY</text>`;
    }
    return `<svg viewBox="0 0 760 500" role="img" aria-label="Simplified schematic floor plan for ${typeLabel(type)}"><rect class="plan-bg" x="12" y="12" width="736" height="476" rx="10"/>${rooms}</svg>`;
  }

  function openUnit(u) {
    selectedUnit = u;
    const meta = DATA.flatTypes[u.type];
    document.getElementById('unitCrumbBlock').textContent = `BLOCK ${u.block}`;
    document.getElementById('unitTitle').textContent = `#${floorNumber(u.floor)}-${u.stack}`;
    document.getElementById('unitBlock').textContent = `Block ${u.block}`;
    document.getElementById('unitFloor').textContent = floorNumber(u.floor);
    document.getElementById('unitStack').textContent = u.stack;
    document.getElementById('unitType').textContent = meta.label;
    document.getElementById('unitArea').textContent = `${meta.area} sqm total · ${meta.internalArea} sqm internal`;
    document.getElementById('unitPrice').textContent = `${money(meta.price99[0])} – ${money(meta.price99[1])} (99-year indicative)`;
    document.getElementById('floorplanTitle').textContent = meta.label;
    document.getElementById('floorplanCanvas').innerHTML = planSvg(u.type);
    document.getElementById('unitRooms').innerHTML = meta.rooms.map(r=>`<span>${r}</span>`).join('');
    document.getElementById('unitLayoutNote').textContent = meta.layoutNote;
    document.getElementById('unitPlanSource').href = meta.sourcePlanUrl;
    const pill = document.getElementById('unitStatusPill');
    pill.className = `status-pill ${u.status}`;
    pill.textContent = u.status === 'reported' ? 'Reported taken' : u.status[0].toUpperCase()+u.status.slice(1);
    unitDialog.showModal();
  }
  document.getElementById('closeUnitBtn').addEventListener('click',()=>unitDialog.close());
  document.getElementById('focusFloorBtn').addEventListener('click', () => {
    if (!selectedUnit || !window.__berlayarHighlightUnitFloor) return;
    unitDialog.close();
    window.__berlayarHighlightUnitFloor(selectedUnit);
  });

  function openFeature(feature) {
    document.getElementById('featureTitle').textContent = feature.name;
    document.getElementById('featureDetail').textContent = feature.detail;
    document.getElementById('featureBasis').textContent = feature.basis;
    featureDialog.showModal();
  }
  document.getElementById('closeFeatureBtn').addEventListener('click',()=>featureDialog.close());

  const sourcesList = document.getElementById('sourcesList');
  sourcesList.innerHTML = DATA.sources.map(s => `<div class="source-item"><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name}</a><p>${s.use}</p></div>`).join('');
  document.getElementById('sourcesBtn').addEventListener('click',()=>sourcesDialog.showModal());
  document.getElementById('closeSourcesBtn').addEventListener('click',()=>sourcesDialog.close());

  // ---------- 3D scene ----------
  try {
    const THREE = await import('https://esm.sh/three@0.161.0');
    const { OrbitControls } = await import('https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js');
    if (loadingEl) loadingEl.remove();

    const labels = new Map();
    const featureLabels = new Map();
    const blockMeshes = [];
    const featureMeshes = [];
    const blockGroups = new Map();
    const amenityObjects = [];
    const linkObjects = [];
    const contextObjects = [];
    let activeType = 'all';
    let cameraTween = null;
    let floorHighlight = null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1713);
    scene.fog = new THREE.Fog(0x0a1713, 62, 112);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220);
    camera.position.set(43, 48, 57);

    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    sceneHost.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .065;
    controls.minDistance = 19;
    controls.maxDistance = 103;
    controls.maxPolarAngle = Math.PI*.47;
    controls.target.set(-1,3,1);

    scene.add(new THREE.HemisphereLight(0xe5eee6,0x23352d,2.4));
    const sun = new THREE.DirectionalLight(0xffefd0,3.1);
    sun.position.set(-27,48,-20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.left=-50; sun.shadow.camera.right=50; sun.shadow.camera.top=50; sun.shadow.camera.bottom=-50;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(66,1.15,61),
      new THREE.MeshStandardMaterial({color:0x49624f,roughness:.98})
    );
    ground.position.set(-1,-.68,1.5); ground.receiveShadow=true; scene.add(ground);

    // Reserved/context parcels outside the project boundary.
    function addParcel(x,z,w,d,color,label) {
      const g = new THREE.Group();
      const p = new THREE.Mesh(new THREE.BoxGeometry(w,.08,d), new THREE.MeshStandardMaterial({color,roughness:1,transparent:true,opacity:.72}));
      p.position.y=.01; g.add(p); g.position.set(x,0,z); g.userData.label=label; scene.add(g); contextObjects.push(g); return g;
    }
    addParcel(31.8,8.0,10,26,0x5d665b,'Future residential');
    addParcel(10.5,33.2,25,7,0x557157,'Future park');
    addParcel(-24.5,31.5,15,7,0x5d665b,'Future residential');

    function addRoad(spec) {
      const road = new THREE.Mesh(new THREE.BoxGeometry(spec.w,.1,spec.d),new THREE.MeshStandardMaterial({color:0x313a37,roughness:1}));
      road.position.set(spec.x,.03,spec.z); road.rotation.y=spec.rotation||0; road.receiveShadow=true; scene.add(road); contextObjects.push(road);
    }
    DATA.roads.forEach(addRoad);

    // Internal roads from the site-plan geometry, simplified for orientation.
    function addInternalRoad(x,z,w,d,rot=0) {
      const road = new THREE.Mesh(new THREE.BoxGeometry(w,.09,d),new THREE.MeshStandardMaterial({color:0x6b675c,roughness:1}));
      road.position.set(x,.07,z); road.rotation.y=rot; road.receiveShadow=true; scene.add(road); return road;
    }
    addInternalRoad(6.8,7.2,5,35,.38);
    addInternalRoad(-5,4.2,26,3.2,.03);
    addInternalRoad(-10.0,16.0,24,3.1,.03);
    addInternalRoad(12.6,-1.0,3.4,17,-.06);

    function addPath(x,z,w,d,rot=0) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(w,.055,d),new THREE.MeshStandardMaterial({color:0xc1bbaa,roughness:1}));
      p.position.set(x,.105,z); p.rotation.y=rot; scene.add(p); return p;
    }
    addPath(-4.0,-5.1,39,1.15,0);
    addPath(-8.0,9.2,29,1.1,-.05);
    addPath(0.5,18.3,31,1.1,.02);
    addPath(16.5,-3.2,1.0,17,0);

    function addTree(x,z,s=1) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,.68,6),new THREE.MeshStandardMaterial({color:0x5d4732}));
      trunk.position.set(x,.42,z);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.45*s,1),new THREE.MeshStandardMaterial({color:0x6f946e,roughness:1}));
      crown.position.set(x,1.02,z);
      scene.add(trunk,crown);
    }
    for (let i=0;i<56;i++) {
      const a=(i/56)*Math.PI*2;
      const rx=26+Math.sin(i*1.8)*2.7;
      const rz=25+Math.cos(i*2.3)*2.5;
      addTree(-1+Math.cos(a)*rx,2+Math.sin(a)*rz,.78+(i%5)*.06);
    }
    [[-10,2],[-13,6],[-8,7],[6,-1],[12,3],[5,14],[11,13],[-19,10],[-20,14],[-10,21],[0,22],[16,14],[17,-13],[-22,-4],[20,-14]].forEach(([x,z])=>addTree(x,z,1.06));

    function facadeTexture(block) {
      const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=512;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#e5e1d7'; ctx.fillRect(0,0,512,512);
      ctx.fillStyle='#2f413b';
      for(let row=0;row<18;row++) for(let col=0;col<block.stacks.length;col++) {
        const x=24+col*(465/block.stacks.length); const y=18+row*26;
        ctx.fillRect(x,y,Math.max(13,27-(block.stacks.length-6)*2),10);
      }
      ctx.fillStyle='#bdb7aa'; ctx.fillRect(0,486,512,26);
      const tex=new THREE.CanvasTexture(canvas); tex.colorSpace=THREE.SRGBColorSpace; return tex;
    }

    function makeBuilding(block) {
      const g=new THREE.Group();
      const h=block.storeys*.39;
      const mat=new THREE.MeshStandardMaterial({map:facadeTexture(block),color:0xffffff,roughness:.82});
      const tower=new THREE.Mesh(new THREE.BoxGeometry(block.model.width,h,block.model.depth),mat);
      tower.position.y=h/2; tower.castShadow=true; tower.receiveShadow=true; tower.userData.blockId=block.id; tower.userData.kind='block';
      blockMeshes.push(tower); g.add(tower);
      const podium=new THREE.Mesh(new THREE.BoxGeometry(block.model.width*1.05,.75,block.model.depth*1.1),new THREE.MeshStandardMaterial({color:0xc7c2b5,roughness:1}));
      podium.position.y=.38; podium.castShadow=true; g.add(podium);
      // green terrace hint only where publicly shown in the project concept; deliberately abstract.
      if(['201A','201B'].includes(block.id)) {
        const roof=new THREE.Mesh(new THREE.BoxGeometry(block.model.width*.46,.14,block.model.depth*.84),new THREE.MeshStandardMaterial({color:0x71956c,roughness:1}));
        roof.position.set(block.model.width*.2,h+.1,0); g.add(roof);
      }
      g.position.set(block.model.x,0,block.model.z); g.rotation.y=block.model.rotationY||0; scene.add(g); blockGroups.set(block.id,g);
    }
    DATA.blocks.forEach(makeBuilding);

    function addFeatureMesh(feature, mesh, layer='amenity') {
      mesh.userData.featureId=feature.id; mesh.userData.kind='feature'; featureMeshes.push(mesh);
      if(layer==='context') contextObjects.push(mesh); else amenityObjects.push(mesh);
      return mesh;
    }

    // MRT station north of the site.
    const mrtFeature=DATA.siteFeatures.find(f=>f.id==='mrt');
    const mrtGroup=new THREE.Group(); mrtGroup.position.set(mrtFeature.x,0,mrtFeature.z);
    const mrtBase=new THREE.Mesh(new THREE.BoxGeometry(12,1.5,3.4),new THREE.MeshStandardMaterial({color:0xb8b6ab,roughness:.8}));
    mrtBase.position.y=.75; mrtBase.userData={featureId:'mrt',kind:'feature'}; featureMeshes.push(mrtBase); mrtGroup.add(mrtBase);
    const mrtRoof=new THREE.Mesh(new THREE.BoxGeometry(12.6,.22,3.8),new THREE.MeshStandardMaterial({color:0xebe8dc,roughness:.8})); mrtRoof.position.y=1.62; mrtGroup.add(mrtRoof);
    const mrtLine=new THREE.Mesh(new THREE.BoxGeometry(11.3,.12,.18),new THREE.MeshStandardMaterial({color:0xf0a447})); mrtLine.position.set(0,1.2,1.73); mrtGroup.add(mrtLine);
    scene.add(mrtGroup); contextObjects.push(mrtGroup);

    // Preschool: low 3-storey volume + green roof.
    const pre=DATA.siteFeatures.find(f=>f.id==='preschool');
    const preGroup=new THREE.Group(); preGroup.position.set(pre.x,0,pre.z);
    const preBody=new THREE.Mesh(new THREE.BoxGeometry(7.0,2.5,13.0),new THREE.MeshStandardMaterial({color:0xcabf9b,roughness:.9})); preBody.position.y=1.25; preBody.userData={featureId:'preschool',kind:'feature'}; featureMeshes.push(preBody); preGroup.add(preBody);
    const preRoof=new THREE.Mesh(new THREE.BoxGeometry(6.7,.18,12.7),new THREE.MeshStandardMaterial({color:0x71966c,roughness:1})); preRoof.position.y=2.58; preGroup.add(preRoof); scene.add(preGroup); amenityObjects.push(preGroup);

    // MSCP: elliptical/ring mass with roof garden.
    const mscp=DATA.siteFeatures.find(f=>f.id==='mscp');
    const shape=new THREE.Shape(); shape.absellipse(0,0,6.6,4.7,0,Math.PI*2,false,0);
    const hole=new THREE.Path(); hole.absellipse(.5,0,2.5,1.65,0,Math.PI*2,false,0); shape.holes.push(hole);
    const mscpGeo=new THREE.ExtrudeGeometry(shape,{depth:3.2,bevelEnabled:false,curveSegments:36}); mscpGeo.rotateX(-Math.PI/2);
    const mscpMesh=new THREE.Mesh(mscpGeo,new THREE.MeshStandardMaterial({color:0x817961,roughness:.9})); mscpMesh.position.set(mscp.x,0,mscp.z); mscpMesh.castShadow=true; mscpMesh.receiveShadow=true; mscpMesh.userData={featureId:'mscp',kind:'feature'}; featureMeshes.push(mscpMesh); scene.add(mscpMesh); amenityObjects.push(mscpMesh);
    const roofGarden=new THREE.Mesh(new THREE.RingGeometry(2.7,6.0,48),new THREE.MeshStandardMaterial({color:0x73926b,roughness:1,side:THREE.DoubleSide})); roofGarden.rotation.x=-Math.PI/2; roofGarden.scale.y=.75; roofGarden.position.set(mscp.x,3.23,mscp.z); scene.add(roofGarden); amenityObjects.push(roofGarden);

    function canopy(x,z,w,d,y=3.55) {
      const g=new THREE.Group();
      const roof=new THREE.Mesh(new THREE.BoxGeometry(w,.12,d),new THREE.MeshStandardMaterial({color:0xd8d1b6,roughness:.75})); roof.position.y=y; g.add(roof);
      for(const sx of [-w*.38,w*.38]) for(const sz of [-d*.34,d*.34]) { const p=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,y,6),new THREE.MeshStandardMaterial({color:0x7d7667})); p.position.set(sx,y/2,sz); g.add(p); }
      g.position.set(x,0,z); scene.add(g); amenityObjects.push(g); return g;
    }
    // Confirmed roof-garden shelters, rendered schematically.
    canopy(mscp.x-2.7,mscp.z-.5,1.8,1.2,3.75);
    canopy(mscp.x+2.8,mscp.z+.6,1.8,1.2,3.75);

    // Residents' network marker integrated into 201B ground floor.
    const rn=DATA.siteFeatures.find(f=>f.id==='rn');
    const rnMesh=new THREE.Mesh(new THREE.BoxGeometry(3.2,.55,1.0),new THREE.MeshStandardMaterial({color:0x8bb9a3,emissive:0x183329,emissiveIntensity:.3})); rnMesh.position.set(rn.x,.45,rn.z); rnMesh.userData={featureId:'rn',kind:'feature'}; featureMeshes.push(rnMesh); scene.add(rnMesh); amenityObjects.push(rnMesh);

    // Pavilion and recreation elements.
    const pav=DATA.siteFeatures.find(f=>f.id==='pavilion'); canopy(pav.x,pav.z,4.2,3.0,1.25).children[0].userData={featureId:'pavilion',kind:'feature'}; featureMeshes.push(amenityObjects[amenityObjects.length-1].children[0]);
    const play=DATA.siteFeatures.find(f=>f.id==='play');
    const playPad=new THREE.Mesh(new THREE.CylinderGeometry(3.0,3.0,.08,32),new THREE.MeshStandardMaterial({color:0x9a8266,roughness:1})); playPad.position.set(play.x,.13,play.z); playPad.userData={featureId:'play',kind:'feature'}; featureMeshes.push(playPad); scene.add(playPad); amenityObjects.push(playPad);
    [[-1.2,0,.35],[0,1,.45],[1.2,-.4,.3]].forEach(([dx,dz,s])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(s,12,8),new THREE.MeshStandardMaterial({color:0xd8c56d}));m.position.set(play.x+dx,.3+s,play.z+dz);scene.add(m);amenityObjects.push(m);});

    const fit=DATA.siteFeatures.find(f=>f.id==='fitness');
    for(let i=0;i<4;i++){const bar=new THREE.Mesh(new THREE.BoxGeometry(.12,.9,.12),new THREE.MeshStandardMaterial({color:0x9fc0a7}));bar.position.set(fit.x+i*.65,.55,fit.z+(i%2)*.5);scene.add(bar);amenityObjects.push(bar);}    
    const fitHit=new THREE.Mesh(new THREE.BoxGeometry(3,.3,2),new THREE.MeshBasicMaterial({transparent:true,opacity:0})); fitHit.position.set(fit.x,.3,fit.z); fitHit.userData={featureId:'fitness',kind:'feature'}; featureMeshes.push(fitHit); scene.add(fitHit); amenityObjects.push(fitHit);

    const hc=DATA.siteFeatures.find(f=>f.id==='hardcourt');
    const court=new THREE.Mesh(new THREE.BoxGeometry(5.7,.08,3.6),new THREE.MeshStandardMaterial({color:0x8f9c86,roughness:.9}));court.position.set(hc.x,.13,hc.z);court.userData={featureId:'hardcourt',kind:'feature'};featureMeshes.push(court);scene.add(court);amenityObjects.push(court);
    for(const zoff of [-1.5,1.5]){const line=new THREE.Mesh(new THREE.BoxGeometry(5.2,.015,.05),new THREE.MeshBasicMaterial({color:0xd8dfd5}));line.position.set(hc.x,.18,hc.z+zoff);scene.add(line);amenityObjects.push(line);}

    // Two simplified drop-off zones from the published project description/site plan.
    function dropOff(x,z,rot=0){const ring=new THREE.Mesh(new THREE.RingGeometry(1.25,1.65,28),new THREE.MeshStandardMaterial({color:0xa6a294,roughness:1,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.rotation.z=rot;ring.position.set(x,.15,z);scene.add(ring);amenityObjects.push(ring);}    
    dropOff(-13.2,-2.0); dropOff(8.1,1.9);

    // Sheltered linkway network: simplified roof + walkway along confirmed connectivity paths.
    function addShelteredLink(from,to) {
      const [x1,z1]=from,[x2,z2]=to; const dx=x2-x1,dz=z2-z1; const len=Math.hypot(dx,dz); const angle=Math.atan2(dz,dx);
      const g=new THREE.Group(); g.position.set((x1+x2)/2,0,(z1+z2)/2); g.rotation.y=-angle;
      const walk=new THREE.Mesh(new THREE.BoxGeometry(len,.055,.7),new THREE.MeshStandardMaterial({color:0xcac3b1,roughness:1}));walk.position.y=.13;g.add(walk);
      const roof=new THREE.Mesh(new THREE.BoxGeometry(len,.08,.85),new THREE.MeshStandardMaterial({color:0xcdd7cd,roughness:.7,transparent:true,opacity:.76}));roof.position.y=.95;g.add(roof);
      const count=Math.max(2,Math.floor(len/3));
      for(let i=0;i<=count;i++){const x=-len/2+(i/count)*len;const p=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.85,5),new THREE.MeshStandardMaterial({color:0x758078}));p.position.set(x,.52,-.32);g.add(p);}
      scene.add(g); linkObjects.push(g);
    }
    DATA.shelteredLinks.forEach(l=>addShelteredLink(l.from,l.to));

    // Surrounding water/harbour hint, far south only, not intended as literal shoreline.
    const water=new THREE.Mesh(new THREE.PlaneGeometry(78,16),new THREE.MeshStandardMaterial({color:0x315969,roughness:.6,transparent:true,opacity:.62}));water.rotation.x=-Math.PI/2;water.position.set(0,-.03,43);scene.add(water);contextObjects.push(water);

    // Block labels.
    for(const block of DATA.blocks){
      const el=document.createElement('button'); el.type='button'; el.className='block-label';
      const c=statusCounts(blockUnits(block.id));
      el.innerHTML=`<strong>Block ${block.id}</strong><span>${c.available.toLocaleString()} / ${block.total.toLocaleString()} available</span>`;
      el.addEventListener('click',()=>openBlock(block)); sceneHost.appendChild(el); labels.set(block.id,el);
    }

    const majorFeatureIds=new Set(['mrt','preschool','mscp','rn','pavilion','roofshelters','linkways','futurepark','futurehousing-east']);
    for(const feature of DATA.siteFeatures){
      if(!majorFeatureIds.has(feature.id)) continue;
      const el=document.createElement('button'); el.type='button'; el.className=`feature-label ${feature.category}`; el.textContent=feature.short;
      el.addEventListener('click',()=>openFeature(feature)); sceneHost.appendChild(el); featureLabels.set(feature.id,el);
    }

    // Road labels (orientation only).
    const roadLabels=[
      {text:'TELOK BLANGAH ROAD / WEST COAST HIGHWAY',x:0,z:-32.8},
      {text:'BERLAYAR STREET',x:-32.2,z:2},
      {text:'BERLAYAR DRIVE',x:4,z:31.2}
    ];
    const roadLabelEls=[];
    roadLabels.forEach(r=>{const el=document.createElement('div');el.className='road-label';el.textContent=r.text;sceneHost.appendChild(el);roadLabelEls.push({el,...r});});

    function resize(){const r=sceneHost.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
    window.addEventListener('resize',resize); resize();

    function screenPosition(x,y,z){const p=new THREE.Vector3(x,y,z).project(camera);const r=sceneHost.getBoundingClientRect();return {x:(p.x*.5+.5)*r.width,y:(-p.y*.5+.5)*r.height,behind:p.z>1};}
    function updateLabels(){
      for(const block of DATA.blocks){const p=screenPosition(block.model.x,block.storeys*.39+1.7,block.model.z);const el=labels.get(block.id);el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;el.style.display=p.behind?'none':'';}
      for(const feature of DATA.siteFeatures){const el=featureLabels.get(feature.id);if(!el)continue;const p=screenPosition(feature.x,(feature.height||.5)+1,feature.z);el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;el.style.display=p.behind?'none':'';}
      roadLabelEls.forEach(r=>{const p=screenPosition(r.x,.25,r.z);r.el.style.left=`${p.x}px`;r.el.style.top=`${p.y}px`;r.el.style.display=p.behind?'none':'';});
    }

    function animate(t){
      requestAnimationFrame(animate);
      if(cameraTween){const p=Math.min(1,(t-cameraTween.start)/cameraTween.duration);const e=1-Math.pow(1-p,3);camera.position.lerpVectors(cameraTween.fromPos,cameraTween.toPos,e);controls.target.lerpVectors(cameraTween.fromTarget,cameraTween.toTarget,e);if(p>=1)cameraTween=null;}
      controls.update(); updateLabels(); renderer.render(scene,camera);
    }
    requestAnimationFrame(animate);

    function flyToBlock(block){
      const target=new THREE.Vector3(block.model.x,block.storeys*.14,block.model.z);
      const pos=new THREE.Vector3(block.model.x+15,block.storeys*.23+12,block.model.z+18);
      cameraTween={start:performance.now(),duration:780,fromPos:camera.position.clone(),toPos:pos,fromTarget:controls.target.clone(),toTarget:target};
    }
    window.__berlayarFlyToBlock=flyToBlock;

    function resetView(){
      if(floorHighlight){floorHighlight.parent?.remove(floorHighlight);floorHighlight=null;}
      cameraTween={start:performance.now(),duration:850,fromPos:camera.position.clone(),toPos:new THREE.Vector3(43,48,57),fromTarget:controls.target.clone(),toTarget:new THREE.Vector3(-1,3,1)};
    }
    document.getElementById('resetViewBtn').addEventListener('click',resetView);

    function highlightUnitFloor(u){
      if(floorHighlight){floorHighlight.parent?.remove(floorHighlight);floorHighlight=null;}
      const block=DATA.blocks.find(b=>b.id===u.block); const group=blockGroups.get(u.block); if(!block||!group)return;
      const y=(u.floor-.5)*.39;
      floorHighlight=new THREE.Mesh(new THREE.BoxGeometry(block.model.width*1.09,.20,block.model.depth*1.2),new THREE.MeshBasicMaterial({color:0xd8f09e,transparent:true,opacity:.65,wireframe:false}));
      floorHighlight.position.y=y; group.add(floorHighlight);
      const target=new THREE.Vector3(block.model.x,y,block.model.z);
      const pos=new THREE.Vector3(block.model.x+11,y+7,block.model.z+13);
      cameraTween={start:performance.now(),duration:720,fromPos:camera.position.clone(),toPos:pos,fromTarget:controls.target.clone(),toTarget:target};
    }
    window.__berlayarHighlightUnitFloor=highlightUnitFloor;

    // Raycast blocks and site features.
    const raycaster=new THREE.Raycaster(); const pointer=new THREE.Vector2(); let down={x:0,y:0};
    renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
    renderer.domElement.addEventListener('pointerup',e=>{
      if(e.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;
      const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);
      const hits=raycaster.intersectObjects([...blockMeshes,...featureMeshes],false);if(!hits.length)return;
      const hit=hits[0].object;
      if(hit.userData.kind==='block'){const block=DATA.blocks.find(b=>b.id===hit.userData.blockId);if(block)openBlock(block);}
      else if(hit.userData.kind==='feature'){const f=DATA.siteFeatures.find(f=>f.id===hit.userData.featureId);if(f)openFeature(f);}
    });

    document.getElementById('typeFilters').addEventListener('click',e=>{
      const btn=e.target.closest('[data-type]');if(!btn)return;activeType=btn.dataset.type;
      document.querySelectorAll('#typeFilters .filter').forEach(b=>b.classList.toggle('active',b===btn));
      for(const block of DATA.blocks){
        const has=activeType==='all'||block.stacks.some(s=>s.type===activeType); const g=blockGroups.get(block.id);
        g.traverse(obj=>{if(obj.isMesh&&obj!==floorHighlight){obj.material.transparent=!has;obj.material.opacity=has?1:.18;}});
        labels.get(block.id).classList.toggle('dimmed',!has);
      }
    });

    function setLayer(objects,visible){objects.forEach(o=>o.visible=visible);}
    document.getElementById('layerAmenities').addEventListener('change',e=>{setLayer(amenityObjects,e.target.checked);for(const [id,el] of featureLabels){const f=DATA.siteFeatures.find(x=>x.id===id);if(f.category!=='context'&&f.category!=='transport')el.classList.toggle('layer-hidden',!e.target.checked);}});
    document.getElementById('layerLinks').addEventListener('change',e=>setLayer(linkObjects,e.target.checked));
    document.getElementById('layerContext').addEventListener('change',e=>{setLayer(contextObjects,e.target.checked);for(const [id,el] of featureLabels){const f=DATA.siteFeatures.find(x=>x.id===id);if(f.category==='context'||f.category==='transport')el.classList.toggle('layer-hidden',!e.target.checked);}});

  } catch(error) {
    console.error('Berlayar 3D viewer failed to initialise:',error);
    if(loadingEl) loadingEl.remove();
    sceneHost.innerHTML = `
      <div class="fallback-map" role="img" aria-label="2D fallback map of Berlayar Rise">
        <div class="fallback-road north">Telok Blangah Road / West Coast Highway</div>
        <button class="fallback-feature mrt" data-feature="mrt">Telok Blangah MRT</button>
        <button class="fallback-block b200a" data-block="200A">200A</button>
        <button class="fallback-block b200b" data-block="200B">200B</button>
        <button class="fallback-block b201a" data-block="201A">201A</button>
        <button class="fallback-block b201b" data-block="201B">201B</button>
        <button class="fallback-block b204a" data-block="204A">204A</button>
        <button class="fallback-block b204b" data-block="204B">204B</button>
        <button class="fallback-feature preschool" data-feature="preschool">Preschool</button>
        <button class="fallback-feature mscp" data-feature="mscp">203 MSCP + roof garden</button>
        <div class="fallback-warning"><strong>3D library could not load.</strong><span>This 2D fallback remains interactive. Connect to the internet and refresh for the 3D model.</span></div>
      </div>`;
    sceneHost.querySelectorAll('[data-block]').forEach(el=>el.addEventListener('click',()=>{const b=DATA.blocks.find(x=>x.id===el.dataset.block);if(b)openBlock(b);}));
    sceneHost.querySelectorAll('[data-feature]').forEach(el=>el.addEventListener('click',()=>{const f=DATA.siteFeatures.find(x=>x.id===el.dataset.feature);if(f)openFeature(f);}));
  }
})();
