"""Stage 4: realtime version of the same car: decimate per part, join per material, export GLB."""
import bpy
ROOT=__import__('os').path.dirname(__import__('os').path.dirname(__import__('os').path.abspath(__file__)))+'/'; bpy.ops.wm.open_mainfile(filepath=ROOT+'blender/car.blend')
for o in [o for o in bpy.data.objects if o.type=='MESH']:
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=.00015); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
    n=sum(len(p.vertices)-2 for p in o.data.polygons); r=.22 if n>40000 else .25 if n>15000 else .4 if n>4000 else 1
    if o.material_slots and o.material_slots[0].material.name=='chrome' and 'Chrome' in o.name: r=1
    if o.name.startswith('Tire') and '_0' not in o.name: r=.12
    if o.name.startswith('FrontPlate_0'): r=.06
    if o.name.startswith('Body_0'): r=.40
    if o.name.startswith('Hood_0'): r=.4
    if o.name.startswith(('plateText',)): r=1
    if r<1:
        m=o.modifiers.new('d','DECIMATE'); m.ratio=r; bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier='d')
    if o.data.has_custom_normals: bpy.ops.mesh.customdata_custom_splitnormals_clear()
    bpy.ops.object.shade_smooth_by_angle(angle=.61)
by={}
for o in [o for o in bpy.data.objects if o.type=='MESH']:
    while o.data.uv_layers: o.data.uv_layers.remove(o.data.uv_layers[0])
    by.setdefault(o.material_slots[0].material.name if o.material_slots else 'void',[]).append(o)
for k,L in by.items():
    bpy.ops.object.select_all(action='DESELECT'); [x.select_set(True) for x in L]; bpy.context.view_layer.objects.active=L[0]
    if len(L)>1: bpy.ops.object.join()
    bpy.context.object.name=k
print('TRIS',sum(len(p.vertices)-2 for o in bpy.data.objects if o.type=='MESH' for p in o.data.polygons),'PARTS',len(by))
bpy.ops.export_scene.gltf(filepath=ROOT+'blender/car_raw.glb',export_format='GLB',export_yup=True,export_animations=False)
