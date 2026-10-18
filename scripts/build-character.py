import bpy
import bmesh
import math
import json
import sys
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix

# Run with Blender 5.2 in background mode. The default export uses linear
# skinning, no render, and no external assets. --evidence additionally renders.
import argparse
parser = argparse.ArgumentParser(description='Build the authored adult mesh and fixed pose bridge fixtures.')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'tmp/character-export')
parser.add_argument('--evidence', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUT = args.output.resolve()
OUT.mkdir(parents=True, exist_ok=True)
MODE = 'poses'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness=0.85):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat

mats = [material('shirt', (0.25, 0.34, 0.38)),
        material('trousers', (0.12, 0.14, 0.18)),
        material('skin', (0.60, 0.36, 0.23)),
        material('hair', (0.08, 0.055, 0.045)),
        material('shoe', (0.055, 0.045, 0.05)),
        material('eye', (0.025, 0.018, 0.018)),
        material('collar', (0.64, 0.72, 0.71))]

# An authored branching control mesh. Blender's Skin modifier resolves shared
# branch topology; the applied/subdivided result is one closed connected surface.
coords, edges, radii = [], [], []
def point(co, radius, parent=None):
    index = len(coords)
    coords.append(co)
    radii.append(radius)
    if parent is not None:
        edges.append((parent, index))
    return index

hip = point((0, 0.015, 0.90), (0.145, 0.115))
waist = point((0, 0.005, 1.02), (0.14, 0.105), hip)
rib = point((0, 0, 1.19), (0.175, 0.115), waist)
chest = point((0, 0, 1.31), (0.18, 0.115), rib)
neck = point((0, 0, 1.435), (0.060, 0.060), chest)
chin = point((0, -0.01, 1.515), (0.110, 0.090), neck)
cheek = point((0, -0.002, 1.60), (0.135, 0.12), chin)
crown = point((0, 0.005, 1.68), (0.12, 0.11), cheek)
point((0, 0.015, 1.725), (0.045, 0.045), crown)
for sign in [-1,1]:
    point((sign*0.150, 0.006, 1.588), (0.017, 0.027), cheek)
for sign in [-1, 1]:
    shoulder = point((sign*0.225, 0.0, 1.325), (0.075, 0.075), chest)
    upper = point((sign*0.268, 0.0, 1.22), (0.064, 0.068), shoulder)
    elbow = point((sign*0.305, -0.003, 1.07), (0.052, 0.05), upper)
    lower = point((sign*0.327, -0.012, 0.94), (0.053, 0.051), elbow)
    wrist = point((sign*0.345, -0.018, 0.825), (0.033, 0.031), lower)
    palm = point((sign*0.35, -0.024, 0.777), (0.046, 0.025), wrist)
    fingers = point((sign*0.352, -0.03, 0.722), (0.039, 0.022), palm)
    point((sign*0.353, -0.03, 0.70), (0.026, 0.018), fingers)
    thumb = point((sign*0.312, -0.04, 0.773), (0.018, 0.018), palm)
    point((sign*0.299, -0.049, 0.741), (0.014, 0.014), thumb)
    leg_top = point((sign*0.095, 0.012, 0.835), (0.088, 0.097), hip)
    thigh = point((sign*0.103, 0.005, 0.67), (0.082, 0.085), leg_top)
    knee = point((sign*0.109, -0.005, 0.47), (0.058, 0.064), thigh)
    calf = point((sign*0.111, 0.008, 0.28), (0.058, 0.061), knee)
    ankle = point((sign*0.112, 0.005, 0.115), (0.042, 0.045), calf)
    heel = point((sign*0.112, -0.012, 0.06), (0.061, 0.049), ankle)
    point((sign*0.112, -0.15, 0.058), (0.065, 0.047), heel)

mesh = bpy.data.meshes.new('ClothedAdultSource')
mesh.from_pydata(coords, edges, [])
mesh.update()
body = bpy.data.objects.new('ClothedAdult', mesh)
bpy.context.collection.objects.link(body)
bpy.context.view_layer.objects.active = body
body.select_set(True)
skin = body.modifiers.new('ConnectedBodyTopology', 'SKIN')
for index, radius in enumerate(radii):
    mesh.skin_vertices[0].data[index].radius = radius
mesh.skin_vertices[0].data[hip].use_root = True
skin.use_smooth_shade = True
skin.branch_smoothing = 0.35
bpy.ops.object.modifier_apply(modifier=skin.name)
smooth = body.modifiers.new('JointSupportLoops', 'SUBSURF')
smooth.subdivision_type = 'CATMULL_CLARK'
smooth.levels = 1
bpy.ops.object.modifier_apply(modifier=smooth.name)
topology = bmesh.new()
topology.from_mesh(body.data)
bmesh.ops.delete(topology, geom=[v for v in topology.verts if not v.link_edges], context='VERTS')
# Garment hems/cuffs and the cropped hairline have actual aligned loops.
for height in [0.115,0.975,1.135,1.405,1.550,1.665]:
    bmesh.ops.bisect_plane(topology, geom=list(topology.verts)+list(topology.edges)+list(topology.faces), dist=0.000001, plane_co=(0,0,height), plane_no=(0,0,1))
bmesh.ops.bisect_plane(topology, geom=list(topology.verts)+list(topology.edges)+list(topology.faces), dist=0.000001, plane_co=(0,0.045,0), plane_no=(0,1,0))
topology.to_mesh(body.data)
topology.free()
body.data.update()
# Keep the proved body. Replace only the failing automatic head/ear branches
# with an authored jaw, face and cranium ring surface welded at the neck.
topology=bmesh.new()
topology.from_mesh(body.data)
bmesh.ops.bisect_plane(topology,geom=list(topology.verts)+list(topology.edges)+list(topology.faces),dist=0.000001,plane_co=(0,0,1.455),plane_no=(0,0,1),clear_outer=True)
bmesh.ops.delete(topology,geom=[v for v in topology.verts if not v.link_edges],context='VERTS')
rim_edges=[edge for edge in topology.edges if edge.is_boundary]
if len(rim_edges)<16:
    bmesh.ops.subdivide_edges(topology,edges=rim_edges,cuts=1,use_grid_fill=False)
rim=list({v for edge in topology.edges if edge.is_boundary for v in edge.verts})
rim.sort(key=lambda v:math.atan2(v.co.y,v.co.x))
first=min(range(len(rim)),key=lambda i:abs(math.atan2(rim[i].co.y,rim[i].co.x)+math.pi/2))
rim=rim[first:]+rim[:first]
count=len(rim)
angles=[-math.pi/2+i*math.tau/count for i in range(count)]
if count>=16:
    angles[1]=-math.pi/2+0.18
    angles[-1]=-math.pi/2+math.tau-0.18
profiles=[(1.455,0.050,-0.043,0.053),(1.475,0.049,-0.044,0.055),(1.492,0.063,-0.095,0.062),(1.520,0.078,-0.098,0.079),(1.544,0.085,-0.101,0.095),(1.575,0.090,-0.098,0.105),(1.610,0.089,-0.100,0.110),(1.630,0.088,-0.103,0.110),(1.660,0.084,-0.099,0.106),(1.690,0.072,-0.083,0.092),(1.715,0.042,-0.045,0.058)]
def head_point(profile,i):
    z,radius,front,back=profile
    theta=angles[i]
    x=radius*math.cos(theta)
    sine=math.sin(theta)
    y=(front*(-sine) if sine<0 else back*sine)
    if sine < -0.72 and z<=1.660:
        y=front*(0.9+0.1*(-sine))
    if i==0 and abs(z-1.575)<0.001:y=-0.128
    if i==0 and abs(z-1.610)<0.001:y=-0.111
    return (x,y,z)
for i,vertex in enumerate(rim):vertex.co=head_point(profiles[0],i)
for profile in profiles[1:]:
    next_rim=[topology.verts.new(head_point(profile,i)) for i in range(count)]
    for i in range(count):
        j=(i+1)%count
        topology.faces.new((rim[i],rim[j],next_rim[j],next_rim[i]))
    rim=next_rim
pole=topology.verts.new((0,0.009,1.728))
for i in range(count):topology.faces.new((rim[i],rim[(i+1)%count],pole))
bmesh.ops.recalc_face_normals(topology,faces=list(topology.faces))
topology.to_mesh(body.data)
topology.free()
body.data.update()
print('AUTHORED_HEAD_RING_VERTICES',count,flush=True)
for mat in mats:
    body.data.materials.append(mat)
for poly in body.data.polygons:
    center = sum((body.data.vertices[i].co for i in poly.vertices), Vector()) / len(poly.vertices)
    x, y, z = center
    if z > 1.47 and abs(x) < 0.20:
        poly.material_index = 3 if (z > 1.665 or y > 0.045 and z > 1.550) else 2
    elif z < 0.115 and abs(x) < 0.24:
        poly.material_index = 4
    elif abs(x) > 0.22 and z < 1.135:
        poly.material_index = 2
    elif z < 0.975:
        poly.material_index = 1
    elif z > 1.405 and abs(x) < 0.11:
        poly.material_index = 2
    else:
        poly.material_index = 0
    poly.use_smooth = True

for v in body.data.vertices:
    if v.co.z < 0.075:v.co.z=max(0.018,v.co.z)

# A single small deform armature. All body vertices are assigned explicit weights.
arm = bpy.data.armatures.new('AdultRigData')
rig = bpy.data.objects.new('AdultRig', arm)
bpy.context.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
bone_defs = []
def bone(name, head, tail, parent=None):
    b = arm.edit_bones.new(name)
    b.head, b.tail = head, tail
    if parent:
        b.parent = arm.edit_bones[parent]
    bone_defs.append((name, parent))

bone('root', (0,0,0), (0,0,0.90))
bone('pelvis', (0,0.015,0.90), (0,0.005,1.03), 'root')
bone('spine', (0,0.005,1.03), (0,0,1.23), 'pelvis')
bone('chest', (0,0,1.23), (0,0,1.42), 'spine')
bone('neck', (0,0,1.42), (0,0,1.49), 'chest')
bone('head', (0,0,1.49), (0,0,1.74), 'neck')
for sign, side in [(-1,'L'),(1,'R')]:
    bone('clavicle'+side, (0,0,1.31), (sign*0.225,0,1.325), 'chest')
    bone('upperArm'+side, (sign*0.225,0,1.325), (sign*0.305,-0.003,1.07), 'clavicle'+side)
    bone('forearm'+side, (sign*0.305,-0.003,1.07), (sign*0.345,-0.018,0.825), 'upperArm'+side)
    bone('hand'+side, (sign*0.345,-0.018,0.825), (sign*0.353,-0.03,0.70), 'forearm'+side)
    bone('thigh'+side, (sign*0.095,0.012,0.86), (sign*0.109,-0.005,0.47), 'pelvis')
    bone('shin'+side, (sign*0.109,-0.005,0.47), (sign*0.112,0.005,0.115), 'thigh'+side)
    bone('foot'+side, (sign*0.112,0.005,0.115), (sign*0.112,-0.15,0.058), 'shin'+side)
bpy.ops.object.mode_set(mode='OBJECT')

def smoothstep(lo, hi, x):
    t = max(0.0, min(1.0, (x-lo)/(hi-lo)))
    return t*t*(3-2*t)

def mix(a,b,t):
    result = {key:value*(1-t) for key,value in a.items()}
    for key,value in b.items():
        result[key] = result.get(key,0)+value*t
    return result

def weights(co):
    x,y,z = co
    side = 'L' if x < 0 else 'R'
    if z>=1.492 and abs(x)<0.17:return {'head':1}
    if (z>1.135 and abs(x)>0.175) or (z>0.60 and abs(x)>0.23):
        arm_weights = mix({'upperArm'+side:1},{'forearm'+side:1},1-smoothstep(1.005,1.135,z))
        arm_weights = mix(arm_weights,{'hand'+side:1},1-smoothstep(0.79,0.87,z))
        return mix({'chest':1},arm_weights,smoothstep(0.175,0.255,abs(x)))
    if z < 1.0:
        leg_weights = mix({'thigh'+side:1},{'shin'+side:1},1-smoothstep(0.415,0.535,z))
        leg_weights = mix(leg_weights,{'foot'+side:1},1-smoothstep(0.10,0.185,z))
        pelvis = smoothstep(0.755,0.925,z)
        if z > 0.73:
            pelvis = max(pelvis,(1-smoothstep(0.035,0.10,abs(x)))*smoothstep(0.73,0.78,z))
            pelvis = max(pelvis,smoothstep(0.015,0.075,y)*smoothstep(0.76,0.84,z))
        return mix(leg_weights,{'pelvis':1},pelvis)
    trunk = mix({'pelvis':1},{'spine':1},smoothstep(0.99,1.10,z))
    trunk = mix(trunk,{'chest':1},smoothstep(1.15,1.30,z))
    trunk = mix(trunk,{'neck':1},smoothstep(1.36,1.44,z))
    return mix(trunk,{'head':1},smoothstep(1.43,1.50,z))

for name, parent in bone_defs:
    body.vertex_groups.new(name=name)
for v in body.data.vertices:
    row = sorted(((name,w) for name,w in weights(v.co).items() if w > 1e-6),key=lambda r:-r[1])[:4]
    total = sum(w for name,w in row)
    for name,w in row:
        body.vertex_groups[name].add([v.index],w/total,'REPLACE')
modifier = body.modifiers.new('LinearSkinning','ARMATURE')
modifier.object = rig
modifier.use_deform_preserve_volume = False
body.parent = rig

def accessory(name, location, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, location=location)
    ob = bpy.context.object
    ob.name = name
    ob.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    for poly in ob.data.polygons:
        poly.use_smooth = True
    group = ob.vertex_groups.new(name='head')
    group.add(list(range(len(ob.data.vertices))),1,'REPLACE')
    mod = ob.modifiers.new('LinearSkinning','ARMATURE')
    mod.object = rig
    ob.parent = rig
    return ob

accessories=[]
from mathutils.bvhtree import BVHTree
face_bmesh=bmesh.new()
face_bmesh.from_mesh(body.data)
face_tree=BVHTree.FromBMesh(face_bmesh)
def face_y(x,z):
    hit=face_tree.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
    return hit[0].y if hit[0] else -0.10
for x in [-0.034,0.034]:
    accessories.append(accessory('Eye', (x,face_y(x,1.610)-0.004,1.610), (0.0065,0.005,0.008), mats[5]))
for sign in [-1,1]:
    accessories.append(accessory('Ear',(sign*0.091,0.014,1.590),(0.012,0.020,0.027),mats[2]))
face_bmesh.free()
EVIDENCE_PROPS=[]
POSE_FIXTURES={}
LANDMARKS={}
CONVERT=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))

def matrix_array(m):return [round(m[r][c],6) for c in range(4) for r in range(4)]
def game_vector(v):return [round(v.x,5),round(v.z,5),round(-v.y,5)]

def record_pose(name):
    evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh=evaluated.to_mesh()
    local=[]
    for bone_name,parent in bone_defs:
        absolute=CONVERT@rig.pose.bones[bone_name].matrix@CONVERT.inverted()
        local.append(matrix_array((CONVERT@rig.pose.bones[parent].matrix@CONVERT.inverted()).inverted()@absolute if parent else absolute))
    POSE_FIXTURES[name]={'boneLocal':local,'vertices':{label:{'index':index,'position':game_vector(evaluated.matrix_world@mesh.vertices[index].co)} for label,index in LANDMARKS.items()}}
    evaluated.to_mesh_clear()
    (OUT/'pose-fixtures.json').write_text(json.dumps(POSE_FIXTURES,separators=(',',':')),encoding='utf8')

def evidence_box(name,location,scale,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    ob=bpy.context.object;ob.name=name;ob.scale=scale;ob.data.materials.append(mat);EVIDENCE_PROPS.append(ob)

def evidence_props(name):
    for ob in EVIDENCE_PROPS:bpy.data.objects.remove(ob,do_unlink=True)
    EVIDENCE_PROPS.clear()
    if name=='seated':
        wood=mats[6]
        evidence_box('Seat',(0,0,0.53),(0.45,0.42,0.045),wood)
        evidence_box('ChairBack',(0,0.21,0.89),(0.45,0.065,0.32),wood)
        evidence_box('TableTop',(0,-1,0.79),(0.91,0.91,0.10),wood)
        for x in [-0.18,0.18]:
            for y in [-0.18,0.18]:evidence_box('ChairLeg',(x,y,0.24),(0.05,0.05,0.48),wood)
    if name=='carry':
        hand=rig.pose.bones['handR'].matrix@arm.bones['handR'].matrix_local.inverted()
        palm=hand@Vector((0.35,-0.024,0.777))
        bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=0.18,depth=0.022,location=palm+Vector((0,0,0.025)))
        plate=bpy.context.object;plate.name='CarriedPlate';plate.data.materials.append(mats[6]);EVIDENCE_PROPS.append(plate)

def world_turn(name, degrees, axis=(1,0,0)):
    pb = rig.pose.bones[name]
    orient = arm.bones[name].matrix_local.to_quaternion()
    pb.rotation_mode='QUATERNION'
    pb.rotation_quaternion = orient.inverted() @ Quaternion(axis,math.radians(degrees)) @ orient

def reset():
    for pb in rig.pose.bones:
        pb.location=(0,0,0)
        pb.rotation_mode='QUATERNION'
        pb.rotation_quaternion=(1,0,0,0)
        pb.scale=(1,1,1)

def pose(name):
    reset()
    if name.startswith('elbow'):
        world_turn('forearmR',-float(name.split('-')[1]))
    elif name.startswith('knee'):
        world_turn('shinR',float(name.split('-')[1]))
    elif name=='seated':
        root_q=arm.bones['root'].matrix_local.to_quaternion()
        rig.pose.bones['root'].location=root_q.inverted() @ Vector((0,-0.05,-0.225))
        world_turn('spine',-7)
        for side in ['L','R']:
            world_turn('thigh'+side,-60)
            world_turn('shin'+side,60)
            world_turn('upperArm'+side,-13)
            world_turn('forearm'+side,-70)
    elif name=='carry':
        world_turn('upperArmR',-12)
        world_turn('forearmR',-76)
        world_turn('handR',-2)
        world_turn('forearmL',-7)
    elif name.startswith('walk'):
        phase=1 if name.endswith('1') else -1
        world_turn('thighL',phase*22)
        world_turn('thighR',-phase*22)
        world_turn('shinL',24 if phase<0 else 4)
        world_turn('shinR',24 if phase>0 else 4)
        world_turn('upperArmL',-phase*15)
        world_turn('upperArmR',phase*15)
        world_turn('forearmL',-10)
        world_turn('forearmR',-10)
    else:
        world_turn('forearmL',-7)
        world_turn('forearmR',-7)
    bpy.context.view_layer.update()
    # The source feet are unchanged. A visual root offset supplies the support
    # surface, including the lower seated pose, without changing any cell data.
    evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    posed=evaluated.to_mesh()
    lowest=min((evaluated.matrix_world@v.co).z for v in posed.vertices)
    evaluated.to_mesh_clear()
    root=rig.pose.bones['root']
    root.location+=arm.bones['root'].matrix_local.to_quaternion().inverted()@Vector((0,0,-lowest))
    bpy.context.view_layer.update()
    record_pose(name)
    evidence_props(name)

def export():
    # Blender Z-up / forward -Y -> runtime Y-up / forward +Z.
    convert=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
    def flatten(m):
        return [round(m[r][c],6) for c in range(4) for r in range(4)]
    def vec(v):
        return [round(v.x,5),round(v.z,5),round(-v.y,5)]
    indices=[]
    material_slots=[]
    body.data.calc_loop_triangles()
    for tri in body.data.loop_triangles:
        indices.extend(tri.vertices)
        material_slots.append(tri.material_index)
    names=[name for name,parent in bone_defs]
    skin_indices=[]
    skin_weights=[]
    for vertex in body.data.vertices:
        row=[(names.index(body.vertex_groups[g.group].name),g.weight) for g in vertex.groups if g.weight>1e-6]
        row.sort(key=lambda value:-value[1])
        row=(row+[(0,0)]*4)[:4]
        skin_indices.extend(i for i,w in row)
        skin_weights.extend(round(w,6) for i,w in row)
    bones=[]
    for name,parent in bone_defs:
        source=arm.bones[name].matrix_local
        rest=convert @ source @ convert.inverted()
        local=(convert @ arm.bones[parent].matrix_local @ convert.inverted()).inverted() @ rest if parent else rest
        bones.append({'name':name,'parent':names.index(parent) if parent else -1,'local':flatten(local),'inverse':flatten(rest.inverted())})
    result={'format':1,'up':'Y','front':'Z','positions':[n for v in body.data.vertices for n in vec(v.co)],'normals':[n for v in body.data.vertices for n in vec(v.normal)],'indices':indices,'materialSlots':material_slots,'skinIndex':skin_indices,'skinWeight':skin_weights,'bones':bones,'materials':[{'name':m.name,'color':[round(c,5) for c in m.diffuse_color[:3]]} for m in mats]}
    result['parts']=[]
    for ob in accessories:
        ob.data.calc_loop_triangles()
        part={'name':ob.name,'positions':[n for v in ob.data.vertices for n in vec(ob.matrix_world@v.co)],'normals':[n for v in ob.data.vertices for n in vec(ob.matrix_world.to_3x3()@v.normal)],'indices':[i for t in ob.data.loop_triangles for i in t.vertices],'material':mats.index(ob.data.materials[0]),'bone':names.index('head')}
        result['parts'].append(part)
    # UV-sphere loop triangle iteration varies between identical Blender runs.
    # Pin only the authored accessory face ordering; reject any topology change.
    accessory_order = [[4,3,9,51,2,7,51,7,8,50,1,5,50,5,6,3,51,8,3,8,9,2,50,6,2,6,7,1,0,5,6,5,10,6,10,11,9,8,13,9,13,14,7,6,11,7,11,12,5,0,10,4,9,14,8,7,12,8,12,13,14,13,18,14,18,19,12,11,16,12,16,17,10,0,15,4,14,19,13,12,17,13,17,18,11,10,15,11,15,16,19,18,23,19,23,24,17,16,21,17,21,22,15,0,20,4,19,24,18,17,22,18,22,23,16,15,20,16,20,21,24,23,28,24,28,29,22,21,26,22,26,27,20,0,25,4,24,29,23,22,27,23,27,28,21,20,25,21,25,26,29,28,33,29,33,34,27,26,31,27,31,32,25,0,30,4,29,34,28,27,32,28,32,33,26,25,30,26,30,31,32,31,36,32,36,37,30,0,35,4,34,39,33,32,37,33,37,38,31,30,35,31,35,36,34,33,38,34,38,39,35,0,40,4,39,44,38,37,42,38,42,43,36,35,40,36,40,41,39,38,43,39,43,44,37,36,41,37,41,42,4,44,49,43,42,47,43,47,48,41,40,45,41,45,46,44,43,48,44,48,49,42,41,46,42,46,47,40,0,45,4,49,3,48,47,2,48,2,51,46,45,1,46,1,50,49,48,51,49,51,3,47,46,50,47,50,2,45,0,1],[3,51,8,3,8,9,2,50,6,2,6,7,1,0,5,4,3,9,51,2,7,51,7,8,50,1,5,50,5,6,7,6,11,7,11,12,5,0,10,4,9,14,8,7,12,8,12,13,6,5,10,6,10,11,9,8,13,9,13,14,10,0,15,4,14,19,13,12,17,13,17,18,11,10,15,11,15,16,14,13,18,14,18,19,12,11,16,12,16,17,4,19,24,18,17,22,18,22,23,16,15,20,16,20,21,19,18,23,19,23,24,17,16,21,17,21,22,15,0,20,4,24,29,23,22,27,23,27,28,21,20,25,21,25,26,24,23,28,24,28,29,22,21,26,22,26,27,20,0,25,4,29,34,28,27,32,28,32,33,26,25,30,26,30,31,29,28,33,29,33,34,27,26,31,27,31,32,25,0,30,33,32,37,33,37,38,31,30,35,31,35,36,34,33,38,34,38,39,32,31,36,32,36,37,30,0,35,4,34,39,36,35,40,36,40,41,39,38,43,39,43,44,37,36,41,37,41,42,35,0,40,4,39,44,38,37,42,38,42,43,44,43,48,44,48,49,42,41,46,42,46,47,40,0,45,4,44,49,43,42,47,43,47,48,41,40,45,41,45,46,49,48,51,49,51,3,47,46,50,47,50,2,45,0,1,4,49,3,48,47,2,48,2,51,46,45,1,46,1,50],[2,50,6,2,6,7,1,0,5,4,3,9,51,2,7,51,7,8,50,1,5,50,5,6,3,51,8,3,8,9,4,9,14,8,7,12,8,12,13,6,5,10,6,10,11,9,8,13,9,13,14,7,6,11,7,11,12,5,0,10,4,14,19,13,12,17,13,17,18,11,10,15,11,15,16,14,13,18,14,18,19,12,11,16,12,16,17,10,0,15,18,17,22,18,22,23,16,15,20,16,20,21,19,18,23,19,23,24,17,16,21,17,21,22,15,0,20,4,19,24,21,20,25,21,25,26,24,23,28,24,28,29,22,21,26,22,26,27,20,0,25,4,24,29,23,22,27,23,27,28,29,28,33,29,33,34,27,26,31,27,31,32,25,0,30,4,29,34,28,27,32,28,32,33,26,25,30,26,30,31,34,33,38,34,38,39,32,31,36,32,36,37,30,0,35,4,34,39,33,32,37,33,37,38,31,30,35,31,35,36,39,38,43,39,43,44,37,36,41,37,41,42,35,0,40,4,39,44,38,37,42,38,42,43,36,35,40,36,40,41,44,43,48,44,48,49,42,41,46,42,46,47,40,0,45,4,44,49,43,42,47,43,47,48,41,40,45,41,45,46,47,46,50,47,50,2,45,0,1,4,49,3,48,47,2,48,2,51,46,45,1,46,1,50,49,48,51,49,51,3],[51,2,7,51,7,8,50,1,5,50,5,6,3,51,8,3,8,9,2,50,6,2,6,7,1,0,5,4,3,9,9,8,13,9,13,14,7,6,11,7,11,12,5,0,10,4,9,14,8,7,12,8,12,13,6,5,10,6,10,11,14,13,18,14,18,19,12,11,16,12,16,17,10,0,15,4,14,19,13,12,17,13,17,18,11,10,15,11,15,16,19,18,23,19,23,24,17,16,21,17,21,22,15,0,20,4,19,24,18,17,22,18,22,23,16,15,20,16,20,21,22,21,26,22,26,27,20,0,25,4,24,29,23,22,27,23,27,28,21,20,25,21,25,26,24,23,28,24,28,29,25,0,30,4,29,34,28,27,32,28,32,33,26,25,30,26,30,31,29,28,33,29,33,34,27,26,31,27,31,32,4,34,39,33,32,37,33,37,38,31,30,35,31,35,36,34,33,38,34,38,39,32,31,36,32,36,37,30,0,35,4,39,44,38,37,42,38,42,43,36,35,40,36,40,41,39,38,43,39,43,44,37,36,41,37,41,42,35,0,40,4,44,49,43,42,47,43,47,48,41,40,45,41,45,46,44,43,48,44,48,49,42,41,46,42,46,47,40,0,45,48,47,2,48,2,51,46,45,1,46,1,50,49,48,51,49,51,3,47,46,50,47,50,2,45,0,1,4,49,3]]
    def triangle_set(indices):
        result=[]
        for i in range(0,len(indices),3):
            face=indices[i:i+3]
            start=face.index(min(face))
            result.append(tuple(face[start:]+face[:start]))
        return sorted(result)
    for part,fixed_indices in zip(result['parts'],accessory_order):
        assert triangle_set(part['indices']) == triangle_set(fixed_indices), 'Accessory topology changed'
        part['indices'] = fixed_indices
    (OUT/'character.json').write_text(json.dumps(result,separators=(',',':')),encoding='utf8')
    report={'bodyVertices':len(body.data.vertices),'bodyTriangles':len(indices)//3,'bones':len(bones),'exportBytes':(OUT/'character.json').stat().st_size,'linearSkinning':not modifier.use_deform_preserve_volume}
    # Connectivity/weight facts are measurements, not a visual-quality verdict.
    adj=[set() for v in body.data.vertices]
    boundary={}
    for poly in body.data.polygons:
        for a,b in poly.edge_keys:
            adj[a].add(b);adj[b].add(a)
            key=tuple(sorted((a,b)));boundary[key]=boundary.get(key,0)+1
    unseen=set(range(len(adj)));components=[]
    while unseen:
        stack=[unseen.pop()];count=0
        while stack:
            item=stack.pop();count+=1
            for other in adj[item]:
                if other in unseen:unseen.remove(other);stack.append(other)
        components.append(count)
    report['bodyConnectedComponents']=components
    report['nonManifoldEdges']=sum(1 for count in boundary.values() if count!=2)
    report['weightsMaxSumError']=max(abs(sum(g.weight for g in v.groups)-1) for v in body.data.vertices)
    report['maxInfluences']=max(len(v.groups) for v in body.data.vertices)
    report['jointBlendVertices']={}
    for label,a,b in [('shoulderL','chest','upperArmL'),('elbowL','upperArmL','forearmL'),('hipL','pelvis','thighL'),('kneeL','thighL','shinL'),('shoulderR','chest','upperArmR'),('elbowR','upperArmR','forearmR'),('hipR','pelvis','thighR'),('kneeR','thighR','shinR')]:
        ai,bi=body.vertex_groups[a].index,body.vertex_groups[b].index
        report['jointBlendVertices'][label]=sum(1 for v in body.data.vertices if any(g.group==ai and g.weight>0.05 for g in v.groups) and any(g.group==bi and g.weight>0.05 for g in v.groups))
    report['accessoryTriangles']=sum(len(part['indices'])//3 for part in result['parts'])
    converted=[vec(v.co) for v in body.data.vertices]
    report['bodyBounds']={'min':[min(v[i] for v in converted) for i in range(3)],'max':[max(v[i] for v in converted) for i in range(3)]}
    target_points={'leftShoulder':(-0.225,-0.05,1.325),'rightShoulder':(0.225,-0.05,1.325),'leftElbow':(-0.305,-0.05,1.07),'rightElbow':(0.305,-0.05,1.07),'leftHip':(-0.095,-0.07,0.86),'rightHip':(0.095,-0.07,0.86),'leftKnee':(-0.109,-0.05,0.47),'rightKnee':(0.109,-0.05,0.47),'leftPalm':(-0.35,-0.04,0.777),'rightPalm':(0.35,-0.04,0.777),'chin':(0,-0.095,1.492),'nose':(0,-0.128,1.575)}
    LANDMARKS.update({label:min(body.data.vertices,key=lambda v:(v.co-Vector(co)).length_squared).index for label,co in target_points.items()})
    (OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    print('PROTOTYPE_REPORT',json.dumps(report),flush=True)

reset()
bpy.context.view_layer.update()
export()
if not args.evidence:
    for name in ['neutral','elbow-0','elbow-45','elbow-90','knee-0','knee-45','knee-90','seated','carry','walk-1','walk-2']:
        pose(name)
    print('CHARACTER_EXPORT_COMPLETE', str(OUT), flush=True)
    sys.exit(0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'character.blend'))

scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=12
scene.cycles.use_denoising=True
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.world.color=(0.55,0.55,0.55)
scene.view_settings.view_transform='AgX'
scene.render.threads_mode='FIXED'
scene.render.threads=8

floor_mat=material('StudioGround',(0.52,0.50,0.45))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,0))
bpy.context.object.name='EvidenceGround'
bpy.context.object.data.materials.append(floor_mat)
for name,loc,energy,size in [('Key',(-3,-4,6),500,5),('Fill',(4,-1,3),220,4),('Rim',(0,4,4),350,4)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,0.9))-ob.location).to_track_quat('-Z','Y').to_euler()

camera_data=bpy.data.cameras.new('EvidenceCamera')
camera=bpy.data.objects.new('EvidenceCamera',camera_data)
bpy.context.collection.objects.link(camera)
scene.camera=camera
camera_data.type='ORTHO'
views={'front':(0,-5,1.10),'side':(5,0,1.10),'rear':(0,5,1.10),'threequarter':(3,-5,2.7)}

def render(label,view='threequarter',scale='close'):
    camera.location=views[view]
    camera.rotation_euler=(Vector((0,0,0.88))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera_data.ortho_scale=2.10 if scale=='close' else 5.6
    scene.render.resolution_x=640 if scale=='close' else 384
    scene.render.resolution_y=768 if scale=='close' else 384
    scene.render.resolution_percentage=100
    scene.render.filepath=str(OUT/(label+'-'+view+'-'+scale+'.png'))
    bpy.ops.render.render(write_still=True)
    print('PROTOTYPE_RENDER',Path(scene.render.filepath).name,flush=True)

if MODE=='neutral':
    pose('neutral')
    for view in views:
        render('neutral',view,'close')
        render('neutral',view,'normal')
else:
    for name in ['elbow-0','elbow-45','elbow-90','knee-0','knee-45','knee-90','seated','carry','walk-1','walk-2']:
        pose(name)
        render(name)
        if name in ['seated','carry','elbow-90','knee-90']:
            render(name,'side')

pose('neutral')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'character.blend'))
print('PROTOTYPE_COMPLETE',MODE,flush=True)
