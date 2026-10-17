import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const cellKey = (x, z) => `${x},${z}`;
const angle = value => (Number(value) || 0) * Math.PI / 180;
const floorColors = { peach: '#d9a17f', wood: '#c09568', tile: '#e5dfca', tiles: '#e5dfca', kitchen: '#e5dfca', stone: '#929b99', checker: '#ede5cd', carpet: '#ad5952', concrete: '#a8aaa2', dark: '#605445', white: '#ede9d9' };

/** A self-contained, procedural restaurant world. Coordinates identify one-unit cells. */
export function createScene(container, callbacks = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8b9470');
  scene.fog = new THREE.Fog('#8b9470', 58, 105);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = 'restaurant-canvas';
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Interactive restaurant. Click a tile to build. Drag with the right mouse button to rotate and use the wheel to zoom.');
  container.appendChild(renderer.domElement);

  const camera = new THREE.OrthographicCamera(-20, 20, 15, -15, 0.1, 160);
  const target = new THREE.Vector3(12, 0, 11.8);
  let azimuth = Math.PI * 3 / 4, elevation = 0.79, zoomLevel = 1, view = 'isometric', wallMode = 'full';
  let width = 1, height = 1, disposed = false, frame = 0, game = null, tool = null, rotation = 0;
  let hover = null, ghost = null, ghostType = null, floorSignature = '', landSignature = '';
  let hoveredId = null, lastTime = performance.now();
  const startedAt = lastTime;
  const materials = new Map(), geometries = new Set(), textures = new Set();
  const objects = new Map(), people = new Map(), floorMeshes = new Map(), tableProps = new Map();
  const objectLayer = new THREE.Group(), floorLayer = new THREE.Group(), peopleLayer = new THREE.Group(), propsLayer = new THREE.Group();
  scene.add(floorLayer, objectLayer, peopleLayer, propsLayer);
  const strokeLayer = new THREE.Group(); scene.add(strokeLayer); strokeLayer.visible = false;
  let strokeSignature = '';
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPoint = new THREE.Vector3();

  function material(color, extra = {}) {
    const key = `${color}:${JSON.stringify(extra)}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...extra }));
    return materials.get(key);
  }
  const palette = {
    cream: material('#ece6d5'), trim: material('#686259'), wood: material('#a47750'), lightwood: material('#c1956e'), darkwood: material('#654d3a'),
    red: material('#ac4941'), steel: material('#b7c2bf', { roughness: 0.45, metalness: 0.3 }), steelDark: material('#7b8a87', { roughness: 0.42, metalness: 0.28 }),
    black: material('#303534'), white: material('#f6f1e2'), glass: material('#a3cad0', { transparent: true, opacity: 0.6, roughness: 0.2 }),
    leaf: material('#59804b'), leafLight: material('#82a15b'), soil: material('#554636'), brass: material('#be9c58', { roughness: 0.4, metalness: 0.5 }),
    brick: material('#893e50'), brickLight: material('#974658'), brickDark: material('#7f394c'), masonryTrim: material('#514451'),
  };
  const brickCanvas=document.createElement('canvas');brickCanvas.width=128;brickCanvas.height=256;
  const brickContext=brickCanvas.getContext('2d');brickContext.fillStyle='#743347';brickContext.fillRect(0,0,128,256);
  for(let row=0;row<14;row++)for(let col=-1;col<3;col++){
    brickContext.fillStyle=['#893e50','#914255','#82394b'][(row*7+col+4)%3];
    brickContext.fillRect(col*64+(row%2?32:0)+1,row*19+1,62,18);
  }
  const brickTexture=new THREE.CanvasTexture(brickCanvas);brickTexture.colorSpace=THREE.SRGBColorSpace;textures.add(brickTexture);
  palette.brick=new THREE.MeshStandardMaterial({map:brickTexture,roughness:0.85});materials.set('masonry',palette.brick);
  function addMesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
    geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function box(parent, w, h, d, mat, x = 0, y = h / 2, z = 0) { return addMesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z); }
  function cyl(parent, radius, h, mat, x = 0, y = h / 2, z = 0, vertices = 12, top = radius) { return addMesh(parent, new THREE.CylinderGeometry(top, radius, h, vertices), mat, x, y, z); }
  function sphere(parent, radius, mat, x, y, z, detail = 0) { return addMesh(parent, new THREE.IcosahedronGeometry(radius, detail), mat, x, y, z); }
  function legs(group, top, spread = 0.3, mat = palette.darkwood) {
    for (const x of [-spread, spread]) for (const z of [-spread, spread]) box(group, 0.065, top, 0.065, mat, x, top / 2, z);
  }
  function stem(group, x = 0, y = 0.9, z = 0) {
    cyl(group, 0.018, 0.25, palette.leaf, x, y + 0.11, z, 5);
    for (let i = 0; i < 5; i++) sphere(group, 0.048, palette.red, x + Math.cos(i * TAU / 5) * 0.043, y + 0.25, z + Math.sin(i * TAU / 5) * 0.043);
    sphere(group, 0.035, palette.brass, x, y + 0.265, z);
  }
  function plate(group, x = 0, y = 0.84, z = 0, food = true) {
    cyl(group, 0.18, 0.025, palette.white, x, y, z, 20);
    if (food) {
      cyl(group, 0.125, 0.032, material('#e5af54'), x, y + 0.025, z, 12);
      for (let i = 0; i < 4; i++) sphere(group, 0.028, material(i % 2 ? '#70944c' : '#b54f35'), x + Math.cos(i * 1.9) * 0.08, y + 0.05, z + Math.sin(i * 1.9) * 0.08);
    }
  }
  function cabinet(group, top = 0.87, depth = 0.8) {
    box(group, 0.83, top - 0.12, depth, palette.steel, 0, top / 2, 0);
    box(group, 0.89, 0.07, depth + 0.05, palette.steel, 0, top, 0);
    for (const x of [-0.21, 0.21]) {
      box(group, 0.38, top - 0.23, 0.025, palette.steelDark, x, top / 2, depth / 2 + 0.016);
      box(group, 0.1, 0.025, 0.045, palette.black, x, top - 0.18, depth / 2 + 0.04);
    }
    for (const x of [-0.33, 0.33]) for (const z of [-0.3, 0.3]) box(group, 0.07, 0.12, 0.07, palette.black, x, 0.06, z);
  }
  function brickwork(group, bottom, top) {
    const wall=box(group,1,top-bottom,0.18,palette.brick,0,(bottom+top)/2,0),uv=wall.geometry.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setY(i,(uv.getY(i)*(top-bottom)+bottom)/2.56);
  }
  function wallTrim(group) {
    box(group,1.025,0.14,0.27,palette.masonryTrim,0,2.61,0);
    box(group,1.01,0.14,0.23,palette.masonryTrim,0,0.11,0);
  }
  function model(type, color) {
    const g = new THREE.Group();
    const upholstery = color ? material(color) : palette.red;
    switch (type) {
      case 'table':
        legs(g, 0.76, 0.3); box(g, 0.91, 0.1, 0.91, palette.lightwood, 0, 0.79, 0);
        box(g, 0.16, 0.015, 0.2, palette.cream, 0.21, 0.851, 0.16);
        cyl(g, 0.055, 0.12, upholstery, -0.07, 0.9, -0.07, 8); stem(g, -0.07, 0.95, -0.07); break;
      case 'chair':
        legs(g, 0.45, 0.18); box(g, 0.49, 0.075, 0.48, palette.lightwood, 0, 0.47, 0); box(g, 0.45, 0.045, 0.42, upholstery, 0, 0.53, -0.01);
        for (const x of [-0.205, 0.205]) box(g, 0.055, 0.62, 0.055, palette.lightwood, x, 0.73, -0.21);
        box(g, 0.45, 0.32, 0.065, upholstery, 0, 0.89, -0.21); break;
      case 'stove': case 'oven':
        cabinet(g); box(g, 0.74, 0.42, 0.035, palette.black, 0, 0.4, 0.427); box(g, 0.6, 0.29, 0.042, material('#48514d'), 0, 0.42, 0.448);
        box(g, 0.61, 0.035, 0.055, palette.steel, 0, 0.65, 0.475);
        for (const x of [-0.27, -0.09, 0.09, 0.27]) { const knob = cyl(g, 0.036, 0.035, palette.black, x, 0.765, 0.446, 8); knob.rotation.x = Math.PI / 2; }
        for (const x of [-0.22, 0.22]) for (const z of [-0.22, 0.22]) {
          cyl(g, 0.12, 0.025, palette.black, x, 0.916, z, 12);
          box(g, 0.29, 0.025, 0.025, palette.black, x, 0.934, z); box(g, 0.025, 0.025, 0.29, palette.black, x, 0.934, z);
        }
        box(g, 0.86, 0.2, 0.09, palette.steel, 0, 0.98, -0.39); break;
      case 'fridge':
        box(g, 0.85, 1.65, 0.79, palette.steel, 0, 0.83, 0); box(g, 0.79, 1.05, 0.025, palette.cream, 0, 0.58, 0.41); box(g, 0.79, 0.43, 0.025, palette.cream, 0, 1.39, 0.41);
        box(g, 0.045, 0.39, 0.07, palette.steelDark, -0.26, 0.91, 0.46); box(g, 0.045, 0.2, 0.07, palette.steelDark, -0.26, 1.39, 0.46);
        box(g, 0.15, 0.06, 0.012, palette.black, 0.19, 1.44, 0.43); break;
      case 'counter': case 'prep':
        cabinet(g);
        if (type === 'prep') {
          box(g, 0.4, 0.028, 0.33, palette.lightwood, 0, 0.925, 0);
          box(g, 0.21, 0.015, 0.045, palette.steelDark, 0.06, 0.95, 0.02); box(g, 0.11, 0.025, 0.055, palette.black, -0.1, 0.95, 0.02);
          sphere(g, 0.08, material('#bc4d35'), 0.08, 0.98, -0.11);
        } else { plate(g, 0.12, 0.935, 0.02, false); } break;
      case 'sink':
        cabinet(g); box(g, 0.6, 0.035, 0.5, palette.steelDark, 0, 0.919, 0.04); box(g, 0.45, 0.038, 0.35, material('#768f90'), 0, 0.935, 0.04);
        cyl(g, 0.035, 0.35, palette.steel, 0, 1.07, -0.26, 8); box(g, 0.07, 0.045, 0.24, palette.steel, 0, 1.24, -0.16); break;
      case 'fryer':
        cabinet(g); box(g, 0.68, 0.08, 0.53, palette.black, 0, 0.94, -0.03);
        for (const x of [-0.18, 0.18]) { box(g, 0.28, 0.055, 0.39, material('#b39245'), x, 0.975, -0.03); box(g, 0.055, 0.045, 0.3, palette.black, x, 1.035, 0.28); }
        box(g, 0.83, 0.18, 0.13, palette.steelDark, 0, 1.03, -0.33); break;
      case 'coffee':
        cabinet(g); box(g, 0.66, 0.4, 0.44, palette.red, 0, 1.12, -0.1); box(g, 0.59, 0.14, 0.15, palette.steel, 0, 1.17, 0.16); box(g, 0.6, 0.035, 0.3, palette.black, 0, 0.97, 0.13);
        for (const x of [-0.16, 0.16]) { cyl(g, 0.045, 0.09, palette.black, x, 1.08, 0.18, 8); cyl(g, 0.065, 0.1, palette.white, x, 1.02, 0.18, 10); } break;
      case 'bar':
        box(g, 0.91, 1.01, 0.66, palette.darkwood, 0, 0.505, 0); box(g, 0.99, 0.1, 0.9, palette.lightwood, 0, 1.06, 0);
        for (const x of [-0.35, -0.12, 0.12, 0.35]) box(g, 0.018, 0.85, 0.025, palette.wood, x, 0.52, 0.35);
        cyl(g, 0.055, 0.18, palette.glass, 0.2, 1.19, 0.1, 10); break;
      case 'toilet':
        cyl(g, 0.19, 0.3, palette.white, 0, 0.19, 0.06, 12); const bowl = cyl(g, 0.27, 0.16, palette.white, 0, 0.41, 0.09, 16); bowl.scale.z = 1.3;
        const water = cyl(g, 0.18, 0.016, material('#8fa8a8'), 0, 0.5, 0.1, 16); water.scale.z = 1.3;
        box(g, 0.5, 0.52, 0.19, palette.white, 0, 0.58, -0.24); box(g, 0.53, 0.045, 0.23, palette.cream, 0, 0.86, -0.24); box(g, 0.08, 0.02, 0.04, palette.steel, 0.16, 0.89, -0.24); break;
      case 'plant':
        cyl(g, 0.25, 0.42, material('#ad7054'), 0, 0.23, 0, 8, 0.31); cyl(g, 0.27, 0.03, palette.soil, 0, 0.45, 0, 8);
        cyl(g, 0.035, 0.6, palette.darkwood, 0, 0.73, 0, 6);
        for (let i = 0; i < 8; i++) { const a = i * 2.4; const leaf = sphere(g, 0.22, i % 2 ? palette.leaf : palette.leafLight, Math.cos(a) * 0.18, 0.71 + (i % 3) * 0.17, Math.sin(a) * 0.18); leaf.scale.set(0.8, 1.2, 0.65); } break;
      case 'flowerbox':
        box(g, 0.9, 0.35, 0.5, palette.wood, 0, 0.22, 0); box(g, 0.77, 0.025, 0.38, palette.soil, 0, 0.405, 0);
        for (let i = -3; i <= 3; i++) box(g, 0.055, 0.37, 0.04, palette.lightwood, i * 0.125, 0.23, 0.26);
        for (let i = 0; i < 7; i++) stem(g, -0.33 + (i % 4) * 0.21, 0.35, (i % 2 ? -1 : 1) * 0.1); break;
      case 'wall':
        brickwork(g,0.05,2.56);wallTrim(g);break;
      case 'door':
        for(const x of [-0.44,0.44])box(g,0.12,2.55,0.25,palette.white,x,1.3,0);
        brickwork(g,2.4,2.56);box(g,0.95,0.12,0.26,palette.white,0,2.36,0);
        box(g,0.7,2.23,0.08,palette.brickDark,0,1.15,0);box(g,0.53,1.08,0.095,palette.glass,0,1.66,0);
        for(const x of [-0.28,0,0.28])box(g,0.035,1.13,0.12,palette.white,x,1.66,0);
        for(const y of [1.1,1.65,2.2])box(g,0.6,0.035,0.12,palette.white,0,y,0);
        box(g,0.53,0.7,0.1,palette.wood,0,0.48,0);sphere(g,0.045,palette.brass,0.25,1.03,0.1);wallTrim(g);break;
      case 'window':
        brickwork(g,0.05,0.65);brickwork(g,2.31,2.56);
        for(const x of [-0.45,0.45])box(g,0.1,1.65,0.18,palette.brick,x,1.48,0);
        box(g,0.73,1.55,0.04,palette.glass,0,1.48,0);
        for(const x of [-0.38,0,0.38])box(g,0.055,1.65,0.12,palette.white,x,1.48,0);
        for(const y of [0.67,1.21,1.76,2.3])box(g,0.83,0.055,0.12,palette.white,0,y,0);
        box(g,0.92,0.09,0.32,palette.white,0,0.65,0);wallTrim(g);break;
      case 'divider':
        box(g, 0.94, 0.85, 0.14, palette.wood, 0, 0.45, 0); box(g, 1, 0.065, 0.21, palette.lightwood, 0, 0.91, 0);
        for (const x of [-0.4, 0.4]) box(g, 0.11, 0.94, 0.19, palette.darkwood, x, 0.5, 0); break;
      case 'bin':
        cyl(g, 0.23, 0.62, palette.steelDark, 0, 0.32, 0, 10, 0.28); cyl(g, 0.285, 0.05, palette.black, 0, 0.65, 0, 10); cyl(g, 0.18, 0.012, palette.soil, 0, 0.682, 0, 10); break;
      case 'lamp':
        cyl(g, 0.22, 0.055, palette.black, 0, 0.045, 0, 12); cyl(g, 0.035, 1.4, palette.brass, 0, 0.74, 0, 8); cyl(g, 0.3, 0.32, palette.cream, 0, 1.52, 0, 8, 0.17);
        sphere(g, 0.09, material('#ffdd94', { emissive: '#d89e38', emissiveIntensity: 0.4 }), 0, 1.4, 0); break;
      case 'painting':
        box(g, 0.73, 0.69, 0.08, palette.darkwood, 0, 1.12, 0); box(g, 0.62, 0.58, 0.025, palette.cream, 0, 1.12, 0.055);
        box(g, 0.52, 0.28, 0.015, material('#7e9c93'), 0, 1.04, 0.073); sphere(g, 0.11, material('#d9a85d'), 0.14, 1.25, 0.09); box(g, 0.18, 0.2, 0.018, material('#596b68'), -0.1, 1.02, 0.09);
        for (const child of g.children) {child.position.z-=0.42;child.position.y+=0.55;} break;
      case 'clock':
        const clockFace = cyl(g, 0.28, 0.07, palette.darkwood, 0, 1.24, 0, 24); clockFace.rotation.x = Math.PI / 2;
        const face = cyl(g, 0.235, 0.012, palette.cream, 0, 1.24, 0.044, 24); face.rotation.x = Math.PI / 2;
        box(g, 0.024, 0.18, 0.02, palette.black, 0, 1.3, 0.06); const hand = box(g, 0.13, 0.022, 0.022, palette.black, 0.05, 1.24, 0.06); hand.rotation.z = -0.4;
        for (const child of g.children) {child.position.z-=0.42;child.position.y+=0.55;} break;
      default: cabinet(g);
    }
    return g;
  }

  scene.add(new THREE.HemisphereLight('#f3f1df', '#697354', 1.55));
  const sun = new THREE.DirectionalLight('#fff0d8', 2.25);
  sun.position.set(-14, 30, 15); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -27, right: 27, top: 27, bottom: -27, near: 1, far: 80 });
  sun.shadow.normalBias = 0.025; sun.shadow.bias = -0.00005; sun.target.position.set(12, 0, 12);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#dce9f3', 0.45); fill.position.set(20, 12, -15); scene.add(fill);

  const world = new THREE.Group(); scene.add(world);
  box(world, 120, 0.18, 120, material('#77845c'), 12, -0.19, 12);
  box(world, 24, 0.16, 24, material('#879565'), 12, -0.05, 12);
  const grassPatch = material('#82915f');
  for (let x = 0; x < 24; x++) for (let z = 0; z < 24; z++) if ((x * 17 + z * 7) % 5 === 0) box(world, 1, 0.004, 1, grassPatch, x + 0.5, 0.034, z + 0.5);
  box(world, 30, 0.16, 2, material('#b9b6a6'), 12, -0.015, -1);
  box(world, 34, 0.1, 5.5, material('#666f6b'), 12, -0.08, -4.75);
  box(world, 32, 0.015, 0.1, palette.cream, 12, -0.019, -2.5);
  for (let i = -3; i < 30; i += 3) box(world, 1.35, 0.015, 0.11, palette.cream, i, -0.019, -5.1);
  for (let i = -2; i < 28; i++) box(world, 0.015, 0.012, 1.92, material('#aaa99c'), i, 0.071, -1);
  box(world, 1.7, 0.05, 5, material('#b9b6a6'), 11.5, 0.015, 2.5);
  // A quiet street frames the plot without hiding the dining room.
  function tree(x, z, scale = 1) {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(scale);
    cyl(t, 0.13, 1.6, palette.darkwood, 0, 0.8, 0, 7);
    for (let n = 0; n < 3; n++) { const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.94 - n * 0.14, 1.45, 7), n % 2 ? palette.leafLight : palette.leaf); geometries.add(canopy.geometry); canopy.position.y = 1.35 + n * 0.57; canopy.castShadow = true; t.add(canopy); }
    world.add(t);
  }
  for (const [x,z,s] of [[-2,1,1.1],[-3,8,1],[-2,17,1.15],[2,-2,1.05],[9,-3,1.2],[19,-2,1.15],[26,1,1.05],[27,9,1.1],[27,18,1],[-4,23,1.1]]) tree(x,z,s);
  function car(x,z,color) {
    const carGroup = new THREE.Group(); carGroup.position.set(x,0,z);
    box(carGroup, 2.3, 0.45, 1.05, material(color), 0, 0.46, 0); box(carGroup, 1.26, 0.4, 0.94, material(color), -0.06, 0.86, 0);
    box(carGroup, 1.06, 0.26, 0.96, material('#728b8d'), -0.06, 0.93, 0);
    for (const px of [-0.75,0.75]) for (const pz of [-0.52,0.52]) { const tire = cyl(carGroup,0.21,0.1,palette.black,px,0.26,pz,12); tire.rotation.x = Math.PI/2; }
    for (const pz of [-0.32,0.32]) box(carGroup,0.04,0.12,0.18,palette.cream,1.16,0.5,pz);
    world.add(carGroup); return carGroup;
  }
  car(3,-3.6,'#bc735d'); car(24,-6.1,'#c4c6b2');
  const ownership = new THREE.Group(); scene.add(ownership);
  const cursor = box(scene, 1.01, 0.025, 1.01, material('#d4c47f', { transparent:true, opacity:0.42, depthWrite:false }), 0,0.055,0); cursor.visible = false;
  const hoverOutline = new THREE.BoxHelper(new THREE.Object3D(), '#ffedb0');
  hoverOutline.material.depthTest = false; hoverOutline.material.transparent = true; hoverOutline.material.opacity = 0.9; hoverOutline.visible = false; scene.add(hoverOutline);

  function syncLand() {
    if (!game?.land) return;
    const l = game.land, signature = [l.minX,l.maxX,l.minZ,l.maxZ].join(',');
    if (signature === landSignature) return; landSignature = signature;
    clearChildren(ownership);
    const minX=l.minX, maxX=l.maxX+1, minZ=l.minZ, maxZ=l.maxZ+1;
    const mat=material('#d0c895', { transparent:true, opacity:0.7 });
    for(let x=minX;x<maxX;x++) { box(ownership,0.58,0.025,0.025,mat,x+0.5,0.06,minZ); box(ownership,0.58,0.025,0.025,mat,x+0.5,0.06,maxZ); }
    for(let z=minZ;z<maxZ;z++) { box(ownership,0.025,0.025,0.58,mat,minX,0.06,z+0.5); box(ownership,0.025,0.025,0.58,mat,maxX,0.06,z+0.5); }
  }
  function clearChildren(group) {
    for (const child of [...group.children]) { group.remove(child); child.traverse(n => { if(n.geometry) { n.geometry.dispose(); geometries.delete(n.geometry); } }); }
  }
  function tileMaterial(tile) {
    if (view === 'hygiene') return material(Number(game?.stats?.cleanliness ?? 100) > 60 ? '#a4be8d' : '#c79377');
    if (view === 'decor') return material(((tile.x * 7 + tile.z * 3) % 5) ? '#b6c694' : '#d0cc9e');
    const base = floorColors[tile.style] || floorColors.wood;
    const col = new THREE.Color(base); const variance = ((tile.x * 13 + tile.z * 19) % 7 - 3) * 0.008;
    if (['checker','tile','tiles','kitchen'].includes(tile.style) && (tile.x + tile.z) % 2) col.multiplyScalar(tile.style === 'checker' ? 0.49 : 0.92); else col.offsetHSL(0,0,variance);
    return material(`#${col.getHexString()}`);
  }
  function syncFloors() {
    const tiles=game?.floors || [];
    const signature = `${view}:${Math.round((game?.stats?.cleanliness || 0)/10)}:${tiles.map(t=>`${t.x},${t.z},${t.style}`).join(';')}`;
    if(signature===floorSignature) return; floorSignature=signature;
    clearChildren(floorLayer); floorMeshes.clear();
    for(const tile of tiles) {
      const group=new THREE.Group(); group.position.set(tile.x+0.5,0,tile.z+0.5); group.userData={tile:{x:tile.x,z:tile.z}};
      box(group,0.996,0.085,0.996,tileMaterial(tile),0,0.05,0);
      if((['wood','peach'].includes(tile.style) || !tile.style) && view !== 'decor' && view !== 'hygiene') {
        const peach=tile.style==='peach',seam=material(peach?'#b98169':'#9b7957',{transparent:true,opacity:peach?0.26:0.38});
        for(const x of peach?[0]:[-0.25,0.25])box(group,0.009,0.003,0.995,seam,x,0.095,0);
        box(group,peach?0.995:0.495,0.003,0.009,seam,peach?0:-0.25,0.096,(tile.x+tile.z)%2 ? 0.2 : -0.22);
      }
      floorLayer.add(group); floorMeshes.set(cellKey(tile.x,tile.z),group);
    }
  }
  function syncObjects() {
    const ids=new Set();
    for(const data of game?.objects || []) {
      ids.add(data.id); const signature = [data.type,data.x,data.z,data.rotation,data.color].join(':');
      let group=objects.get(data.id);
      if(group?.userData.signature===signature) continue;
      if(group) { clearChildren(group); objectLayer.remove(group); }
      group=model(data.type,data.color); group.position.set(data.x+0.5,0.1,data.z+0.5); group.rotation.y=angle(data.rotation);
      group.userData={objectId:data.id,signature,data}; objectLayer.add(group); objects.set(data.id,group);
    }
    for(const [id,group] of objects) if(!ids.has(id)) { clearChildren(group); objectLayer.remove(group); objects.delete(id); }
    for(const group of objects.values()) {
      const data=group.userData.data;
      if(!['painting','clock'].includes(data.type)) continue;
      let nearest=null;
      for(const wall of objects.values()) {
        const w=wall.userData.data;
        if(w.type!=='wall') continue;
        const nx=Math.round(Math.sin(angle(w.rotation))), nz=Math.round(Math.cos(angle(w.rotation)));
        const dx=data.x-w.x, dz=data.z-w.z, distance=dx*nx+dz*nz;
        if(Math.abs(distance)>1.6 || Math.abs(dx*nz-dz*nx)>0.55) continue;
        if(!nearest || Math.abs(distance)<Math.abs(nearest.distance)) nearest={wall,nx,nz,distance};
      }
      group.position.set(data.x+0.5,0.1,data.z+0.5);group.rotation.y=angle(data.rotation);group.userData.hostWallId=null;
      if(nearest) {
        const side=nearest.distance<0?-1:1, nx=nearest.nx*side, nz=nearest.nz*side;
        const mountDistance=data.type==='clock'?0.55:0.555;
        const shift=mountDistance-Math.abs(nearest.distance);
        group.position.x+=nx*shift;group.position.z+=nz*shift;
        group.rotation.y=Math.atan2(nx,nz);group.userData.hostWallId=nearest.wall.userData.objectId;
      }
    }
  }
  function makePerson(data, isStaff) {
    const g=new THREE.Group(), body=new THREE.Group(); g.add(body);
    const seed=String(data.id).split('').reduce((sum,c)=>sum+c.charCodeAt(0),0);
    const skin=material(['#e6bc95','#c99572','#a77553','#ead0a9'][seed%4]);
    const shirt=isStaff ? (data.role==='chef' ? palette.cream : material(data.role==='cleaner'?'#859260':'#6c8c9c')) : material(['#ce8c6e','#8a9b75','#a37a91','#b1ad85','#7f9b9f','#c6a158'][seed%6]);
    const trousers=material(isStaff?'#505b59':['#626568','#79675c','#6b7b7d'][seed%3]);
    box(body,0.31,0.4,0.21,shirt,0,0.75,0);
    const leftLeg=box(body,0.115,0.39,0.13,trousers,-0.085,0.36,0), rightLeg=box(body,0.115,0.39,0.13,trousers,0.085,0.36,0);
    box(leftLeg,0.13,0.08,0.19,palette.black,0,-0.18,0.025); box(rightLeg,0.13,0.08,0.19,palette.black,0,-0.18,0.025);
    const head=box(body,0.255,0.29,0.24,skin,0,1.105,0); box(body,0.12,0.065,0.1,skin,0,0.925,0);
    box(body,0.265,0.075,0.25,material(['#5b4332','#a78150','#3b3b34','#847463'][seed%4]),0,1.252,-0.01);
    for(const x of [-0.065,0.065]) box(body,0.018,0.022,0.012,palette.black,x,1.12,0.125);
    const leftArm=box(body,0.09,0.35,0.11,shirt,-0.22,0.72,0), rightArm=box(body,0.09,0.35,0.11,shirt,0.22,0.72,0);
    box(leftArm,0.085,0.095,0.1,skin,0,-0.19,0); box(rightArm,0.085,0.095,0.1,skin,0,-0.19,0);
    if(isStaff) {
      box(body,0.24,0.33,0.025,data.role==='chef'?palette.white:palette.cream,0,0.65,0.118);
      if(data.role==='chef') { cyl(body,0.16,0.11,palette.white,0,1.29,0,10); for(const x of [-0.085,0.075]) sphere(body,0.13,palette.white,x,1.42,0); }
    }
    const carried=new THREE.Group(); carried.position.set(0.24,0.76,0.28); plate(carried,0,0,0,true); carried.visible=false; body.add(carried);
    const indicator=new THREE.Group(); indicator.position.y=1.7; g.add(indicator);
    const token=cyl(indicator,0.12,0.035,material('#e3c982'),0,0,0,12); token.rotation.x=Math.PI/2; indicator.visible=false;
    g.userData={objectId:data.id,data,isStaff,seed,body,head,leftLeg,rightLeg,leftArm,rightArm,carried,indicator,lastX:data.x,lastZ:data.z};
    g.position.set(data.x+0.5,0.1,data.z+0.5); peopleLayer.add(g); return g;
  }
  function syncPeople() {
    const ids=new Set();
    for(const data of [...(game?.staff || []),...(game?.guests || [])]) {
      ids.add(data.id); let group=people.get(data.id);
      if(!group) { group=makePerson(data,Boolean(data.role)); people.set(data.id,group); }
      group.userData.data=data;
    }
    for(const [id,group] of people) if(!ids.has(id)) { clearChildren(group); peopleLayer.remove(group); people.delete(id); }
  }
  function syncTableProps() {
    const dining=new Set((game?.guests||[]).filter(p=>['eating','served','dining'].includes(String(p.state).toLowerCase())).map(p=>p.tableId));
    for(const [id,entry] of tableProps) if(!dining.has(id)||!objects.has(id)) { clearChildren(entry); propsLayer.remove(entry); tableProps.delete(id); }
    for(const id of dining) if(!tableProps.has(id)&&objects.has(id)) { const o=objects.get(id), g=new THREE.Group(); plate(g,0.18,0.95,0.13); g.position.copy(o.position); propsLayer.add(g); tableProps.set(id,g); }
  }
  function validCell(x,z) {
    const l=game?.land || {minX:0,maxX:23,minZ:0,maxZ:23};
    if(x<l.minX || x>l.maxX || z<l.minZ || z>l.maxZ) return false;
    if(tool?.type==='FLOOR') return true;
    if(tool?.type==='LAND') return true;
    const occupant=(game?.objects||[]).find(o=>o.x===x&&o.z===z);
    if(tool?.type==='PLACE'&&['wall','window','door'].includes(tool.itemType)){
      if(tool.itemType==='door'&&['wall','window'].includes(occupant?.type))return true;
      return !occupant || occupant.type===tool.itemType;
    }
    return !occupant && floorMeshes.has(cellKey(x,z));
  }
  function rebuildGhost() {
    const next=tool?.type==='PLACE'?tool.itemType:null;
    if(next===ghostType && ghost?.userData.color===tool?.color) return;
    if(ghost) { clearChildren(ghost); scene.remove(ghost); ghost=null; }
    ghostType=next;
    if(next) {
      ghost=model(next,tool.color); ghost.userData.color=tool.color;
      ghost.traverse(n=>{if(n.isMesh){n.material=material('#8fc695',{transparent:true,opacity:0.58,depthWrite:false,roughness:0.7});n.castShadow=false;}});
      scene.add(ghost);
    }
  }
  function updateHoverVisual() {
    const cell=hover;
    cursor.visible=Boolean(cell && tool); if(cell) cursor.position.set(cell.x+0.5,0.12,cell.z+0.5);
    if(ghost) {
      ghost.visible=Boolean(cell)&&!strokeLayer.visible;
      if(cell) {
        ghost.position.set(cell.x+0.5,0.12,cell.z+0.5); ghost.rotation.y=angle(rotation);
        const good=validCell(cell.x,cell.z), m=material(good?'#8fc695':'#d67969',{transparent:true,opacity:0.58,depthWrite:false,roughness:0.7});
        ghost.traverse(n=>{if(n.isMesh)n.material=m;}); cursor.material=material(good?'#90c8a0':'#d67969',{transparent:true,opacity:0.4,depthWrite:false});
      }
    }
    const object=objects.get(hoveredId)||people.get(hoveredId); hoverOutline.visible=Boolean(object && !ghost);
    if(object) hoverOutline.setFromObject(object);
  }
  function axisStroke(start,end){
    const dx=end.x-start.x,dz=end.z-start.z,axis=Math.abs(dx)>=Math.abs(dz)?'x':'z';
    const length=Math.abs(axis==='x'?dx:dz),direction=Math.sign(axis==='x'?dx:dz),cells=[];
    for(let i=0;i<=length;i++)cells.push({x:start.x+(axis==='x'?i*direction:0),z:start.z+(axis==='z'?i*direction:0)});
    return {cells,axis};
  }
  function clearStrokePreview(){strokeLayer.visible=false;strokeSignature='';clearChildren(strokeLayer);}
  function previewStroke(stroke){
    const signature=`${tool?.type}:${tool?.itemType}:${tool?.style}:${stroke.axis}:${stroke.cells.map(c=>cellKey(c.x,c.z)).join(';')}`;
    if(strokeSignature===signature)return;
    clearStrokePreview();strokeSignature=signature;strokeLayer.visible=true;
    for(const cell of stroke.cells){
      const good=validCell(cell.x,cell.z),preview=tool.type==='FLOOR'?new THREE.Group():model(tool.itemType,tool.color);
      const mat=material(good?'#9cb593':'#d47972',{transparent:true,opacity:0.6,depthWrite:false,roughness:0.8});
      if(tool.type==='FLOOR')box(preview,0.99,0.035,0.99,mat,0,0.015,0);
      preview.traverse(node=>{if(node.isMesh){node.material=mat;node.castShadow=false;}});
      preview.position.set(cell.x+0.5,0.12,cell.z+0.5);preview.rotation.y=stroke.axis==='x'?0:Math.PI/2;strokeLayer.add(preview);
    }
  }
  function pick(event) {
    const rect=renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects(tool?objectLayer.children:[...objectLayer.children,...peopleLayer.children],true).filter(hit=>{
      for(let node=hit.object;node;node=node.parent) if(!node.visible)return false;
      return true;
    });
    let objectId=null;
    if(hits.length) { let obj=hits[0].object; while(obj&&!obj.userData.objectId)obj=obj.parent; objectId=obj?.userData.objectId; }
    if(!raycaster.ray.intersectPlane(plane,hitPoint))return null;
    let x=Math.floor(hitPoint.x),z=Math.floor(hitPoint.z);
    if(objectId && tool?.type!=='FLOOR' && tool?.type!=='PLACE') { const o=(objects.get(objectId)||people.get(objectId)).userData.data; x=Math.floor(o.x);z=Math.floor(o.z); }
    if(x<0||x>23||z<0||z>23)return null;
    return {x,z,...(objectId?{objectId}:{})};
  }
  let drag=null;
  const canvas=renderer.domElement;
  function onPointerDown(event) {
    if(event.button>2||drag)return;
    event.preventDefault();
    const pan=event.button===1||event.shiftKey||(event.pointerType==='touch'&&!tool),startCell=pick(event);
    const stroke=event.button===0&&!pan&&startCell&&(tool?.type==='FLOOR'||(tool?.type==='PLACE'&&['wall','window'].includes(tool.itemType)));
    drag={x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,button:event.button,pointerId:event.pointerId,moved:false,pan,stroke,startCell,endCell:startCell};
    canvas.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event) {
    if(drag&&drag.pointerId!==event.pointerId)return;
    if(drag) {
      const dx=event.clientX-drag.lastX,dy=event.clientY-drag.lastY;
      if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>5)drag.moved=true;
      if(drag.pan && drag.moved) {
        const factor=26/height/zoomLevel;
        target.x += (-dx*Math.cos(azimuth)+dy*Math.sin(azimuth))*factor;
        target.z += (dx*Math.sin(azimuth)+dy*Math.cos(azimuth))*factor;
        target.x=clamp(target.x,-4,28);target.z=clamp(target.z,-4,28); updateCamera();
      } else if(drag.button===2 && drag.moved) { azimuth-=dx*0.008; elevation=clamp(elevation+dy*0.006,0.42,1.4);updateCamera(); }
      else if(drag.stroke&&drag.moved){
        const end=pick(event);if(end)drag.endCell=end;
        const stroke=axisStroke(drag.startCell,drag.endCell);
        previewStroke(stroke);
      }
      drag.lastX=event.clientX;drag.lastY=event.clientY;
    }
    const next=pick(event); hover=next; hoveredId=next?.objectId || null; callbacks.onHover?.(next); updateHoverVisual();
  }
  function onPointerUp(event) {
    if(!drag||drag.pointerId!==event.pointerId)return;
    const was=drag;drag=null;
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    clearStrokePreview();
    if(was.button!==0)return;
    if(was.stroke&&was.moved){
      const stroke=axisStroke(was.startCell,pick(event)||was.endCell);
      callbacks.onTileStroke?.(stroke);
      updateHoverVisual();return;
    }
    if(was.moved)return;
    const cell=pick(event); if(!cell)return;
    if(cell.objectId && (!tool || tool.type==='REMOVE')) callbacks.onObjectClick?.(cell.objectId);
    else callbacks.onTileClick?.({x:cell.x,z:cell.z});
  }
  function onPointerLeave() { if(drag)return;hover=null;hoveredId=null;callbacks.onHover?.(null);updateHoverVisual(); }
  function onWheel(event) { event.preventDefault(); zoomLevel=clamp(zoomLevel*Math.exp(-event.deltaY*0.001),0.55,2.8);updateCamera(); }
  function onContext(event){event.preventDefault();}
  function onCancel(event){
    if(!drag||(event&&drag.pointerId!==event.pointerId))return;
    const pointerId=drag.pointerId;drag=null;
    if(canvas.hasPointerCapture(pointerId))canvas.releasePointerCapture(pointerId);
    clearStrokePreview();updateHoverVisual();
  }
  const listeners={pointerdown:onPointerDown,pointermove:onPointerMove,pointerup:onPointerUp,pointerleave:onPointerLeave,pointercancel:onCancel,lostpointercapture:onCancel,wheel:onWheel,contextmenu:onContext};
  for(const [name,fn]of Object.entries(listeners))canvas.addEventListener(name,fn,{passive:false});

  function updateCamera() {
    const heightSpan=25/zoomLevel,aspect=width/height;
    camera.left=-heightSpan*aspect/2;camera.right=heightSpan*aspect/2;camera.top=heightSpan/2;camera.bottom=-heightSpan/2;
    const e=view==='top'?1.54:elevation, distance=42;
    camera.position.set(target.x+Math.sin(azimuth)*Math.cos(e)*distance,target.y+Math.sin(e)*distance,target.z+Math.cos(azimuth)*Math.cos(e)*distance);
    camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    updateCutaway();
    callbacks.onCameraChange?.({azimuth,elevation:e,zoom:zoomLevel,view,wallMode});
  }
  function updateCutaway() {
    for (const group of objects.values()) {
      const d=group.userData.data;
      if (!['wall','window','door'].includes(d.type)) continue;
      const normalX=Math.sin(angle(d.rotation)), normalZ=Math.cos(angle(d.rotation));
      const inFront=Math.abs(normalX)>0.7 ? (d.x+0.5-target.x)*(camera.position.x-target.x)>0 : (d.z+0.5-target.z)*(camera.position.z-target.z)>0;
      group.scale.y=wallMode==='low'||(wallMode==='cutaway'&&(view==='top'||inFront))?0.13:1;
    }
    for(const group of objects.values()) {
      if(!['painting','clock'].includes(group.userData.data.type)) continue;
      const host=objects.get(group.userData.hostWallId);
      group.visible=!host || host.scale.y>0.5;
    }
  }
  function resize() {
    width=Math.max(1,container.clientWidth);height=Math.max(1,container.clientHeight);renderer.setSize(width,height,false);updateCamera();
  }
  const observer=new ResizeObserver(resize);observer.observe(container);resize();

  function animate() {
    if(disposed)return;
    const now=performance.now(), dt=Math.min((now-lastTime)/1000,0.06);lastTime=now;
    const elapsed=(now-startedAt)/1000;
    for(const group of people.values()) {
      const u=group.userData,d=u.data, tx=Number(d.x)+0.5,tz=Number(d.z)+0.5;
      const dx=tx-group.position.x,dz=tz-group.position.z,distance=Math.hypot(dx,dz),moving=distance>0.025;
      if(distance>4)group.position.set(tx,0.1,tz);
      else if(moving) { const lerp=1-Math.exp(-dt*10);group.position.x+=dx*lerp;group.position.z+=dz*lerp;group.rotation.y=Math.atan2(dx,dz); }
      const state=String(d.state||d.task||'').toLowerCase(),sit=state==='eating'||state==='waitingfood'||state==='waiting_food';
      const walk=moving && game?.speed!==0 ? Math.sin(elapsed*10+u.seed)*0.43 : 0;
      u.leftLeg.rotation.x=sit?-1.12:walk;u.rightLeg.rotation.x=sit?-1.12:-walk;u.leftArm.rotation.x=-walk*0.6;u.rightArm.rotation.x=walk*0.6;
      u.body.position.y=sit?-0.25:Math.abs(walk)*0.03;
      u.carried.visible=u.isStaff && /serv|deliver|carry/.test(state);if(u.carried.visible)u.rightArm.rotation.x=-0.9;
      u.indicator.visible=!u.isStaff && (/wait|order|unhappy/.test(state));u.indicator.position.y=1.55+Math.sin(elapsed*2+u.seed)*0.035;u.indicator.rotation.copy(camera.rotation);
    }
    renderer.render(scene,camera);frame=requestAnimationFrame(animate);
  }
  frame=requestAnimationFrame(animate);

  return {
    update(nextGame) { if(disposed)return;game=nextGame;syncLand();syncFloors();syncObjects();syncPeople();syncTableProps();updateCutaway();updateHoverVisual(); },
    setTool(nextTool) { onCancel();tool=nextTool;rebuildGhost();canvas.style.cursor=tool?'crosshair':'default';updateHoverVisual(); },
    setRotation(value) { rotation=Number(value)||0;updateHoverVisual(); },
    setView(nextView) { view=['top','decor','hygiene'].includes(nextView)?nextView:'isometric';floorSignature='';syncFloors();updateCamera(); },
    setWallMode(nextMode){wallMode=['full','cutaway','low'].includes(nextMode)?nextMode:'full';updateCamera();updateHoverVisual();},
    pan(dx,dz){target.x=clamp(target.x+(Number(dx)||0),-4,28);target.z=clamp(target.z+(Number(dz)||0),-4,28);updateCamera();},
    rotate(delta) { azimuth+=Number(delta)||0;updateCamera(); },
    zoom(delta) { zoomLevel=clamp(zoomLevel+(Number(delta)||0),0.55,2.8);updateCamera(); },
    resize,
    screenPosition(x,z) { const p=new THREE.Vector3(x+0.5,0.1,z+0.5).project(camera);return {x:(p.x+1)*width/2,y:(1-p.y)*height/2}; },
    dispose() {
      if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();onCancel();
      for(const[name,fn]of Object.entries(listeners))canvas.removeEventListener(name,fn);
      for(const geometry of geometries)geometry.dispose();for(const mat of materials.values())mat.dispose();for(const texture of textures)texture.dispose();
      hoverOutline.geometry.dispose();hoverOutline.material.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();
      objects.clear();people.clear();floorMeshes.clear();tableProps.clear();
    },
  };
}
