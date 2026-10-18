import * as THREE from 'three';
import { getSupplies } from './engine.js';

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const cellKey = (x, z) => `${x},${z}`;
const angle = value => (Number(value) || 0) * Math.PI / 180;
const floorColors = { peach: '#e3a17c', wood: '#c09568', tile: '#e5dfca', tiles: '#e5dfca', kitchen: '#e5dfca', stone: '#929b99', checker: '#ede5cd', carpet: '#ad5952', concrete: '#a8aaa2', dark: '#605445', white: '#ede9d9' };
const architectural = type => ['wall','window','door'].includes(type);
const modelTypes=new Set('table chair stove oven fridge counter prep cuttingboard shelf bigshelf sink dishwasher fryer coffee bar toilet plant flowerbox wall door window divider bin lamp painting clock'.split(' '));
const ingredientTypes=new Set('potato flour tomato coffee avocado steak chicken rice mushroom'.split(' '));
const wareTypes=new Set('plate stemglass pan bowl cup glass'.split(' '));
const dishTypes=new Set('burger salad pasta steak risotto chef-special fries'.split(' '));

/** A self-contained, procedural restaurant world. Coordinates identify one-unit cells. */
export function createScene(container, callbacks = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#827e68');
  scene.fog = new THREE.Fog('#827e68', 58, 105);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.97;
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
  const modelBaseHeights = new Map();
  const thumbnailCache=new Map();let thumbnailTarget=null;
  let dishwasherGame=null,dishwasherSignature='';
  const objects = new Map(), people = new Map(), floorMeshes = new Map(), tableProps = new Map(), stockProps=new Map(), wareProps=new Map();
  const objectLayer = new THREE.Group(), floorLayer = new THREE.Group(), peopleLayer = new THREE.Group(), propsLayer = new THREE.Group();
  scene.add(floorLayer, objectLayer, peopleLayer, propsLayer);
  const strokeLayer = new THREE.Group(); scene.add(strokeLayer); strokeLayer.visible = false;
  let strokeSignature = '';
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.036), hitPoint = new THREE.Vector3();

  function material(color, extra = {}) {
    const key = `${color}:${JSON.stringify(extra)}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...extra }));
    return materials.get(key);
  }
  const palette = {
    cream: material('#ece6d5'), trim: material('#686259'), wood: material('#a47750'), lightwood: material('#c1956e'), darkwood: material('#654d3a'),
    red: material('#ac4941'), steel: material('#bdb9ba', { roughness: 0.54, metalness: 0.22 }), steelDark: material('#85858a', { roughness: 0.54, metalness: 0.22 }),
    black: material('#303534'), white: material('#f6f1e2'), glass: material('#a3cad0', { transparent: true, opacity: 0.6, roughness: 0.2 }),
    leaf: material('#63774f'), leafLight: material('#85945f'), soil: material('#554636'), brass: material('#be9c58', { roughness: 0.4, metalness: 0.5 }),
    brick: material('#b15b75'), brickDark: material('#a25b70'), masonryTrim: material('#756674'),
  };
  const brickCanvas=document.createElement('canvas');brickCanvas.width=128;brickCanvas.height=256;
  const brickContext=brickCanvas.getContext('2d');brickContext.fillStyle='#ac5972';brickContext.fillRect(0,0,128,256);
  for(let row=0;row<14;row++)for(let col=-1;col<3;col++){
    brickContext.fillStyle=['#b55e79','#b7607b','#b15c76'][(row*7+col+4)%3];
    brickContext.fillRect(col*64+(row%2?32:0)+1,row*19+1,62,18);
  }
  const brickTexture=new THREE.CanvasTexture(brickCanvas);brickTexture.colorSpace=THREE.SRGBColorSpace;textures.add(brickTexture);
  palette.brick=new THREE.MeshStandardMaterial({map:brickTexture,roughness:0.85});materials.set('masonry',palette.brick);
  const peachCanvas=document.createElement('canvas');peachCanvas.width=256;peachCanvas.height=512;
  const peachContext=peachCanvas.getContext('2d');peachContext.fillStyle='#c98a68';peachContext.fillRect(0,0,256,512);
  for(let column=0;column<4;column++)for(let board=-1;board<3;board++){
    const y=board*256+(column%2?128:0);peachContext.fillStyle=['#e3a17c','#dfa079','#e5a47f','#e1a07b'][(column+board+4)%4];
    peachContext.fillRect(column*64+1,y+1,62,254);
    peachContext.fillStyle='rgba(165,103,71,0.10)';peachContext.fillRect(column*64+15,y+37,1,117);peachContext.fillRect(column*64+43,y+128,1,86);
  }
  const peachTexture=new THREE.CanvasTexture(peachCanvas);peachTexture.colorSpace=THREE.SRGBColorSpace;peachTexture.wrapS=peachTexture.wrapT=THREE.RepeatWrapping;textures.add(peachTexture);
  const peachMaterial=new THREE.MeshStandardMaterial({map:peachTexture,roughness:0.87});materials.set('peach-boards',peachMaterial);
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
  function ingredientModel(id){
    const g=new THREE.Group();
    box(g,0.21,0.025,0.28,palette.lightwood,0,0.015,0);
    for(const z of [-0.14,0.14])box(g,0.23,0.09,0.025,palette.wood,0,0.065,z);
    for(const x of [-0.11,0.11])box(g,0.025,0.09,0.28,palette.wood,x,0.065,0);
    if(['flour','rice'].includes(id)){
      box(g,0.13,0.16,0.17,material(id==='flour'?'#eee2bf':'#ddc89a'),0,0.11,0);
      box(g,0.065,0.075,0.008,material(id==='flour'?'#a9624f':'#7d8c63'),0,0.12,0.09);
    }else if(id==='coffee'){
      cyl(g,0.065,0.13,material('#6b5144'),0,0.1,0,10);cyl(g,0.069,0.025,palette.black,0,0.18,0,10);box(g,0.075,0.07,0.01,palette.cream,0,0.11,0.062);
    }else if(['steak','chicken'].includes(id)){
      const meat=box(g,0.14,0.055,0.17,material(id==='steak'?'#b75454':'#ddc2a3'),0,0.09,0);meat.rotation.y=0.2;
      box(g,0.025,0.005,0.12,palette.cream,-0.025,0.12,0);
    }else for(let i=0;i<3;i++){
      const x=(i%2?0.045:-0.04),z=(i-1)*0.07,y=0.09+(i===2?0.025:0);
      if(id==='mushroom'){cyl(g,0.015,0.065,palette.cream,x,y,z,6);const cap=sphere(g,0.05,material('#d8c7a5'),x,y+0.04,z,1);cap.scale.y=0.55;}
      else{
        const color=id==='potato'?'#d5ad62':id==='tomato'?'#c45543':'#65834b';
        const fruit=sphere(g,0.046,material(color),x,y,z,1);fruit.scale.set(id==='potato'?1.15:1,id==='avocado'?1.4:0.9,0.85);
        if(id==='tomato')box(g,0.035,0.008,0.025,palette.leaf,x,y+0.044,z);
      }
    }
    return g;
  }
  function wareModel(type,{dirty=false,recipeId=null}={}){
    const g=new THREE.Group();
    if(type==='plate'){cyl(g,0.18,0.026,palette.white,0,0.015,0,20);cyl(g,0.145,0.008,palette.cream,0,0.032,0,20);}
    else if(type==='bowl'){cyl(g,0.11,0.12,palette.white,0,0.06,0,16,0.19);cyl(g,0.16,0.01,palette.cream,0,0.123,0,16);}
    else if(type==='pan'){cyl(g,0.18,0.055,palette.steelDark,0,0.03,0,16);box(g,0.21,0.035,0.055,palette.black,0.24,0.05,0);}
    else if(type==='stemglass'){cyl(g,0.072,0.015,palette.glass,0,0.01,0,12);cyl(g,0.013,0.15,palette.glass,0,0.09,0,8);cyl(g,0.065,0.13,palette.glass,0,0.22,0,12,0.085);}
    else if(type==='cup'){cyl(g,0.075,0.13,palette.white,0,0.07,0,12,0.095);const handle=addMesh(g,new THREE.TorusGeometry(0.052,0.012,5,12),palette.white,0.1,0.08,0);handle.rotation.y=Math.PI/2;}
    else cyl(g,0.067,0.19,palette.glass,0,0.1,0,12,0.08);
    const foodY=type==='bowl'?0.14:0.055;
    if(recipeId==='burger'){
      cyl(g,0.09,0.035,material('#d1a25e'),0,foodY,0,12);cyl(g,0.092,0.035,material('#795239'),0,foodY+0.03,0,12);cyl(g,0.1,0.025,palette.leaf,0,foodY+0.052,0,10);const bun=sphere(g,0.105,material('#dea755'),0,foodY+0.07,0,1);bun.scale.y=0.45;
    }else if(recipeId==='fries')for(let i=0;i<7;i++){const fry=box(g,0.027,0.035,0.15,material('#e2b64e'),(i%3-1)*0.045,foodY+0.01+(i%2)*0.03,(i%2-0.5)*0.04);fry.rotation.y=(i%3-1)*0.3;}
    else if(recipeId){
      const color=recipeId==='salad'?'#7f9b50':recipeId==='steak'?'#88513e':recipeId==='pasta'?'#d6ae59':recipeId==='risotto'?'#d9c995':'#d8bb91';
      for(let i=0;i<6;i++){const food=sphere(g,0.05,material(color),Math.cos(i*2.4)*0.07,foodY+(i%2)*0.025,Math.sin(i*2.4)*0.07,1);food.scale.y=0.55;}
      sphere(g,0.028,palette.red,0.06,foodY+0.03,0.02);
    }else if(dirty)for(let i=0;i<3;i++){const stain=sphere(g,0.03,material('#a28658'),Math.cos(i*2.1)*0.07,foodY-0.009,Math.sin(i*2.1)*0.07);stain.scale.y=0.12;}
    return g;
  }
  function dishModel(id){return wareModel(['pasta','risotto'].includes(id)?'bowl':'plate',{recipeId:id});}
  function cabinet(group, top = 0.87, depth = 0.8) {
    box(group, 0.83, top - 0.12, depth, palette.steel, 0, top / 2, 0);
    box(group, 0.89, 0.07, depth + 0.05, palette.steel, 0, top, 0);
    for (const x of [-0.21, 0.21]) {
      box(group, 0.38, top - 0.23, 0.025, palette.steelDark, x, top / 2, depth / 2 + 0.016);
      box(group, 0.1, 0.025, 0.045, palette.black, x, top - 0.18, depth / 2 + 0.04);
    }
    for (const x of [-0.33, 0.33]) for (const z of [-0.3, 0.3]) box(group, 0.07, 0.12, 0.07, palette.black, x, 0.06, z);
  }
  function brickwork(group, bottom, top, length=1, x=0, z=0, rotationY=0) {
    const wall=box(group,length,top-bottom,0.18,palette.brick,x,(bottom+top)/2,z),uv=wall.geometry.attributes.uv;
    wall.rotation.y=rotationY;
    for(let i=0;i<uv.count;i++){uv.setX(i,uv.getX(i)*length);uv.setY(i,(uv.getY(i)*(top-bottom)+bottom)/2.56);}
  }
  function wallTrim(group,length=1,x=0,z=0,rotationY=0) {
    box(group,length+0.025,0.14,0.27,palette.masonryTrim,x,2.61,z).rotation.y=rotationY;
    box(group,length+0.01,0.14,0.23,palette.masonryTrim,x,0.11,z).rotation.y=rotationY;
  }
  function wallArm(group,type,direction){
    const z=direction*0.25;
    if(type==='wall')brickwork(group,0.05,2.56,0.5,0,z,Math.PI/2);
    else if(type==='window'){
      brickwork(group,0.05,0.65,0.5,0,z,Math.PI/2);brickwork(group,2.31,2.56,0.5,0,z,Math.PI/2);
      box(group,0.04,1.55,0.5,palette.glass,0,1.48,z);
      for(const y of [0.67,1.21,1.76,2.3])box(group,0.12,0.055,0.5,palette.white,0,y,z);
    }else{
      brickwork(group,2.4,2.56,0.5,0,z,Math.PI/2);box(group,0.26,0.12,0.5,palette.white,0,2.36,z);
    }
    wallTrim(group,0.5,0,z,Math.PI/2);
  }
  function model(type, color, connections=null) {
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
        box(g,0.85,1.7,0.13,palette.cream,0,0.87,-0.34);box(g,0.85,0.16,0.8,palette.cream,0,0.12,0);box(g,0.85,0.16,0.8,palette.cream,0,1.67,0);
        for(const x of [-0.37,0.37])box(g,0.11,1.5,0.8,palette.cream,x,0.87,0);
        for(const y of [0.24,0.7,1.16])box(g,0.68,0.035,0.63,palette.steel,0,y,0);
        box(g,0.64,1.42,0.025,palette.glass,0,0.9,0.413);box(g,0.04,0.58,0.065,palette.black,-0.28,0.9,0.45);break;
      case 'counter':
        box(g,0.98,0.76,0.85,palette.cream,0,0.43,0);box(g,1,0.075,0.96,palette.white,0,0.855,0);box(g,0.94,0.08,0.8,palette.trim,0,0.09,0);
        for(const x of [-0.24,0.24]){box(g,0.455,0.61,0.025,palette.white,x,0.43,0.44);box(g,0.025,0.14,0.035,palette.black,x+(x<0?0.15:-0.15),0.5,0.465);}break;
      case 'prep':
        cabinet(g);
          box(g, 0.4, 0.028, 0.33, palette.lightwood, 0, 0.925, 0);
          box(g, 0.21, 0.015, 0.045, palette.steelDark, 0.06, 0.95, 0.02); box(g, 0.11, 0.025, 0.055, palette.black, -0.1, 0.95, 0.02);
          sphere(g, 0.08, material('#bc4d35'), 0.08, 0.98, -0.11);
        break;
      case 'cuttingboard':
        box(g,0.6,0.035,0.44,palette.lightwood,0,0.92,0);box(g,0.25,0.012,0.065,palette.steel,0.06,0.946,0.02);box(g,0.13,0.023,0.06,palette.darkwood,-0.13,0.947,0.02);break;
      case 'shelf':case 'bigshelf':{
        const levels=type==='shelf'?3:6,spacing=type==='shelf'?0.45:0.33,top=0.22+(levels-1)*spacing;
        for(const x of [-0.45,0.45])for(const z of [-0.27,0.27])box(g,0.045,top+0.25,0.045,palette.cream,x,(top+0.25)/2,z);
        for(let level=0;level<levels;level++)box(g,0.95,0.045,0.62,palette.cream,0,0.2+level*spacing,0);break;}
      case 'sink':
        cabinet(g); box(g, 0.6, 0.035, 0.5, palette.steelDark, 0, 0.919, 0.04); box(g, 0.45, 0.038, 0.35, material('#768f90'), 0, 0.935, 0.04);
        cyl(g, 0.035, 0.35, palette.steel, 0, 1.07, -0.26, 8); box(g, 0.07, 0.045, 0.24, palette.steel, 0, 1.24, -0.16); break;
      case 'dishwasher': {
        const rackBlue=material('#6d88bc'),rackDark=material('#526b9d');
        for(const x of [-0.32,0.32])for(const z of [-0.26,0.26])box(g,0.07,0.09,0.07,palette.trim,x,0.045,z);
        box(g,0.82,0.71,0.72,palette.cream,0,0.425,0);
        box(g,0.74,0.54,0.025,palette.white,0,0.4,0.372);
        box(g,0.018,0.48,0.03,palette.cream,0.18,0.38,0.39);
        box(g,0.88,0.065,0.79,palette.white,0,0.81,0);
        box(g,0.72,0.025,0.6,rackDark,0,0.855,0);
        for(const x of [-0.35,0.35])box(g,0.035,0.085,0.61,rackBlue,x,0.89,0);
        for(const z of [-0.29,0.29])box(g,0.72,0.085,0.035,rackBlue,0,0.89,z);
        for(let index=0;index<6;index++)box(g,0.018,0.035,0.53,rackBlue,-0.3+index*0.12,0.9,0);
        for(const x of [-0.405,0.405])box(g,0.04,1.62,0.04,palette.steel,x,0.94,-0.33);
        box(g,0.8,0.045,0.04,palette.steel,0,1.73,-0.33);
        const hood=new THREE.Group();hood.name='dishwasher-hood';hood.position.y=0.52;g.add(hood);
        box(hood,0.82,0.07,0.76,palette.white,0,1.225,0);
        for(const x of [-0.375,0.375])box(hood,0.055,0.33,0.7,palette.cream,x,1.025,0);
        for(const z of [-0.325,0.325])box(hood,0.72,0.33,0.05,palette.cream,0,1.025,z);
        box(hood,0.65,0.035,0.025,palette.trim,0,1.04,0.359);
        for(const x of [-0.425,0.425])box(hood,0.04,0.04,0.24,palette.white,x,1.025,0.31);
        box(hood,0.89,0.04,0.04,palette.white,0,1.025,0.43);
        box(g,0.69,0.085,0.022,palette.trim,0,0.73,0.384);
        for(const [index,buttonColor] of ['#cd6861','#d4b64e','#6e9b79','#6b91ba'].entries())box(g,0.062,0.037,0.025,material(buttonColor),-0.18+index*0.12,0.735,0.407);
        box(g,0.59,0.018,0.012,palette.steelDark,0,0.655,0.395);
        const washProgress=box(g,1,0.018,0.016,rackBlue,-0.29,0.655,0.404);washProgress.name='dishwasher-progress';washProgress.scale.x=0.001;washProgress.visible=false;
        break;
      }
      case 'fryer':
        box(g,0.64,0.25,0.47,palette.steel,0,1.025,0);box(g,0.56,0.035,0.39,palette.black,0,1.158,0);box(g,0.48,0.016,0.31,material('#9b8248'),0,1.18,0);
        for(const x of [-0.16,0,0.16])box(g,0.012,0.02,0.28,palette.steelDark,x,1.2,0);
        box(g,0.56,0.14,0.075,palette.cream,0,1.25,-0.24);for(const x of [-0.18,0.18]){cyl(g,0.032,0.025,palette.black,x,1.334,-0.24,8);box(g,0.035,0.035,0.25,palette.black,x,1.22,0.25);}break;
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
        if(connections?.length>=2){
          for(const {x,z} of connections){const r=x===0?Math.PI/2:0;brickwork(g,0.05,2.56,0.5,x*0.25,z*0.25,r);wallTrim(g,0.5,x*0.25,z*0.25,r);}
        }else{
          const r=connections?.[0]?.z?Math.PI/2:0;
          brickwork(g,0.05,2.56,1,0,0,r);wallTrim(g,1,0,0,r);
        }break;
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
    if(['window','door'].includes(type))for(const connection of connections||[])if(connection.z)wallArm(g,type,connection.z);
    if(!modelBaseHeights.has(type))modelBaseHeights.set(type,new THREE.Box3().setFromObject(g).min.y);
    return g;
  }

  scene.add(new THREE.HemisphereLight('#eee4e3', '#716c59', 2));
  const sun = new THREE.DirectionalLight('#fff0e7', 1.55);
  sun.position.set(-14, 30, 15); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -27, right: 27, top: 27, bottom: -27, near: 1, far: 80 });
  sun.shadow.normalBias = 0.025; sun.shadow.bias = -0.00005; sun.shadow.radius = 3; sun.target.position.set(12, 0, 12);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#e3ddeb', 0.4); fill.position.set(20, 12, -15); scene.add(fill);

  const world = new THREE.Group(); scene.add(world);
  const grass = material('#767551', { roughness: 1 });
  box(world, 120, 0.18, 120, grass, 12, -0.19, 12);
  box(world, 24, 0.16, 24, grass, 12, -0.05, 12);
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
  function tileMaterial(tile,mode=view) {
    if (mode === 'hygiene') return material(Number(game?.stats?.cleanliness ?? 100) > 60 ? '#a4be8d' : '#c79377');
    if (mode === 'decor') return material(((tile.x * 7 + tile.z * 3) % 5) ? '#b6c694' : '#d0cc9e');
    if(tile.style==='peach')return peachMaterial;
    const base = floorColors[tile.style] || floorColors.wood;
    const col = new THREE.Color(base); const variance = ((tile.x * 13 + tile.z * 19) % 7 - 3) * 0.008;
    if (['checker','tile','tiles','kitchen'].includes(tile.style) && (tile.x + tile.z) % 2) col.multiplyScalar(tile.style === 'checker' ? 0.49 : 0.92); else col.offsetHSL(0,0,variance);
    return material(`#${col.getHexString()}`);
  }
  function floorTile(tile,structure=new Set(),mode=view){
    const group=new THREE.Group();group.position.set(tile.x+0.5,0,tile.z+0.5);group.userData={tile:{x:tile.x,z:tile.z}};
    const west=structure.has(cellKey(tile.x-1,tile.z))?0.5:0,east=structure.has(cellKey(tile.x+1,tile.z))?0.5:0;
    const north=structure.has(cellKey(tile.x,tile.z-1))?0.5:0,south=structure.has(cellKey(tile.x,tile.z+1))?0.5:0;
    const peach=tile.style==='peach',base=box(group,(peach?1:0.996)+west+east,0.085,(peach?1:0.996)+north+south,tileMaterial(tile,mode),(east-west)/2,0.05,(south-north)/2);
    if(peach){
      const positions=base.geometry.attributes.position,uv=base.geometry.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setXY(i,positions.getX(i)+base.position.x+tile.x+0.5,(positions.getZ(i)+base.position.z+tile.z+0.5)/4);
    }else if((tile.style==='wood'||!tile.style)&&mode!=='decor'&&mode!=='hygiene'){
      const seam=material('#9b7957',{transparent:true,opacity:0.38});
      for(const x of [-0.25,0.25])box(group,0.009,0.003,0.995,seam,x,0.095,0);
      box(group,0.495,0.003,0.009,seam,-0.25,0.096,(tile.x+tile.z)%2?0.2:-0.22);
    }
    return group;
  }
  function syncFloors() {
    const tiles=game?.floors || [];
    const structure=new Set((game?.objects||[]).filter(data=>architectural(data.type)).map(data=>cellKey(data.x,data.z)));
    const signature = `${view}:${Math.round((game?.stats?.cleanliness || 0)/10)}:${tiles.map(t=>`${t.x},${t.z},${t.style}`).join(';')}:${[...structure].join(';')}`;
    if(signature===floorSignature) return; floorSignature=signature;
    clearChildren(floorLayer); floorMeshes.clear();
    for(const tile of tiles) {
      const group=floorTile(tile,structure);
      floorLayer.add(group); floorMeshes.set(cellKey(tile.x,tile.z),group);
    }
  }
  function surfaceHeight(x,z) { return floorMeshes.has(cellKey(Math.round(x),Math.round(z)))?0.1:0.036; }
  function objectHeight(type,x,z) {
    const surface=surfaceHeight(x,z);
    if(['painting','clock'].includes(type))return surface-(modelBaseHeights.get(type)||0);
    if(surface===0.1)return surface;
    const standingType=['cuttingboard','fryer'].includes(type)?'counter':type;
    return surface-(modelBaseHeights.get(standingType)||0);
  }
  function personHeight(data,group) { const surface=surfaceHeight(data.x,data.z);return surface===0.1?surface:surface-group.userData.baseY; }
  function movingGroup() { return tool?.type==='MOVE'?(game?.objects||[]).filter(data=>data.id===tool.id||data.parentId===tool.id):[]; }
  function wallConnections(data,x=data.x,z=data.z,rotation=data.rotation,ignored=new Set(),structure=new Map((game?.objects||[]).filter(other=>architectural(other.type)).map(other=>[cellKey(other.x,other.z),other]))) {
    const connections=[],r=angle(rotation);
    for(const [dx,dz]of [[-1,0],[1,0],[0,-1],[0,1]]){
      const other=structure.get(cellKey(x+dx,z+dz));
      if(!other||ignored.has(other.id))continue;
      connections.push({x:Math.round(dx*Math.cos(r)-dz*Math.sin(r)),z:Math.round(dx*Math.sin(r)+dz*Math.cos(r))});
    }
    return connections;
  }
  function nearestWall(data) {
    let nearest=null;
    for(const wall of game?.objects||[]){
      if(wall.type!=='wall')continue;
      const nx=Math.round(Math.sin(angle(wall.rotation))),nz=Math.round(Math.cos(angle(wall.rotation)));
      const dx=data.x-wall.x,dz=data.z-wall.z,distance=dx*nx+dz*nz;
      if(Math.abs(distance)>1.6||Math.abs(dx*nz-dz*nx)>0.55)continue;
      if(!nearest||Math.abs(distance)<Math.abs(nearest.distance))nearest={wall,nx,nz,distance};
    }
    return nearest;
  }
  function positionWallArt(group,data) {
    const nearest=nearestWall(data);
    group.position.set(data.x+0.5,objectHeight(data.type,data.x,data.z),data.z+0.5);
    group.rotation.y=angle(data.rotation);group.userData.hostWallId=null;
    if(nearest){
      const side=nearest.distance<0?-1:1,nx=nearest.nx*side,nz=nearest.nz*side;
      const mountDistance=data.type==='clock'?0.55:0.555,shift=mountDistance-Math.abs(nearest.distance);
      group.position.x+=nx*shift;group.position.z+=nz*shift;group.position.y=surfaceHeight(data.x,data.z);
      group.rotation.y=Math.atan2(nx,nz);group.userData.hostWallId=nearest.wall.id;
    }
  }
  function syncObjects() {
    const ids=new Set();
    const structure=new Map((game?.objects||[]).filter(data=>architectural(data.type)).map(data=>[cellKey(data.x,data.z),data]));
    for(const data of [...(game?.objects||[])].sort((a,b)=>Boolean(a.parentId)-Boolean(b.parentId))) {
      const connections=architectural(data.type)?wallConnections(data,data.x,data.z,data.rotation,new Set(),structure):[],height=surfaceHeight(data.x,data.z);
      ids.add(data.id); const signature = [data.type,data.x,data.z,data.rotation,data.color,data.parentId,height,JSON.stringify(connections)].join(':');
      let group=objects.get(data.id);
      if(group?.userData.signature===signature) continue;
      if(group) { clearChildren(group); objectLayer.remove(group); }
      group=model(data.type,data.color,connections); group.position.set(data.x+0.5,objectHeight(data.type,data.x,data.z),data.z+0.5); group.rotation.y=angle(data.rotation);
      group.userData={objectId:data.id,signature,data}; objectLayer.add(group); objects.set(data.id,group);
    }
    for(const [id,group] of objects) if(!ids.has(id)) { clearChildren(group); objectLayer.remove(group); objects.delete(id); }
    for(const group of objects.values()) {
      const data=group.userData.data;
      if(!['painting','clock'].includes(data.type)) continue;
      positionWallArt(group,data);
    }
  }
  function syncDishwashers() {
    const appliances=(game?.objects||[]).filter(data=>data.type==='dishwasher');
    const signature=JSON.stringify(appliances.map(data=>[data.id,data.washProgress,objects.get(data.id)?.userData.signature]));
    if(dishwasherGame===game&&dishwasherSignature===signature)return;
    dishwasherGame=game;dishwasherSignature=signature;
    if(!appliances.length)return;
    for(const machine of getSupplies(game).dishwashers||[]){
      const group=objects.get(machine.id),hood=group?.getObjectByName('dishwasher-hood'),progress=group?.getObjectByName('dishwasher-progress');
      if(hood)hood.position.y=machine.washing?0:0.52;
      if(progress){progress.visible=machine.washing>0;progress.scale.x=Math.max(0.001,machine.progress*0.58);progress.position.x=-0.29+machine.progress*0.29;}
    }
  }
  function personModel(data,isStaff=true) {
    const g=new THREE.Group(), body=new THREE.Group(); g.add(body);
    const seed=String(data.name||data.id||'Guest').split('').reduce((sum,c)=>sum+c.charCodeAt(0),0);
    const skin=material(['#e3b696','#c69478','#9f7157','#edd0b0'][seed%4]);
    const lightUniform=isStaff&&seed%3===0;
    const shirt=material(isStaff?(lightUniform?'#e5ded8':'#3d3b4b'):['#bb7772','#8b9676','#8e7891','#b1a181','#819b9b','#bf925f'][seed%6]);
    const sleeve=isStaff?material('#e5ded8'):shirt;
    const trousers=material(isStaff?(lightUniform?'#e3dcd5':'#393b4b'):['#565863','#817063','#687978'][seed%3]);
    const shoe=material(isStaff?'#302d39':'#494047');
    function oval(parent,w,h,d,mat,x=0,y=0,z=0){
      const mesh=addMesh(parent,new THREE.SphereGeometry(1,12,8),mat,x,y,z);mesh.scale.set(w/2,h/2,d/2);return mesh;
    }
    function segment(parent,length,radius,mat){
      return addMesh(parent,new THREE.CapsuleGeometry(radius,length-radius*2,3,10),mat,0,-length/2,0);
    }
    function joint(parent,x,y,z=0){const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);return group;}
    const torsoPoints=[[0,0.96],[0.15,0.96],[0.16,1.04],[0.18,1.18],[0.205,1.30],[0.20,1.35],[0.155,1.40],[0.08,1.42],[0,1.42]].map(([r,y])=>new THREE.Vector2(r,y));
    const torso=addMesh(body,new THREE.LatheGeometry(torsoPoints,12),shirt);torso.scale.z=0.65;
    oval(body,0.34,0.22,0.25,trousers,0,0.89);
    cyl(body,0.057,0.11,skin,0,1.435,0,10);
    const leftLeg=joint(body,-0.095,0.88),rightLeg=joint(body,0.095,0.88);
    const lowerLegs=[],feet=[];
    for(const leg of [leftLeg,rightLeg]){
      segment(leg,0.40,0.073,trousers).scale.z=0.87;
      const knee=joint(leg,0,-0.40);segment(knee,0.36,0.06,trousers).scale.z=0.9;lowerLegs.push(knee);
      const foot=joint(knee,0,-0.36);feet.push(foot);
      oval(foot,0.15,0.11,0.27,shoe,0,-0.065,0.055);
      box(foot,0.135,0.025,0.245,shoe,0,-0.1075,0.05);
    }
    const head=joint(body,0,1.565);
    oval(head,0.27,0.31,0.275,skin);
    oval(head,0.04,0.055,0.045,skin,0,-0.014,0.137);
    for(const x of [-1,1]){
      oval(head,0.038,0.07,0.048,skin,x*0.137,-0.005,-0.005);
      oval(head,0.012,0.018,0.012,palette.black,x*0.05,0.018,0.130);
    }
    const hairMaterial=material(['#514039','#a17a51','#36353a','#82766c'][seed%4]);
    const hair=addMesh(head,new THREE.SphereGeometry(0.155,12,8,0,TAU,0,Math.PI/2),hairMaterial,0,0.045,-0.012);hair.scale.y=0.86;
    const hairStyle=Math.floor(seed/4)%4;
    if(hairStyle===0){const swept=oval(head,0.25,0.09,0.245,hairMaterial,-0.012,0.139,-0.012);swept.rotation.z=-0.15;}
    else if(hairStyle===1){
      oval(head,0.265,0.26,0.12,hairMaterial,0,-0.012,-0.10);
      for(const x of [-0.124,0.124])oval(head,0.052,0.20,0.115,hairMaterial,x,-0.025,-0.025);
    }else if(hairStyle===2)oval(head,0.14,0.14,0.14,hairMaterial,0,0.055,-0.16);
    else oval(head,0.24,0.075,0.19,hairMaterial,0,0.14,-0.045);
    const leftArm=joint(body,-0.235,1.32,0.015),rightArm=joint(body,0.235,1.32,0.015),forearms=[];
    for(const arm of [leftArm,rightArm]){
      segment(arm,0.30,0.065,sleeve);
      const elbow=joint(arm,0,-0.30);forearms.push(elbow);segment(elbow,0.24,0.049,skin);
      oval(elbow,0.086,0.13,0.076,skin,0,-0.285,0);
    }
    for(const x of [-1,1]){const collar=box(body,0.07,0.08,0.022,isStaff?palette.white:shirt,x*0.055,1.385,0.083);collar.rotation.z=x*0.42;}
    if(isStaff) {
      const apron=lightUniform?material('#e2d6ce'):material('#343447');
      const front=addMesh(body,new THREE.LatheGeometry([[0.158,0.93],[0.175,1.02],[0.193,1.19],[0.19,1.27]].map(([r,y])=>new THREE.Vector2(r,y)),10,-1,2),apron);front.scale.z=0.69;
      for(const x of [-0.10,0.10]){const strap=box(body,0.034,0.15,0.018,apron,x,1.33,0.103);strap.rotation.z=-x*2;}
      const belt=cyl(body,0.166,0.045,material('#83505a'),0,1.01,0,12);belt.scale.z=0.68;
    }else{
      for(const y of [1.18,1.29])oval(body,0.015,0.015,0.012,palette.cream,0,y,0.124);
    }
    const carried=joint(forearms[1],0,-0.285,0.04);carried.rotation.x=Math.PI/2;carried.visible=false;
    const indicator=new THREE.Group(); indicator.position.y=2.02; g.add(indicator);
    const token=cyl(indicator,0.12,0.035,material('#e3c982'),0,0,0,12); token.rotation.x=Math.PI/2; indicator.visible=false;
    const baseY=new THREE.Box3().setFromObject(body).min.y;
    g.userData={objectId:data.id,data,isStaff,seed,body,head,leftLeg,rightLeg,leftArm,rightArm,lowerLegs,feet,forearms,carried,indicator,baseY,appearance:`${data.name}:${isStaff}`};return g;
  }
  function makePerson(data,isStaff){
    const group=personModel(data,isStaff);group.position.set(data.x+0.5,personHeight(data,group),data.z+0.5);peopleLayer.add(group);return group;
  }
  function syncPeople() {
    const ids=new Set();
    for(const data of [...(game?.staff || []),...(game?.guests || [])]) {
      ids.add(data.id); let group=people.get(data.id);
      if(group&&group.userData.appearance!==`${data.name}:${Boolean(data.role)}`){clearChildren(group);peopleLayer.remove(group);people.delete(data.id);group=null;}
      if(!group) { group=makePerson(data,Boolean(data.role)); people.set(data.id,group); }
      group.userData.data=data;
    }
    for(const [id,group] of people) if(!ids.has(id)) { clearChildren(group); peopleLayer.remove(group); people.delete(id); }
  }
  function syncTableProps() {
    if(game?.supplies){for(const group of tableProps.values()){clearChildren(group);propsLayer.remove(group);}tableProps.clear();return;}
    const dining=new Set((game?.guests||[]).filter(p=>['eating','served','dining'].includes(String(p.state).toLowerCase())).map(p=>p.tableId));
    for(const [id,entry] of tableProps) if(!dining.has(id)||!objects.has(id)) { clearChildren(entry); propsLayer.remove(entry); tableProps.delete(id); }
    for(const id of dining) if(!tableProps.has(id)&&objects.has(id)) { const o=objects.get(id), g=new THREE.Group(); plate(g,0.18,0.95,0.13); g.position.copy(o.position); propsLayer.add(g); tableProps.set(id,g); }
  }
  function removeProp(map,id){const group=map.get(id);if(group){group.parent?.remove(group);clearChildren(group);map.delete(id);}}
  function syncSupplies(){
    const supplies=game?.supplies;
    if(!supplies){for(const id of stockProps.keys())removeProp(stockProps,id);for(const id of wareProps.keys())removeProp(wareProps,id);return;}
    const storageIds=new Set();
    for(const data of game.objects||[]){
      if(!['shelf','bigshelf','fridge'].includes(data.type))continue;
      storageIds.add(data.id);const parent=objects.get(data.id);if(!parent)continue;
      const rows=(supplies.stocks||[]).filter(row=>row.storageId===data.id).sort((a,b)=>a.ingredientId.localeCompare(b.ingredientId));
      const signature=JSON.stringify(rows.map(row=>[row.ingredientId,row.quantity]));
      if(stockProps.get(data.id)?.userData.signature===signature&&stockProps.get(data.id).parent===parent)continue;
      removeProp(stockProps,data.id);const group=new THREE.Group();let index=0;
      for(const row of rows)for(let unit=0;unit<row.quantity;unit++){
        const crate=ingredientModel(row.ingredientId),fridge=data.type==='fridge',level=Math.floor(index/4);
        crate.scale.setScalar(fridge?0.72:0.9);crate.position.set((index%4-1.5)*(fridge?0.17:0.22),fridge?0.265+level*0.46:0.225+level*(data.type==='shelf'?0.45:0.33),0);
        group.add(crate);index++;
      }
      group.userData.signature=signature;parent.add(group);stockProps.set(data.id,group);
    }
    for(const id of stockProps.keys())if(!storageIds.has(id))removeProp(stockProps,id);
    const wareIds=new Set(),cleanIndices=new Map(),locationIndices=new Map(),rackIndices=new Map();
    for(const unit of supplies.ware||[]){
      wareIds.add(unit.id);let parent=null,recipeId=null,position=new THREE.Vector3(),scale=1,tilt=0;
      const dirty=['dirty','carriedDirty','washing','rackDirty','rackWashing'].includes(unit.state);
      if(unit.state==='clean'){
        parent=objects.get(unit.storageId);const index=cleanIndices.get(unit.storageId)||0;cleanIndices.set(unit.storageId,index+1);position.set(-0.15,0.19+index*0.022,0);scale=0.7;
      }else if(['carriedMeal','carriedDirty','carriedClean'].includes(unit.state)){
        parent=people.get(unit.staffId)?.userData.carried;scale=0.9;
        if(unit.state==='carriedMeal')recipeId=(game.orders||[]).find(order=>order.id===unit.orderId)?.recipeId||null;
      }else if(['rackDirty','rackWashing','rackClean'].includes(unit.state)){
        parent=objects.get(unit.dishwasherId);const index=rackIndices.get(unit.dishwasherId)||0;rackIndices.set(unit.dishwasherId,index+1);
        const upright=['plate','pan'].includes(unit.type);scale=unit.type==='pan'?0.5:upright?0.88:0.72;tilt=upright?Math.PI/2:0;
        position.set(-0.24+index*0.12,upright?1.01:0.87,index%2?0.11:-0.08);
      }else if(unit.state==='guest'){
        const guest=(game.guests||[]).find(actor=>actor.id===unit.guestId);parent=objects.get(guest?.tableId);
        const seat=objects.get(guest?.seatId)?.userData.data,table=parent?.userData.data,r=angle(table?.rotation);
        const dx=(seat?.x??table?.x??0)-(table?.x??0),dz=(seat?.z??table?.z??0)-(table?.z??0);
        position.set((dx*Math.cos(r)-dz*Math.sin(r))*0.27,0.845,(dx*Math.sin(r)+dz*Math.cos(r))*0.27);scale=0.9;recipeId=guest?.recipeId||guest?.mealRecipeId||null;
      }else{
        const order=unit.state==='order'?(game.orders||[]).find(entry=>entry.id===unit.orderId):null;
        const locationId=order?.sourceId||unit.locationId||unit.sinkId;parent=objects.get(locationId);
        const type=parent?.userData.data?.type,index=locationIndices.get(locationId)||0;locationIndices.set(locationId,index+1);
        position.set(unit.state==='washing'?0:0.18, type==='table'?0.845:type==='fryer'?1.22:0.95,unit.state==='washing'?0.04:0.2);position.y+=index*0.028;
        if(order?.state==='ready')recipeId=order.recipeId;
      }
      if(!parent){removeProp(wareProps,unit.id);continue;}
      const signature=JSON.stringify([unit.type,unit.state,unit.storageId,unit.orderId,unit.staffId,unit.guestId,unit.locationId,unit.sinkId,unit.dishwasherId,recipeId,position.toArray(),scale,tilt]);
      const previous=wareProps.get(unit.id);if(previous?.userData.signature===signature&&previous.parent===parent)continue;
      removeProp(wareProps,unit.id);const group=wareModel(unit.type,{dirty,recipeId});group.position.copy(position);group.scale.setScalar(scale);group.rotation.z=tilt;
      if(unit.state==='washing')for(let i=0;i<3;i++)sphere(group,0.035,palette.white,(i-1)*0.06,0.08,0.02);
      group.userData.signature=signature;parent.add(group);wareProps.set(unit.id,group);
    }
    for(const id of wareProps.keys())if(!wareIds.has(id))removeProp(wareProps,id);
  }
  function validCell(x,z) {
    const l=game?.land || {minX:0,maxX:23,minZ:0,maxZ:23};
    if(x<l.minX || x>l.maxX || z<l.minZ || z>l.maxZ) return false;
    if(tool?.type==='FLOOR') return true;
    if(tool?.type==='LAND') return true;
    const moving=movingGroup(),ignored=new Set(moving.map(data=>data.id));
    const occupant=(game?.objects||[]).find(o=>!ignored.has(o.id)&&o.x===x&&o.z===z);
    const relocating=tool?.type==='MOVE',source=moving.find(data=>data.id===tool.id);
    const supported=['PLACE','MOVE'].includes(tool?.type)&&['cuttingboard','fryer'].includes(tool.itemType);
    if(relocating&&source){
      const support=supported?(game.objects||[]).find(o=>o.type==='counter'&&o.x===x&&o.z===z):null;
      const nextRotation=support?support.rotation:rotation;
      if(source.x===x&&source.z===z&&source.rotation===nextRotation)return true;
      if([...(game.staff||[]),...(game.guests||[])].some(actor=>Math.round(actor.x)===x&&Math.round(actor.z)===z))return false;
    }
    if(supported){
      const counter=(game?.objects||[]).find(o=>o.type==='counter'&&o.x===x&&o.z===z);
      return Boolean(counter)&&!(game.objects||[]).some(o=>o.parentId===counter.id&&!ignored.has(o.id));
    }
    if(tool?.type==='HIRE')return !occupant||occupant.type==='door';
    if(tool?.type==='PLACE'&&['wall','window','door'].includes(tool.itemType)){
      if(tool.itemType==='door'&&['wall','window'].includes(occupant?.type))return true;
      return !occupant || occupant.type===tool.itemType;
    }
    return !occupant;
  }
  function cloneForGhost(data) {
    const source=objects.get(data.id);
    if(!source)return model(data.type,data.color);
    const group=source.clone(true);
    group.position.set(0,0,0);group.rotation.set(0,0,0);group.scale.set(1,1,1);group.visible=true;
    group.traverse(node=>{if(node.geometry){node.geometry=node.geometry.clone();geometries.add(node.geometry);}});
    return group;
  }
  function rebuildGhost() {
    const moving=movingGroup(),source=moving.find(data=>data.id===tool?.id),isStructure=source&&architectural(source.type);
    let next=tool?.type==='PLACE'?tool.itemType:tool?.type==='HIRE'?`hire:${tool.candidateId}:${tool.candidate?.name}`:null;
    if(source){
      const models=moving.map(data=>{const group=objects.get(data.id);return `${group?.uuid}:${group?.children.map(child=>child.uuid).join(',')}`;}).join(';');
      next=`move:${source.id}:${models}${isStructure?`:${hover?.x}:${hover?.z}:${rotation}:${floorSignature}`:''}`;
    }
    if(next===ghostType && ghost?.userData.color===tool?.color) return;
    if(ghost) { clearChildren(ghost); scene.remove(ghost); ghost=null; }
    ghostType=next;
    if(next) {
      if(source){
        ghost=isStructure?model(source.type,source.color,wallConnections(source,hover?.x??source.x,hover?.z??source.z,rotation,new Set(moving.map(data=>data.id)))):cloneForGhost(source);
        for(const child of moving.filter(data=>data.id!==source.id))ghost.add(cloneForGhost(child));
      }else ghost=tool.type==='HIRE'?personModel(tool.candidate||{id:tool.candidateId,name:'Employee'},true):model(tool.itemType,tool.color);
      ghost.userData.color=tool.color;
      ghost.traverse(n=>{if(n.isMesh){n.material=material(tool.type==='HIRE'?`#${n.material.color.getHexString()}`:'#8fc695',{transparent:true,opacity:0.58,depthWrite:false,roughness:0.7});n.castShadow=false;}});
      scene.add(ghost);
    }
  }
  function updateHoverVisual() {
    rebuildGhost();
    const cell=hover;
    cursor.visible=Boolean(cell && tool); if(cell) cursor.position.set(cell.x+0.5,surfaceHeight(cell.x,cell.z)+0.02,cell.z+0.5);
    if(ghost) {
      ghost.visible=Boolean(cell)&&!strokeLayer.visible;
      if(cell) {
        const host=objects.get(cell.objectId)?.userData.data;
        const doorHost=tool?.type==='PLACE'&&tool.itemType==='door'&&['wall','window'].includes(host?.type);
        const supportHost=['cuttingboard','fryer'].includes(tool?.itemType)?(game?.objects||[]).find(o=>o.type==='counter'&&o.x===cell.x&&o.z===cell.z):null;
        const height=tool.type==='HIRE'?personHeight(cell,ghost):objectHeight(tool.itemType,cell.x,cell.z);
        ghost.position.set(cell.x+0.5,height,cell.z+0.5);ghost.rotation.y=angle(doorHost?host.rotation:supportHost?supportHost.rotation:rotation);
        if(['painting','clock'].includes(tool.itemType)){
          positionWallArt(ghost,{type:tool.itemType,x:cell.x,z:cell.z,rotation});
          const wall=objects.get(ghost.userData.hostWallId);ghost.visible=ghost.visible&&(!wall||wall.scale.y>0.5);
        }
        const good=validCell(cell.x,cell.z), m=material(good?'#8fc695':'#d67969',{transparent:true,opacity:0.58,depthWrite:false,roughness:0.7});
        if(tool?.type!=='HIRE')ghost.traverse(n=>{if(n.isMesh)n.material=m;});cursor.material=material(good?'#90c8a0':'#d67969',{transparent:true,opacity:0.4,depthWrite:false});
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
      preview.position.set(cell.x+0.5,tool.type==='FLOOR'?0.12:objectHeight(tool.itemType,cell.x,cell.z),cell.z+0.5);preview.rotation.y=stroke.axis==='x'?0:Math.PI/2;strokeLayer.add(preview);
    }
  }
  function pick(event) {
    const rect=renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const ignored=new Set(movingGroup().map(data=>data.id));
    const hits=raycaster.intersectObjects(tool?objectLayer.children:[...objectLayer.children,...peopleLayer.children],true).filter(hit=>{
      for(let node=hit.object;node;node=node.parent) if(!node.visible||ignored.has(node.userData.objectId))return false;
      return true;
    });
    let objectId=null;
    if(hits.length) { let obj=hits[0].object; while(obj&&!obj.userData.objectId)obj=obj.parent; objectId=obj?.userData.objectId; }
    if(!raycaster.ray.intersectPlane(plane,hitPoint))return null;
    const floorHit=raycaster.intersectObjects(floorLayer.children,true)[0];
    if(floorHit)hitPoint.copy(floorHit.point);
    let x=Math.floor(hitPoint.x),z=Math.floor(hitPoint.z);
    const objectData=(objects.get(objectId)||people.get(objectId))?.userData.data;
    const doorHost=tool?.type==='PLACE'&&tool.itemType==='door'&&['wall','window'].includes(objectData?.type);
    const supportTool=['PLACE','MOVE'].includes(tool?.type)&&['cuttingboard','fryer'].includes(tool.itemType);
    const supportHost=supportTool?(objectData?.type==='counter'?objectData:(game?.objects||[]).find(o=>o.id===objectData?.parentId&&o.type==='counter')):null;
    if(objectData&&((!['FLOOR','PLACE','MOVE'].includes(tool?.type))||doorHost||supportHost)){x=Math.floor((supportHost||objectData).x);z=Math.floor((supportHost||objectData).z);}
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

  const thumbnailScene=new THREE.Scene();thumbnailScene.background=new THREE.Color('#dedfda');
  thumbnailScene.add(new THREE.HemisphereLight('#fff7ec','#939b87',2));
  const thumbnailLight=new THREE.DirectionalLight('#fff1dc',2.1);thumbnailLight.position.set(-3,6,5);thumbnailScene.add(thumbnailLight);
  function thumbnail(type,color,floorStyle){
    const style=floorStyle||'wood';let createAsset=null;
    if(type==='floor'&&Object.hasOwn(floorColors,style))createAsset=()=>{const group=new THREE.Group();for(let x=0;x<2;x++)for(let z=0;z<2;z++)group.add(floorTile({x,z,style},new Set(),'isometric'));return group;};
    else if(modelTypes.has(type))createAsset=()=>model(type,color);
    else if(type?.startsWith('ingredient-')&&ingredientTypes.has(type.slice(11)))createAsset=()=>ingredientModel(type.slice(11));
    else if(type?.startsWith('ware-')&&wareTypes.has(type.slice(5)))createAsset=()=>wareModel(type.slice(5));
    else if(type?.startsWith('dish-')&&dishTypes.has(type.slice(5)))createAsset=()=>dishModel(type.slice(5));
    return createAsset?renderThumbnail(JSON.stringify([type,color||null,type==='floor'?style:null]),createAsset):null;
  }
  function personThumbnail(candidate){
    return candidate&&typeof candidate.name==='string'?renderThumbnail(JSON.stringify(['person',candidate.id,candidate.name]),()=>personModel(candidate,true),true):null;
  }
  function renderThumbnail(key,createAsset,portrait=false){
    if(disposed)return null;if(thumbnailCache.has(key))return thumbnailCache.get(key);
    const saved={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),mip:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),clear:renderer.getClearColor(new THREE.Color()),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear,shadows:renderer.shadowMap.enabled};
    const asset=new THREE.Group(),size=160;let shadowMaterial=null;
    try{
      asset.add(createAsset());
      thumbnailScene.add(asset);asset.updateMatrixWorld(true);
      const framedAsset=portrait?asset.children[0].userData.body:asset;
      let bounds=new THREE.Box3().setFromObject(framedAsset);asset.position.y-=bounds.min.y;asset.updateMatrixWorld(true);bounds=new THREE.Box3().setFromObject(framedAsset);
      if(portrait)bounds.min.y=Math.max(bounds.min.y,bounds.max.y-0.8);
      const center=bounds.getCenter(new THREE.Vector3()),extent=bounds.getSize(new THREE.Vector3()),span=Math.max(extent.x,extent.y,extent.z,0.5);
      if(!portrait){shadowMaterial=new THREE.MeshBasicMaterial({color:'#6f746c',transparent:true,opacity:0.13,depthWrite:false});const shadow=addMesh(asset,new THREE.CircleGeometry(Math.max(extent.x,extent.z)*0.42,24),shadowMaterial,center.x,-asset.position.y-0.012,center.z);shadow.rotation.x=-Math.PI/2;}
      const iconCamera=new THREE.OrthographicCamera(-2,2,2,-2,0.1,100);iconCamera.position.copy(center).add((portrait?new THREE.Vector3(0.5,0.25,4.5):new THREE.Vector3(3.6,2.8,4.5)).multiplyScalar(span));iconCamera.lookAt(center);iconCamera.updateMatrixWorld(true);
      let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
      for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
        const point=new THREE.Vector3(x,y,z).applyMatrix4(iconCamera.matrixWorldInverse);minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);
      }
      const half=Math.max(maxX-minX,maxY-minY)*0.62,cx=(minX+maxX)/2,cy=(minY+maxY)/2;
      iconCamera.left=cx-half;iconCamera.right=cx+half;iconCamera.top=cy+half;iconCamera.bottom=cy-half;iconCamera.updateProjectionMatrix();
      if(!thumbnailTarget){thumbnailTarget=new THREE.WebGLRenderTarget(size,size,{depthBuffer:true,samples:4});thumbnailTarget.texture.colorSpace=THREE.SRGBColorSpace;}
      renderer.autoClear=true;renderer.shadowMap.enabled=false;renderer.setRenderTarget(thumbnailTarget);renderer.setScissorTest(false);renderer.setClearColor('#dedfda',1);renderer.render(thumbnailScene,iconCamera);
      const pixels=new Uint8Array(size*size*4);renderer.readRenderTargetPixels(thumbnailTarget,0,0,size,size,pixels);
      const output=document.createElement('canvas');output.width=size;output.height=size;const context=output.getContext('2d');if(!context)throw new Error('A 2D canvas is unavailable for the catalog preview.');
      const image=context.createImageData(size,size);for(let row=0;row<size;row++)image.data.set(pixels.subarray((size-1-row)*size*4,(size-row)*size*4),row*size*4);context.putImageData(image,0,0);
      const url=output.toDataURL('image/png');thumbnailCache.set(key,url);return url;
    }catch(error){console.warn(`Catalog preview could not render ${key}.`,error);thumbnailCache.set(key,null);return null;}
    finally{
      thumbnailScene.remove(asset);clearChildren(asset);shadowMaterial?.dispose();
      renderer.autoClear=saved.autoClear;renderer.shadowMap.enabled=saved.shadows;renderer.setClearColor(saved.clear,saved.alpha);renderer.setViewport(saved.viewport);renderer.setScissor(saved.scissor);renderer.setScissorTest(saved.scissorTest);renderer.setRenderTarget(saved.target,saved.face,saved.mip);
    }
  }

  function animate() {
    if(disposed)return;
    const now=performance.now(), dt=Math.min((now-lastTime)/1000,0.06);lastTime=now;
    const elapsed=(now-startedAt)/1000;
    for(const group of people.values()) {
      const u=group.userData,d=u.data, tx=Number(d.x)+0.5,tz=Number(d.z)+0.5;
      const dx=tx-group.position.x,dz=tz-group.position.z,distance=Math.hypot(dx,dz),moving=distance>0.025;
      const ground=personHeight(d,group);
      if(distance>4)group.position.set(tx,ground,tz);
      else if(moving) { const lerp=1-Math.exp(-dt*10);group.position.x+=dx*lerp;group.position.z+=dz*lerp;group.rotation.y=Math.atan2(dx,dz); }
      group.position.y+=(ground-group.position.y)*(1-Math.exp(-dt*14));
      const state=String(d.state||d.task||'').toLowerCase(),sit=!u.isStaff&&['waiting','ordered','eating','waitingfood','waiting_food','served','dining'].includes(state);
      if(sit){const table=objects.get(d.tableId)?.userData.data;if(table)group.rotation.y=Math.atan2(table.x-d.x,table.z-d.z);}
      const walk=moving&&!sit&&game?.speed!==0?Math.sin(elapsed*8+u.seed)*0.38:0;
      u.leftLeg.rotation.x=sit?-1.12:walk;u.rightLeg.rotation.x=sit?-1.12:-walk;
      u.lowerLegs[0].rotation.x=sit?1.12:Math.max(0,-walk)*0.6;u.lowerLegs[1].rotation.x=sit?1.12:Math.max(0,walk)*0.6;
      const footHeights=[u.leftLeg,u.rightLeg].map((leg,index)=>{
        const bend=leg.rotation.x+u.lowerLegs[index].rotation.x;u.feet[index].rotation.x=-bend;
        return 0.88-0.40*Math.cos(leg.rotation.x)-0.36*Math.cos(bend)-0.12;
      });
      u.body.position.y=sit?-0.225:-Math.min(...footHeights);
      u.leftArm.rotation.x=sit?-0.8:-walk*0.6;u.rightArm.rotation.x=sit?-0.8:walk*0.6;
      for(const arm of u.forearms)arm.rotation.x=sit?0.8-Math.PI/2:-0.08;
      u.carried.visible=u.isStaff&&u.carried.children.length>0;
      if(u.carried.visible){u.rightArm.rotation.x=-0.15;u.forearms[1].rotation.x=0.15-Math.PI/2;}
      u.indicator.visible=!u.isStaff&&(/wait|order|unhappy/.test(state));u.indicator.position.y=2.02+u.body.position.y+Math.sin(elapsed*2+u.seed)*0.025;u.indicator.rotation.copy(camera.rotation);
    }
    renderer.render(scene,camera);frame=requestAnimationFrame(animate);
  }
  frame=requestAnimationFrame(animate);

  return {
    update(nextGame) { if(disposed)return;game=nextGame;syncLand();syncFloors();syncObjects();syncDishwashers();syncPeople();syncTableProps();syncSupplies();updateCutaway();updateHoverVisual(); },
    setTool(nextTool) { onCancel();tool=nextTool;rebuildGhost();canvas.style.cursor=tool?'crosshair':'default';updateHoverVisual(); },
    setRotation(value) { rotation=Number(value)||0;updateHoverVisual(); },
    setView(nextView) { view=['top','decor','hygiene'].includes(nextView)?nextView:'isometric';floorSignature='';syncFloors();updateCamera(); },
    setWallMode(nextMode){wallMode=['full','cutaway','low'].includes(nextMode)?nextMode:'full';updateCamera();updateHoverVisual();},
    pan(dx,dz){target.x=clamp(target.x+(Number(dx)||0),-4,28);target.z=clamp(target.z+(Number(dz)||0),-4,28);updateCamera();},
    rotate(delta) { azimuth+=Number(delta)||0;updateCamera(); },
    zoom(delta) { zoomLevel=clamp(zoomLevel+(Number(delta)||0),0.55,2.8);updateCamera(); },
    resize,
    thumbnail,
    personThumbnail,
    screenPosition(x,z) { const p=new THREE.Vector3(x+0.5,surfaceHeight(x,z),z+0.5).project(camera);return {x:(p.x+1)*width/2,y:(1-p.y)*height/2}; },
    dispose() {
      if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();onCancel();
      for(const[name,fn]of Object.entries(listeners))canvas.removeEventListener(name,fn);
      for(const geometry of geometries)geometry.dispose();for(const mat of materials.values())mat.dispose();for(const texture of textures)texture.dispose();
      hoverOutline.geometry.dispose();hoverOutline.material.dispose();thumbnailTarget?.dispose();thumbnailCache.clear();renderer.dispose();renderer.forceContextLoss();canvas.remove();
      objects.clear();people.clear();floorMeshes.clear();tableProps.clear();stockProps.clear();wareProps.clear();
    },
  };
}
