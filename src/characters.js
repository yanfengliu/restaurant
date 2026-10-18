import * as THREE from 'three';
import asset from './assets/character.json' with { type: 'json' };

const clamp = THREE.MathUtils.clamp;
const up = new THREE.Vector3(0, 1, 0), front = new THREE.Vector3(0, 0, 1);
const rest = asset.bones.map(bone => {
  const matrix = new THREE.Matrix4().fromArray(bone.local);
  const position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
  matrix.decompose(position, quaternion, scale);
  const world = new THREE.Matrix4().fromArray(bone.inverse).invert();
  return { position, quaternion, scale, world, orientation: new THREE.Quaternion().setFromRotationMatrix(world) };
});
const names = Object.fromEntries(asset.bones.map((bone, i) => [bone.name, i]));

// Split only material seams; skin positions, topology and weights stay authored.
// Every actor owns its attributes, skeleton and material, including previews.
const template = (() => {
  const positions = [], normals = [], indices = [], skinIndex = [], skinWeight = [], slots = [], source = [], cache = new Map();
  function append(part, vertex, material, partIndex) {
    const key = `${partIndex}:${vertex}:${material}`;
    if (cache.has(key)) return cache.get(key);
    const index = positions.length / 3; cache.set(key, index);
    positions.push(...part.positions.slice(vertex * 3, vertex * 3 + 3));
    normals.push(...part.normals.slice(vertex * 3, vertex * 3 + 3));
    skinIndex.push(...(partIndex === 0 ? asset.skinIndex.slice(vertex * 4, vertex * 4 + 4) : [part.bone, 0, 0, 0]));
    skinWeight.push(...(partIndex === 0 ? asset.skinWeight.slice(vertex * 4, vertex * 4 + 4) : [1, 0, 0, 0]));
    slots.push(material); source.push(partIndex === 0 ? vertex : -1);
    return index;
  }
  for (let i = 0; i < asset.indices.length; i++) indices.push(append(asset, asset.indices[i], asset.materialSlots[Math.floor(i / 3)], 0));
  asset.parts.forEach((part, i) => { for (const vertex of part.indices) indices.push(append(part, vertex, part.material, i + 1)); });
  const shoes = slots.flatMap((slot, i) => asset.materials[slot].name === 'shoe' ? [i] : []);
  return { positions, normals, indices, skinIndex, skinWeight, slots, source, shoes };
})();

function colors(seed, staff) {
  const light = staff && seed % 3 === 0;
  const palette = {
    shirt: staff ? (light ? '#e5ded8' : '#3d3b4b') : ['#bb7772', '#8b9676', '#8e7891', '#b1a181', '#819b9b', '#bf925f'][seed % 6],
    trousers: staff ? (light ? '#e3dcd5' : '#393b4b') : ['#565863', '#817063', '#687978'][seed % 3],
    skin: ['#e3b696', '#c69478', '#9f7157', '#edd0b0'][seed % 4],
    hair: ['#514039', '#a17a51', '#36353a', '#82766c'][seed % 4],
    shoe: staff ? '#302d39' : '#494047', eye: '#303534', collar: '#eee7dc',
  };
  return template.slots.flatMap((slot, i) => {
    const name = asset.materials[slot].name;
    const sleeve = staff && name === 'shirt' && Math.abs(template.positions[i * 3]) > 0.18 && template.positions[i * 3 + 1] > 1.13;
    return new THREE.Color(sleeve ? '#e5ded8' : palette[name]).toArray();
  });
}

export function createCharacter(data, isStaff = true) {
  const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
  const seed = [...String(data.name || data.id || 'Guest')].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(template.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(template.normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors(seed, isStaff), 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(template.skinIndex, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(template.skinWeight, 4));
  geometry.setIndex(template.indices);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const mesh = new THREE.SkinnedMesh(geometry, material); mesh.castShadow = mesh.receiveShadow = true; body.add(mesh);
  const bones = asset.bones.map((bone, i) => {
    const result = new THREE.Bone(); result.name = bone.name;
    result.position.copy(rest[i].position); result.quaternion.copy(rest[i].quaternion); result.scale.copy(rest[i].scale);
    return result;
  });
  bones.forEach((bone, i) => (asset.bones[i].parent < 0 ? mesh : bones[asset.bones[i].parent]).add(bone));
  const skeleton = new THREE.Skeleton(bones, asset.bones.map(bone => new THREE.Matrix4().fromArray(bone.inverse)));
  mesh.updateMatrixWorld(true); mesh.bind(skeleton, new THREE.Matrix4()); skeleton.computeBoneTexture();
  // This envelope includes the inspected poses, interpolations, and the bounded
  // runtime IK reach. Raycasting still tests the actual skinned triangles.
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.72, 0.20), 1.55);
  mesh.boundingBox = null;
  const carried = new THREE.Group(); carried.visible = false; bones[names.handR].add(carried);
  const palmLocal = rest[names.handR].world.clone().invert().multiply(new THREE.Matrix4().makeTranslation(0.35, 0.777, 0.050));
  carried.position.setFromMatrixPosition(palmLocal);
  const indicator = new THREE.Group(), token = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.035, 12), new THREE.MeshStandardMaterial({ color: '#e3c982' }));
  token.rotation.x = Math.PI / 2; indicator.add(token); indicator.visible = false; group.add(indicator);
  const byName = Object.fromEntries(bones.map(bone => [bone.name, bone]));
  const palms = Object.fromEntries(['L', 'R'].map(side => {
    const sign = side === 'L' ? -1 : 1, index = names[`hand${side}`];
    return [side, new THREE.Vector3(sign * 0.35, 0.777, 0.024).applyMatrix4(rest[index].world.clone().invert())];
  }));
  let disposed = false;
  group.userData = {
    objectId: data.id, data, isStaff, seed, body, mesh, bones: byName, skeleton, carried, indicator, baseY: 0,
    head: byName.head, leftLeg: byName.thighL, rightLeg: byName.thighR,
    leftArm: byName.upperArmL, rightArm: byName.upperArmR,
    lowerLegs: [byName.shinL, byName.shinR], feet: [byName.footL, byName.footR], forearms: [byName.forearmL, byName.forearmR],
    appearance: `${data.name}:${isStaff}`, palms, motion: { initialized: false, cycle: 0.25, walk: 0, seated: 0, feet: {} },
    disposeCharacter() {
      if (disposed) return; disposed = true;
      skeleton.dispose(); geometry.dispose(); material.dispose(); token.geometry.dispose(); token.material.dispose();
    },
  };
  updateCharacter(group, { snap: true });
  group.userData.motion.initialized = false;
  return group;
}

function worldPoint(bone) { return bone.getWorldPosition(new THREE.Vector3()); }
function worldOrientation(bone) { return bone.getWorldQuaternion(new THREE.Quaternion()); }
function setWorldOrientation(bone, orientation) {
  bone.quaternion.copy(worldOrientation(bone.parent).invert().multiply(orientation)); bone.updateWorldMatrix(false, true);
}
function turn(bone, radians, axis = new THREE.Vector3(1, 0, 0)) {
  const index = names[bone.name], localAxis = axis.clone().applyQuaternion(rest[index].orientation.clone().invert());
  bone.quaternion.copy(rest[index].quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(localAxis, radians));
}
function aim(bone, target) {
  const axis = new THREE.Vector3(0, 0, -1).applyQuaternion(worldOrientation(bone));
  const direction = target.clone().sub(worldPoint(bone)).normalize();
  const delta = new THREE.Quaternion().setFromUnitVectors(axis.normalize(), direction);
  setWorldOrientation(bone, delta.multiply(worldOrientation(bone)));
}
function solveLimb(upper, lower, end, target, bend) {
  const origin = worldPoint(upper), a = origin.distanceTo(worldPoint(lower)), b = worldPoint(lower).distanceTo(worldPoint(end));
  const direction = target.clone().sub(origin), distance = clamp(direction.length(), Math.abs(a - b) + 0.0001, a + b - 0.0001); direction.normalize();
  const along = (a * a - b * b + distance * distance) / (2 * distance);
  const normal = bend.clone().addScaledVector(direction, -bend.dot(direction)).normalize();
  const joint = origin.clone().addScaledVector(direction, along).addScaledVector(normal, Math.sqrt(Math.max(0, a * a - along * along)));
  aim(upper, joint); aim(lower, origin.addScaledVector(direction, distance));
}
function palmOrientation(side, direction, normal) {
  const localLong = new THREE.Vector3(0, 0, -1), localNormal = front.clone().applyQuaternion(rest[names[`hand${side}`]].orientation.clone().invert());
  const basis = (long, palm) => {
    const normalAxis = palm.clone().normalize(), sideAxis = normalAxis.clone().cross(long).normalize(), longAxis = sideAxis.clone().cross(normalAxis).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(sideAxis, normalAxis, longAxis));
  };
  return basis(direction, normal).multiply(basis(localLong, localNormal).invert());
}
function twist(bone, angle) { bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, -1), angle)); bone.updateWorldMatrix(false, true); }
function signedPalmTurn(bone, normal) {
  const axis = new THREE.Vector3(0, 0, -1).applyQuaternion(worldOrientation(bone));
  const local = front.clone().applyQuaternion(rest[names[bone.name]].orientation.clone().invert());
  const current = local.applyQuaternion(worldOrientation(bone));
  current.addScaledVector(axis, -current.dot(axis)).normalize();
  const desired = normal.clone().addScaledVector(axis, -normal.dot(axis)).normalize();
  return Math.atan2(axis.dot(current.clone().cross(desired)), current.dot(desired));
}
function armContact(group, side, palm, normal, direction) {
  const u = group.userData, upper = u.bones[`upperArm${side}`], lower = u.bones[`forearm${side}`], hand = u.bones[`hand${side}`];
  const orientation = palmOrientation(side, direction, normal);
  const wrist = palm.clone().sub(u.palms[side].clone().applyQuaternion(orientation));
  solveLimb(upper, lower, hand, wrist, up.clone().negate());
  // Share pronation along the arm rather than collapsing the wrist in one twist.
  twist(upper, signedPalmTurn(lower, normal) * 0.35); aim(lower, wrist);
  twist(lower, signedPalmTurn(lower, normal) * 0.65); setWorldOrientation(hand, orientation);
}

/** Pose only: all simulation coordinates, ids and reservations stay unchanged. */
export function updateCharacter(group, { dt = 0, distance = 0, moving = false, seated = false, tableDistance = 1, paused = false, support = () => group.position.y, snap = false } = {}) {
  const u = group.userData, motion = u.motion, bones = u.bones, carrying = u.isStaff && u.carried.children.length > 0;
  const context = `${seated}:${carrying}`;
  if (paused && motion.initialized && motion.context === context && !snap) return;
  const initial = snap || !motion.initialized || (paused && motion.context !== context);
  const blend = initial ? 1 : 1 - Math.exp(-dt * 12);
  motion.seated += ((seated ? 1 : 0) - motion.seated) * blend;
  motion.walk += ((moving && !seated ? 1 : 0) - motion.walk) * blend;
  if (!paused) motion.cycle += Math.min(distance, 0.2) / 0.8;
  if (initial || distance > 1) motion.feet = {};
  for (const [name, bone] of Object.entries(bones)) {
    const r = rest[names[name]]; bone.position.copy(r.position); bone.quaternion.copy(r.quaternion); bone.scale.copy(r.scale);
  }
  u.body.position.set(0, 0, 0);
  bones.root.position.y -= 0.2275 * motion.seated + 0.045 * motion.walk * (1 - motion.seated);
  bones.root.position.z += 0.05 * motion.seated;
  turn(bones.spine, 12 * Math.PI / 180 * motion.seated);
  const phase = motion.cycle * Math.PI * 2;
  for (const [side, sign] of [['L', -1], ['R', 1]]) {
    turn(bones[`upperArm${side}`], sign * Math.sin(phase) * 0.25 * motion.walk);
    turn(bones[`forearm${side}`], -0.12 - 0.05 * motion.walk);
    twist(bones[`forearm${side}`], -sign * 0.9);
  }
  group.updateWorldMatrix(true, false); group.updateMatrixWorld(true);
  const heading = worldOrientation(group), forward = front.clone().applyQuaternion(heading);
  const ankleHeight = 0.097;
  for (const [side, sign, offset] of [['L', -1, 0], ['R', 1, 0.5]]) {
    const restTarget = group.localToWorld(new THREE.Vector3(sign * 0.112, 0, -0.005));
    restTarget.y = support(restTarget.x, restTarget.z) + ankleHeight;
    const step = (motion.cycle + offset) % 1, stance = step < 0.55;
    let foot = motion.feet[side];
    if (!foot) foot = motion.feet[side] = { plant: restTarget.clone(), start: restTarget.clone(), stance, heading: heading.clone() };
    let target = restTarget.clone(), footHeading = heading.clone();
    if (motion.walk > 0.001) {
      if (foot.stance && !stance) { foot.start.copy(foot.plant); foot.heading.copy(heading); }
      if (!foot.stance && stance) {
        foot.plant.copy(foot.target || foot.landing || restTarget); foot.heading.copy(heading);
        foot.plant.y = support(foot.plant.x, foot.plant.z) + ankleHeight;
      }
      if (stance) { target.copy(foot.plant); footHeading.copy(foot.heading); }
      else {
        const t = (step - 0.55) / 0.45;
        const landing = group.localToWorld(new THREE.Vector3(sign * 0.112, 0, 0.20 + (1 - t) * 0.36));
        landing.y = support(landing.x, landing.z) + ankleHeight; foot.landing = landing;
        target.copy(foot.start).lerp(landing, t * t * (3 - 2 * t)); target.y += Math.sin(t * Math.PI) ** 2 * 0.10;
        footHeading.copy(foot.heading).slerp(heading, t);
      }
      foot.stance = stance;
      target.lerp(restTarget, 1 - motion.walk);
    } else { foot.plant.copy(restTarget); foot.stance = stance; }
    const seatedTarget = group.localToWorld(new THREE.Vector3(sign * 0.112, 0, 0.40));
    seatedTarget.y = support(seatedTarget.x, seatedTarget.z) + ankleHeight;
    target.lerp(seatedTarget, motion.seated);
    foot.target = target.clone();
    solveLimb(bones[`thigh${side}`], bones[`shin${side}`], bones[`foot${side}`], target, forward);
    setWorldOrientation(bones[`foot${side}`], footHeading.multiply(rest[names[`foot${side}`]].orientation));
  }
  // Skinning can dip below rest bounds between key poses. Test the actual shoe
  // surface each frame against grass/floor, rather than trusting bind endpoints.
  let gap = Infinity;
  for (const index of template.shoes) {
    const p = new THREE.Vector3().fromBufferAttribute(u.mesh.geometry.attributes.position, index);
    u.mesh.applyBoneTransform(index, p).applyMatrix4(u.mesh.matrixWorld);
    gap = Math.min(gap, p.y - support(p.x, p.z));
  }
  u.body.position.y -= gap;
  group.updateWorldMatrix(true, false); group.updateMatrixWorld(true); u.skeleton.update(); u.mesh.boundingBox = null;
  if (motion.seated > 0.001) for (const [side, sign] of [['L', -1], ['R', 1]]) {
    const palm = group.localToWorld(new THREE.Vector3(sign * 0.25, 0.868, Math.max(0.35, tableDistance - 0.455 + 0.025)));
    // Chair and tabletop heights share the actor's support surface.
    const current = u.palms[side].clone().applyMatrix4(bones[`hand${side}`].matrixWorld);
    armContact(group, side, current.lerp(palm, motion.seated), up.clone().negate(), forward);
  }
  if (carrying) {
    const palm = group.localToWorld(new THREE.Vector3(0.34, 1.06, 0.35));
    armContact(group, 'R', palm, up, forward);
  }
  group.updateMatrixWorld(true); u.skeleton.update();
  u.carried.visible = carrying;
  if (carrying) u.carried.quaternion.copy(worldOrientation(bones.handR).invert().multiply(heading));
  u.indicator.position.y = worldPoint(bones.head).y - group.position.y + 0.43;
  motion.initialized = true; motion.context = context;
}

export function characterBounds(group) {
  const u = group.userData;
  group.updateWorldMatrix(true, false); group.updateMatrixWorld(true); u.mesh.computeBoundingBox();
  const bounds = u.mesh.boundingBox.clone().applyMatrix4(u.mesh.matrixWorld);
  u.mesh.boundingBox = null;
  return bounds;
}

// Used by the cross-tool bridge check; source indices survive material seams.
export function characterSourceVertex(group, index) {
  const compiled = template.source.indexOf(index), mesh = group.userData.mesh;
  if (compiled < 0) throw new Error(`Missing character vertex ${index}`);
  return mesh.applyBoneTransform(compiled, new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, compiled));
}

export const characterMetrics = Object.freeze({ bodyVertices: asset.positions.length / 3, compiledVertices: template.positions.length / 3, triangles: template.indices.length / 3, bones: asset.bones.length, bodyDrawCalls: 1, indicatorDrawCalls: 1 });
