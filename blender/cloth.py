"""Stage 2: silk reveal. Drape under gravity, then hoist the front hem and drag it back over the roof."""
import bpy, numpy as np
from mathutils import Vector
ROOT=__import__('os').path.dirname(__import__('os').path.dirname(__import__('os').path.abspath(__file__)))+'/'
NX,NY=151,231; W,L=4.9,7.55; CY=.12; SETTLE=110; PULL=170; H=1.36
bpy.ops.wm.open_mainfile(filepath=ROOT+'blender/car.blend'); sc=bpy.context.scene; sc.frame_start=1; sc.frame_end=SETTLE+PULL; sc.render.fps=30
bpy.ops.object.select_all(action='DESELECT'); ms=[o for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith(('plateText','redline'))]
for o in ms: o.select_set(True)
bpy.context.view_layer.objects.active=ms[0]; bpy.ops.object.join(); pr=bpy.context.object
for o in list(bpy.data.objects):
    if o is not pr: bpy.data.objects.remove(o)
# spheres round off the mirrors and bumper corners so silk slides instead of snagging
for x in(-.87,.87):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=.11,location=(x,-.38,.86)); s=bpy.context.object; s.select_set(True); pr.select_set(True); bpy.context.view_layer.objects.active=pr; bpy.ops.object.join()
m=pr.modifiers.new('r','REMESH'); m.mode='VOXEL'; m.voxel_size=.03; sm=pr.modifiers.new('s','SMOOTH'); sm.iterations=4; d=pr.modifiers.new('d','DECIMATE'); d.ratio=.3
for x in('r','s','d'): bpy.ops.object.modifier_apply(modifier=x)
def coll(o,t,f): o.modifiers.new('c','COLLISION'); o.collision.thickness_outer=t; o.collision.cloth_friction=f; o.collision.damping=.2
coll(pr,.026,1.0); bpy.ops.mesh.primitive_plane_add(size=50); coll(bpy.context.object,.012,9)
me=bpy.data.meshes.new('cloth'); V=[((i/(NX-1)-.5)*W,(j/(NY-1)-.5)*L+CY,H) for j in range(NY) for i in range(NX)]; F=[(j*NX+i,j*NX+i+1,(j+1)*NX+i+1,(j+1)*NX+i) for j in range(NY-1) for i in range(NX-1)]
me.from_pydata(V,[],F); cl=bpy.data.objects.new('cloth',me); sc.collection.objects.link(cl); pin=cl.vertex_groups.new(name='pin')
for j in range(6):
    for i in range(NX):
        u=abs(i/(NX-1)-.5)*2; w=1. if u<.14 else max(0,1-(u-.14)/.1)
        if w>0: pin.add([j*NX+i],w*(1-j/6),'REPLACE')
e=bpy.data.objects.new('hook',None); sc.collection.objects.link(e); y0=-L/2+CY; hem=Vector((0,y0,H)); S=SETTLE
K=[(1,hem),(34,Vector((0,y0+.10,.62))),(62,Vector((0,y0+.34,.03))),(S,Vector((0,y0+.34,.03))),(S+16,Vector((0,y0+.42,.8))),(S+40,Vector((0,-2.15,2.1))),(S+66,Vector((0,.3,2.75))),(S+92,Vector((0,3.4,2.6))),(S+120,Vector((0,6.6,1.8))),(S+148,Vector((0,9.2,.6))),(S+PULL,Vector((0,10.4,.15)))]
for f,p in K: e.location=p; e.keyframe_insert('location',frame=f)
e.location=hem; sc.frame_set(1); h=cl.modifiers.new('hook','HOOK'); h.object=e; h.vertex_group='pin'; h.center=hem; h.matrix_inverse=e.matrix_world.inverted()
c=cl.modifiers.new('cloth','CLOTH'); s=c.settings; s.quality=12; s.mass=.14; s.air_damping=1.2; s.tension_stiffness=s.compression_stiffness=14; s.shear_stiffness=3; s.bending_stiffness=.035; s.tension_damping=s.compression_damping=6; s.bending_damping=.5; s.vertex_group_mass='pin'
k=c.collision_settings; k.collision_quality=4; k.distance_min=.012; k.use_self_collision=True; k.self_distance_min=.009; k.self_friction=1.5
c.point_cache.frame_start=1; c.point_cache.frame_end=sc.frame_end
out=[]
for f in range(1,sc.frame_end+1):
    sc.frame_set(f); ev=cl.evaluated_get(bpy.context.evaluated_depsgraph_get()); mm=ev.to_mesh(); a=np.empty(len(mm.vertices)*3,dtype=np.float32); mm.vertices.foreach_get('co',a); out.append(a.reshape(-1,3).copy()); ev.to_mesh_clear()
    if f%10==0: print('FRAME',f,out[-1].min(0).round(2),out[-1].max(0).round(2),flush=True)
np.save(ROOT+'blender/cloth_raw.npy',np.array(out)); print('DONE')
