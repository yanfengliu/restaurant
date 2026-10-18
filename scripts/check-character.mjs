import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
import * as THREE from 'three';
import {createCharacter, updateCharacter, characterBounds, characterSourceVertex, characterMetrics} from '../src/characters.js';

// Bound: source topology/weight validity and 12 fixed cross-tool landmarks in
// exported prototype poses. This does not judge human anatomy, motion or pixels.
const assetURL=new URL('../src/assets/character.json',import.meta.url);
const asset=JSON.parse(fs.readFileSync(assetURL,'utf8'));
const retained=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/character-poses.json',import.meta.url),'utf8'));
const fixtures=retained.poses;
const pairs=[['shoulderL','chest','upperArmL'],['elbowL','upperArmL','forearmL'],['hipL','pelvis','thighL'],['kneeL','thighL','shinL'],['shoulderR','chest','upperArmR'],['elbowR','upperArmR','forearmR'],['hipR','pelvis','thighR'],['kneeR','thighR','shinR']];

function topologyAndWeights(data){
  const count=data.positions.length/3;
  assert.equal(data.skinIndex.length,count*4);
  assert.equal(data.skinWeight.length,count*4);
  assert(data.positions.every(Number.isFinite));
  assert(data.normals.every(Number.isFinite));
  const adjacency=Array.from({length:count},()=>new Set()),used=new Set(),edges=new Map();
  for(let i=0;i<data.indices.length;i+=3){
    const face=data.indices.slice(i,i+3);
    for(const index of face){assert(Number.isInteger(index)&&index>=0&&index<count);used.add(index);}
    for(let j=0;j<3;j++){
      const a=face[j],b=face[(j+1)%3];adjacency[a].add(b);adjacency[b].add(a);
      const key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)||0)+1);
    }
  }
  const unseen=new Set(used),components=[];
  while(unseen.size){
    const first=unseen.values().next().value,stack=[first];unseen.delete(first);let size=0;
    while(stack.length){size++;for(const next of adjacency[stack.pop()])if(unseen.delete(next))stack.push(next);}
    components.push(size);
  }
  assert.equal(components.length,1,'deforming body must be connected across joints');
  assert([...edges.values()].every(value=>value===2),'deforming body must have closed two-face edges');
  for(let i=0;i<count;i++){
    let total=0;
    for(let j=0;j<4;j++){
      const index=data.skinIndex[i*4+j],weight=data.skinWeight[i*4+j];
      assert(Number.isInteger(index)&&index>=0&&index<data.bones.length);
      assert(Number.isFinite(weight)&&weight>=0);total+=weight;
    }
    assert(Math.abs(total-1)<0.00001,'every vertex has normalized nonempty skin weights');
  }
  const lowerMaterials=new Set(data.materials.map((mat,index)=>['trousers','shoe'].includes(mat.name)?index:-1));
  const trouserVertices=new Set(data.indices.filter((vertex,i)=>lowerMaterials.has(data.materialSlots[Math.floor(i/3)])));
  const legBones=new Set(['root','pelvis','spine','thighL','thighR','shinL','shinR','footL','footR']);
  for(const vertex of trouserVertices)for(let j=0;j<4;j++){
    const bone=data.bones[data.skinIndex[vertex*4+j]].name,weight=data.skinWeight[vertex*4+j];
    assert(weight<0.00001||legBones.has(bone),`trouser vertex ${vertex} must not follow unrelated upper-body bone ${bone} at weight ${weight}`);
  }
  function weight(vertex,index){let sum=0;for(let j=0;j<4;j++)if(data.skinIndex[vertex*4+j]===index)sum+=data.skinWeight[vertex*4+j];return sum;}
  const support={};
  for(const [label,aName,bName] of pairs){
    const a=data.bones.findIndex(b=>b.name===aName),b=data.bones.findIndex(b=>b.name===bName);
    assert(a>=0&&b>=0);
    const joint=new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(data.bones[b].inverse).invert());
    const neighborhood=new Set(),blend=new Set(),aSide=new Set(),bSide=new Set();
    for(const vertex of used){
      const p=new THREE.Vector3().fromArray(data.positions,vertex*3);
      if(p.distanceTo(joint)>0.19)continue;
      neighborhood.add(vertex);
      const wa=weight(vertex,a),wb=weight(vertex,b);
      if(wa>0.05&&wb>0.05)blend.add(vertex);
      if(wa>0.8)aSide.add(vertex);
      if(wb>0.8)bSide.add(vertex);
    }
    assert(blend.size>=6,`${label} needs a blended surface support region, not rigid detached segments`);
    assert(aSide.size&&bSide.size,`${label} support must span both bones`);
    const visited=new Set(aSide),stack=[...aSide];let reaches=false;
    while(stack.length){
      const vertex=stack.pop();if(bSide.has(vertex)){reaches=true;break;}
      for(const next of adjacency[vertex])if(neighborhood.has(next)&&!visited.has(next)){visited.add(next);stack.push(next);}
    }
    assert(reaches,`${label} has a connected surface path through the support region`);
    support[label]=blend.size;
  }
  return {usedVertices:used.size,triangles:data.indices.length/3,components:components.length,checkedLowerBodyVertices:trouserVertices.size,jointSupport: support};
}

const proof={bound:'Closed connected deforming body, blended shoulder/elbow/hip/knee support, fixed Blender/Three landmark parity; no visual-quality claim.',topology:topologyAndWeights(asset)};
proof.assetSHA256=crypto.createHash('sha256').update(fs.readFileSync(assetURL)).digest('hex');
assert.equal(proof.assetSHA256,retained.provenance.assetSHA256,'runtime asset is the inspected mesh');
const restBounds=new THREE.Box3().setFromBufferAttribute(new THREE.Float32BufferAttribute(asset.positions,3));
for(let axis=0;axis<3;axis++)assert(restBounds.min.getComponent(axis)<=restBounds.max.getComponent(axis),'bounds endpoints are ordered');
proof.restBounds={min:restBounds.min.toArray(),max:restBounds.max.toArray()};
assert(asset.indices.length/3+asset.parts.reduce((n,p)=>n+p.indices.length/3,0)<5000);
assert(asset.bones.length<=24);
assert(fs.statSync(assetURL).size<256*1024);
const exportFlag=process.argv.indexOf('--export');
if(exportFlag>=0){
  assert(process.argv[exportFlag+1],'--export requires the generated output directory');
  const directory=path.resolve(process.argv[exportFlag+1]);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,'character.json'))).digest('hex'),retained.provenance.assetSHA256,'fresh source export reproduces inspected asset bytes');
  const generated=JSON.parse(fs.readFileSync(path.join(directory,'pose-fixtures.json'),'utf8'));
  // JSON serialization normalizes signed zero, which has no spatial meaning.
  assert.deepEqual(JSON.parse(JSON.stringify(generated)),fixtures,'fresh cross-tool pose fixtures reproduce retained expectations');
  const report=JSON.parse(fs.readFileSync(path.join(directory,'report.json'),'utf8'));
  assert.equal(report.bodyTriangles,asset.indices.length/3);
  for(let axis=0;axis<3;axis++){
    assert(report.bodyBounds.min[axis]<=report.bodyBounds.max[axis],'exported bounds endpoints ordered');
    assert(Math.abs(report.bodyBounds.min[axis]-restBounds.min.getComponent(axis))<1e-6);
    assert(Math.abs(report.bodyBounds.max[axis]-restBounds.max.getComponent(axis))<1e-6);
  }
  proof.freshExport='byte-identical asset, identical independent pose fixtures, ordered measured bounds';
}

const bones=asset.bones.map(data=>{
  const bone=new THREE.Bone();bone.name=data.name;
  new THREE.Matrix4().fromArray(data.local).decompose(bone.position,bone.quaternion,bone.scale);
  return bone;
});
for(let i=0;i<bones.length;i++)if(asset.bones[i].parent>=0)bones[asset.bones[i].parent].add(bones[i]);
const geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.Float32BufferAttribute(asset.positions,3));
geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(asset.skinIndex,4));
geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(asset.skinWeight,4));
geometry.setIndex(asset.indices);
const material=new THREE.MeshBasicMaterial();
const mesh=new THREE.SkinnedMesh(geometry,material);
for(let i=0;i<bones.length;i++)if(asset.bones[i].parent<0)mesh.add(bones[i]);
const skeleton=new THREE.Skeleton(bones,asset.bones.map(data=>new THREE.Matrix4().fromArray(data.inverse)));
mesh.updateMatrixWorld(true);mesh.bind(skeleton,new THREE.Matrix4());
try{
  proof.poses={};
  const poseEnvelope=new THREE.Box3();
  for(const required of ['neutral','elbow-0','elbow-45','elbow-90','knee-0','knee-45','knee-90','seated','carry','walk-1','walk-2'])assert(fixtures[required],`${required} fixture exists`);
  for(const [name,fixture] of Object.entries(fixtures)){
    for(let i=0;i<bones.length;i++)new THREE.Matrix4().fromArray(fixture.boneLocal[i]).decompose(bones[i].position,bones[i].quaternion,bones[i].scale);
    mesh.updateMatrixWorld(true);skeleton.update();
    let maxError=0;
    for(const sample of Object.values(fixture.vertices)){
      const actual=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,sample.index);
      mesh.applyBoneTransform(sample.index,actual);
      maxError=Math.max(maxError,actual.distanceTo(new THREE.Vector3().fromArray(sample.position)));
    }
    assert(maxError<0.0002,`${name} Blender/runtime landmark error ${maxError} exceeds 0.0002 world units`);
    proof.poses[name]={landmarks:Object.keys(fixture.vertices).length,maxError};
    for(let index=0;index<geometry.attributes.position.count;index++){
      const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,index);mesh.applyBoneTransform(index,p);poseEnvelope.expandByPoint(p);
    }
  }
  const neutral=fixtures.neutral.boneLocal.map(row=>{const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();new THREE.Matrix4().fromArray(row).decompose(p,q,s);return {p,q,s};});
  for(const fixture of Object.values(fixtures))for(const alpha of [0.25,0.5,0.75]){
    for(let i=0;i<bones.length;i++){
      const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();new THREE.Matrix4().fromArray(fixture.boneLocal[i]).decompose(p,q,s);
      bones[i].position.copy(neutral[i].p).lerp(p,alpha);bones[i].quaternion.copy(neutral[i].q).slerp(q,alpha);bones[i].scale.copy(neutral[i].s).lerp(s,alpha);
    }
    mesh.updateMatrixWorld(true);
    for(let index=0;index<geometry.attributes.position.count;index++){
      const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,index);mesh.applyBoneTransform(index,p);poseEnvelope.expandByPoint(p);
    }
  }
  proof.inspectedPoseEnvelope={min:poseEnvelope.min.toArray(),max:poseEnvelope.max.toArray(),bound:'All body vertices in the 11 exported poses and 33 neutral-to-pose interpolation samples; accessory/ware and unsampled motion require runtime acceptance.'};
}finally{skeleton.dispose();geometry.dispose();material.dispose();}

// Deliberate red controls keep valid normalized weights while reintroducing the
// rigid-joint defect, and keep neutral vertex positions while opening an elbow.
const rigid=structuredClone(asset);
const upper=rigid.bones.findIndex(b=>b.name==='upperArmR'),forearm=rigid.bones.findIndex(b=>b.name==='forearmR');
for(let i=0;i<rigid.positions.length/3;i++){
  const row=rigid.skinIndex.slice(i*4,i*4+4),weights=rigid.skinWeight.slice(i*4,i*4+4);
  if(row.some((bone,j)=>bone===upper&&weights[j]>0.05)&&row.some((bone,j)=>bone===forearm&&weights[j]>0.05)){
    const winner=weights.indexOf(Math.max(...weights));rigid.skinIndex.splice(i*4,4,row[winner],0,0,0);rigid.skinWeight.splice(i*4,4,1,0,0,0);
  }
}
assert.throws(()=>topologyAndWeights(rigid),/elbowR needs a blended surface support region/);
const detached=structuredClone(asset),duplicates=new Map();
function duplicate(index){
  if(!duplicates.has(index)){
    duplicates.set(index,detached.positions.length/3);
    detached.positions.push(...asset.positions.slice(index*3,index*3+3));
    detached.normals.push(...asset.normals.slice(index*3,index*3+3));
    detached.skinIndex.push(...asset.skinIndex.slice(index*4,index*4+4));
    detached.skinWeight.push(...asset.skinWeight.slice(index*4,index*4+4));
  }
  return duplicates.get(index);
}
for(let i=0;i<asset.indices.length;i+=3){
  const vertices=asset.indices.slice(i,i+3),x=vertices.reduce((sum,index)=>sum+asset.positions[index*3],0)/3,y=vertices.reduce((sum,index)=>sum+asset.positions[index*3+1],0)/3;
  if(x>0.23&&y<1.07&&y>0.60)for(let j=0;j<3;j++)detached.indices[i+j]=duplicate(vertices[j]);
}
assert.throws(()=>topologyAndWeights(detached),/deforming body must be connected/);
proof.mutations={rigidElbow:'rejected while weights remain normalized',detachedElbow:'rejected with unchanged neutral vertex positions'};

// These literal rows were retained from the rejected input, before its weight
// classifier was repaired. Material membership supplies independent semantics.
const unrelated=structuredClone(asset),bad=retained.rejectedInput;
assert.equal(bad.assetSHA256,'8b8a72446cd913434c644991033b0daf1f0d777e5cd42e9864ccbe003bb6cc4b');
assert.equal(bad.sourceSHA256,'bc8996306c016b4cb83305407bcfc2029eaa6e5535e10ff81ef7d55136852027');
for(const row of bad.vertices){
  assert.deepEqual(asset.positions.slice(row.index*3,row.index*3+3),row.position);
  assert(Math.abs(row.influences.reduce((n,item)=>n+item.weight,0)-1)<1e-6);
  unrelated.skinIndex.splice(row.index*4,4,...row.influences.map(item=>asset.bones.findIndex(bone=>bone.name===item.bone)));
  unrelated.skinWeight.splice(row.index*4,4,...row.influences.map(item=>item.weight));
}
assert.throws(()=>topologyAndWeights(unrelated),/trouser vertex .* unrelated upper-body bone/);
proof.mutations.unrelatedBone='literal rejected garment weights rejected by all trouser/shoe material vertices';

// Exercise the shipped factory, including seam compilation and head details,
// against independently generated Blender parent-local matrices and landmarks.
const actor=createCharacter({id:'bridge',name:'Bridge'},false),other=createCharacter({id:'other',name:'Other'},true);
try{
  assert.notEqual(actor.userData.skeleton,other.userData.skeleton);
  assert.notEqual(actor.userData.mesh.geometry.attributes.position.array,other.userData.mesh.geometry.attributes.position.array);
  assert.notEqual(actor.userData.mesh.material,other.userData.mesh.material);
  for(const name of Object.keys(actor.userData.bones))assert.notEqual(actor.userData.bones[name],other.userData.bones[name]);
  for(const [name,fixture] of Object.entries(fixtures)){
    actor.userData.body.position.set(0,0,0);
    asset.bones.forEach((bone,i)=>new THREE.Matrix4().fromArray(fixture.boneLocal[i]).decompose(actor.userData.bones[bone.name].position,actor.userData.bones[bone.name].quaternion,actor.userData.bones[bone.name].scale));
    actor.updateMatrixWorld(true);actor.userData.skeleton.update();
    for(const sample of Object.values(fixture.vertices))assert(characterSourceVertex(actor,sample.index).distanceTo(new THREE.Vector3().fromArray(sample.position))<0.0002,`${name} compiled runtime bridge`);
  }
  const support=(x)=>x>0.1?0.1:0.036;
  for(const surface of [0,0.036,0.1])for(const seated of [false,true]){
    actor.position.set(3,surface,4);actor.rotation.y=0.71;
    updateCharacter(actor,{snap:true,seated,support:()=>surface});
    assert(Math.abs(characterBounds(actor).min.y-surface)<0.0001,'actual skin sole touches support');
    if(seated)for(const side of ['L','R']){
      const palm=actor.userData.palms[side].clone().applyMatrix4(actor.userData.bones[`hand${side}`].matrixWorld);
      const expected=actor.localToWorld(new THREE.Vector3(side==='L'?-0.25:0.25,0.868,0.57));
      assert(palm.distanceTo(expected)<0.0002,'guest palm reaches the actual table edge');
      const normal=new THREE.Vector3(0,0,1).transformDirection(new THREE.Matrix4().fromArray(asset.bones.find(bone=>bone.name===`hand${side}`).inverse));
      normal.applyQuaternion(actor.userData.bones[`hand${side}`].getWorldQuaternion(new THREE.Quaternion()));
      assert(normal.dot(new THREE.Vector3(0,-1,0))>0.999,'guest palms face down');
    }
  }
  // Grounding and the conservative raycast/culling sphere cover distance-driven
  // motion, turns, floor changes and the transitions through a lowered pelvis.
  actor.position.set(0,0.036,0);actor.rotation.y=0;
  updateCharacter(actor,{snap:true,support});
  let plantedSamples=0,maxPlantedDrift=0,lastFoot=null;
  for(let frame=0;frame<160;frame++){
    const moving=frame<110,seated=frame>=130;
    const distance=moving?0.012:0;
    actor.position.z+=distance;if(frame===65)actor.rotation.y=0.35;
    updateCharacter(actor,{dt:1/60,distance,moving,seated,support});
    const u=actor.userData,bounds=characterBounds(actor);
    assert(bounds.min.toArray().every(Number.isFinite)&&bounds.max.toArray().every(Number.isFinite));
    for(let index=0;index<u.mesh.geometry.attributes.position.count;index++){
      const point=u.mesh.applyBoneTransform(index,new THREE.Vector3().fromBufferAttribute(u.mesh.geometry.attributes.position,index));
      assert(u.mesh.boundingSphere.containsPoint(point),'runtime body fits conservative posed envelope');
    }
    const foot=u.bones.footL.getWorldPosition(new THREE.Vector3()),planted=u.motion.feet.L.stance&&u.motion.walk>0.995&&!seated;
    if(lastFoot&&planted&&frame<65){maxPlantedDrift=Math.max(maxPlantedDrift,foot.distanceTo(lastFoot));plantedSamples++;}
    lastFoot=planted?foot:null;
  }
  assert(plantedSamples>8&&maxPlantedDrift<0.003,`stance ankle stays planted while actor moves: ${plantedSamples} samples, ${maxPlantedDrift} drift`);
  proof.runtime={...characterMetrics,plantedSamples,maxPlantedDrift};
  const pose=Object.values(actor.userData.bones).flatMap(bone=>[...bone.position.toArray(),...bone.quaternion.toArray()]);
  for(let i=0;i<5;i++)updateCharacter(actor,{dt:1/60,paused:true,seated:true,support});
  assert.deepEqual(Object.values(actor.userData.bones).flatMap(bone=>[...bone.position.toArray(),...bone.quaternion.toArray()]),pose,'paused pose is frozen');
  other.position.set(0,0.1,0);other.userData.carried.add(new THREE.Group());
  updateCharacter(other,{snap:true,support:()=>0.1});other.updateMatrixWorld(true);
  const wareUp=new THREE.Vector3(0,1,0).applyQuaternion(other.userData.carried.getWorldQuaternion(new THREE.Quaternion()));
  assert(wareUp.dot(new THREE.Vector3(0,1,0))>0.999,'hand-bone ware anchor stays level');
  const palm=other.userData.palms.R.clone().applyMatrix4(other.userData.bones.handR.matrixWorld);
  const anchor=other.userData.carried.getWorldPosition(new THREE.Vector3());
  assert(anchor.y>palm.y&&anchor.y-palm.y<0.04,'ware rests above carrying palm');
  // A real skinned triangle raycast resolves to the stable ancestor id.
  const bounds=characterBounds(other),center=bounds.getCenter(new THREE.Vector3());
  const ray=new THREE.Raycaster(center.clone().add(new THREE.Vector3(0,0,3)),new THREE.Vector3(0,0,-1));
  const hits=ray.intersectObject(other,true);assert(hits.length>0);
  let selected=hits.find(hit=>hit.object.isSkinnedMesh)?.object;assert(selected);
  while(selected&&!selected.userData.objectId)selected=selected.parent;
  assert.equal(selected?.userData.objectId,'other');
}finally{actor.userData.disposeCharacter();other.userData.disposeCharacter();}

// Renderer-free lifecycle smoke checks actual disposal events and unique
// ownership. It does not claim WebGL memory or GPU draw-call measurements.
let disposalEvents=0,skeletonDisposals=0;
for(let i=0;i<48;i++){
  const character=createCharacter({id:`preview-${i}`,name:`Preview ${i}`},true),u=character.userData;
  const resources=[u.mesh.geometry,u.mesh.material,u.indicator.children[0].geometry,u.indicator.children[0].material,u.skeleton.boneTexture];
  resources.forEach(resource=>resource.addEventListener('dispose',()=>disposalEvents++));
  const originalDispose=u.skeleton.dispose.bind(u.skeleton);
  u.skeleton.dispose=()=>{skeletonDisposals++;originalDispose();};
  u.disposeCharacter();u.disposeCharacter();assert.equal(u.skeleton.boneTexture,null);
}
assert.equal(disposalEvents,48*5,'each owned geometry/material/bone texture disposed exactly once');
assert.equal(skeletonDisposals,48,'each unique skeleton disposed exactly once');
proof.resourceSmoke={instances:48,ownedDisposalEvents:disposalEvents,skeletonDisposals,geometries:96,materials:96,boneTextures:48,bound:'CPU ownership and disposal requests; browser GPU/resource acceptance remains separate.'};
console.log(JSON.stringify(proof,null,2));

