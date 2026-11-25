"""Stage 1: normalise the CC BY Challenger model, remove marque badges, give every part a physical material."""
import bpy, math, numpy as np
from mathutils import Vector, Matrix
ROOT=__import__('os').path.dirname(__import__('os').path.dirname(__import__('os').path.abspath(__file__)))+'/'
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=ROOT+'assets-src/car/challenger_1970.glb')
ms=[o for o in bpy.data.objects if o.type=='MESH']
P=[o.matrix_world@Vector(v) for o in ms for v in o.bound_box]; lo=Vector([min(p[i] for p in P) for i in range(3)]); hi=Vector([max(p[i] for p in P) for i in range(3)])
W=Matrix.Scale(4.86/(hi.y-lo.y),4)@Matrix.Translation(-Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z)))
BADGE=('DogdeLogo','DodgeLogo','ChallengerLogo','RT_','RTBack','RTL_','RTR_','FuelText','FrontLightLens_x')
drop=[o for o in ms if o.name.startswith(BADGE)]
print('BADGES REMOVED',len(drop)); ms=[o for o in ms if o not in drop]
for o in drop: bpy.data.objects.remove(o)
for o in ms:
    if o.data.users>1: o.data=o.data.copy()
    o.data.transform(W@o.matrix_world); o.parent=None; o.matrix_world=Matrix.Identity(4)
for o in list(bpy.data.objects):
    if o.type!='MESH': bpy.data.objects.remove(o)
def mat(n,col,metal=0,rough=.5,**k):
    m=bpy.data.materials.new(n); m.use_nodes=True; b=next(x for x in m.node_tree.nodes if x.type=='BSDF_PRINCIPLED'); b.inputs['Base Color'].default_value=(*col,1); b.inputs['Metallic'].default_value=metal; b.inputs['Roughness'].default_value=rough
    for a,v in k.items(): b.inputs[a.replace('_',' ')].default_value=v
    return m
M=dict(paint=mat('paint',(.010,.010,.012),.0,.32,Coat_Weight=1,Coat_Roughness=.02),chrome=mat('chrome',(.80,.80,.81),1,.045),glass=mat('glass',(.004,.0045,.005),0,.0,IOR=1.5),
 lens=mat('lens',(.95,.95,.95),0,.015,Transmission_Weight=1,IOR=1.3),lampFront=mat('lampFront',(.92,.90,.84),1,.10),lampRear=mat('lampRear',(.32,.004,.006),0,.08,Coat_Weight=1),
 amber=mat('amber',(.55,.10,.01),0,.12,Coat_Weight=1),tyre=mat('tyre',(.011,.011,.011),0,.70),steel=mat('steel',(.62,.62,.63),1,.16),gunmetal=mat('gunmetal',(.10,.10,.105),1,.34),
 blackmetal=mat('blackmetal',(.012,.012,.012),.2,.38),plastic=mat('plastic',(.014,.014,.015),0,.42),vinyl=mat('vinyl',(.012,.012,.013),0,.55),void=mat('void',(.002,.002,.002),0,1),
 grille=mat('grille',(.03,.03,.032),.9,.22),reverse=mat('reverse',(.5,.5,.48),0,.15,Coat_Weight=1),redline=mat('redline',(.30,.012,.016),0,.6),plate=mat('plate',(.02,.019,.017),0,.45),brass=mat('brass',(.70,.50,.22),1,.25))
MAP={'Body':'paint','Chrome':'chrome','Glass':'glass','Lens':'lens','FrontLight':'lampFront','RearLights':'lampRear','OrangeGlass':'amber','tire':'tyre','material':'steel','material_7':'gunmetal','BlackMetal':'blackmetal','BlackPlastic':'plastic','Leather':'vinyl','Rubber':'plastic','black':'void','GrillMetal':'grille','WhitePlastic':'reverse','RedPlastic':'lampRear','License':'plate','Mirror':'chrome'}
for o in ms:
    for i,s in enumerate(o.material_slots):
        n=s.material.name.split('.')[0] if s.material else 'black'
        if n not in MAP: print('UNMAPPED',o.name,n)
        s.material=M[MAP.get(n,'plastic')]
# wheels: axle data and a thin red line on each sidewall
axles={}
for k in('L1','L2','R1','R2'):
    t=next(o for o in ms if o.name.startswith(f'Tire{k}_0')); c=[v.co for v in t.data.vertices]
    l=[min(p[i] for p in c) for i in range(3)]; h=[max(p[i] for p in c) for i in range(3)]; s=1 if k[0]=='L' else -1
    cy,cz=(l[1]+h[1])/2,(l[2]+h[2])/2; R=(h[2]-l[2])/2; out=h[0] if s>0 else l[0]; axles[k]=(round(out,3),round(cy,3),round(cz,3),round(R,3))
    v=np.array([tuple(p) for p in c]); r=np.hypot(v[:,1]-cy,v[:,2]-cz)
    def xat(q): m=abs(r-q)<.006; return (v[m,0].max() if s>0 else v[m,0].min()) if m.any() else out
    prof=[(xat(R*f)+s*.0025,R*f) for f in(.800,.812,.824)]; V=[];F=[]
    for i in range(128):
        a=2*math.pi*i/128
        for x,q in prof: V.append((x,cy+q*math.cos(a),cz+q*math.sin(a)))
    for i in range(128):
        for j in range(2): a=i*3+j; b=((i+1)%128)*3+j; F.append((a,a+1,b+1,b))
    me=bpy.data.meshes.new('redline'); me.from_pydata(V,[],F); me.materials.append(M['redline']); [setattr(p,'use_smooth',True) for p in me.polygons]
    o=bpy.data.objects.new('redline_'+k,me); bpy.context.scene.collection.objects.link(o)
print('AXLES',axles)
# own plates
for nm in('LicenseFront_1','LicenseBack_1'):
    o=next((x for x in bpy.data.objects if x.name.startswith(nm)),None)
    if not o: continue
    c=[v.co for v in o.data.vertices]; l=Vector([min(p[i] for p in c) for i in range(3)]); h=Vector([max(p[i] for p in c) for i in range(3)]); m=(l+h)/2; f=-1 if 'Front' in nm else 1
    t=bpy.data.curves.new('pl','FONT'); t.body='RVL 07'; t.align_x='CENTER'; t.align_y='CENTER'; t.size=(h.z-l.z)*.72; t.extrude=.0012
    q=bpy.data.objects.new('plateText'+nm,t); bpy.context.scene.collection.objects.link(q); q.location=(m.x,(l.y if f<0 else h.y)+f*.004,m.z-.002); q.rotation_euler=(math.pi/2,0,0 if f<0 else math.pi); t.materials.append(M['brass'])
bpy.ops.object.select_all(action='DESELECT')
for o in [o for o in bpy.data.objects if o.type=='FONT']: o.select_set(True); bpy.context.view_layer.objects.active=o
if bpy.context.selected_objects: bpy.ops.object.convert(target='MESH')
for k in('FrontLight_0','BackLightsGlass','BackLightsMiddle','Hood_0','FrontGrill_0'):
    for o in bpy.data.objects:
        if o.type=='MESH' and o.name.startswith(k):
            c=[v.co for v in o.data.vertices]; print('POS',o.name,[round(min(p[i] for p in c),2) for i in range(3)],[round(max(p[i] for p in c),2) for i in range(3)])
P=[v.co for o in bpy.data.objects if o.type=='MESH' for v in o.data.vertices]; print('BOUNDS',[round(min(p[i] for p in P),3) for i in range(3)],[round(max(p[i] for p in P),3) for i in range(3)])
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'blender/car.blend')
