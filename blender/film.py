"""Stage 3: the film. Path-traced frames whose camera ends exactly where the realtime camera begins.
blender -b -P blender/film.py -- <outDir> <frames: a-b[:step] | list> [scale%] [samples]"""
import bpy, sys, math, os, numpy as np
from mathutils import Vector
ROOT=__import__('os').path.dirname(__import__('os').path.dirname(__import__('os').path.abspath(__file__)))+'/'; a=sys.argv[sys.argv.index('--')+1:]; OUT=a[0]; SCALE=int(a[2]) if len(a)>2 else 100; SPP=int(a[3]) if len(a)>3 else 96
N=320
def frames(s):
    o=[]
    for p in s.split(','):
        if '-' in p: r,_,st=p.partition(':'); x,y=map(int,r.split('-')); o+=list(range(x,y+1,int(st or 1)))
        else: o.append(int(p))
    return o
bpy.ops.wm.open_mainfile(filepath=ROOT+'blender/car.blend'); s=bpy.context.scene
B=lambda m: next(x for x in m.node_tree.nodes if x.type=='BSDF_PRINCIPLED')
MT=bpy.data.materials
def concrete(n,col,rough,scale,bump):
    m=MT.new(n); m.use_nodes=True; nt=m.node_tree; b=B(m); tc=nt.nodes.new('ShaderNodeTexCoord'); mp=nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value=(scale,)*3; nt.links.new(tc.outputs['Generated' if False else 'Object'],mp.inputs[0])
    def im(f,cs):
        i=nt.nodes.new('ShaderNodeTexImage'); i.image=bpy.data.images.load(ROOT+'assets-src/polyhaven/'+f); i.image.colorspace_settings.name=cs; i.projection='BOX'; i.projection_blend=.2; nt.links.new(mp.outputs[0],i.inputs[0]); return i
    base='concrete_floor_worn_001' if n=='floor' else 'concrete_wall_007'
    d=im(base+'_Diffuse_1k.jpg','sRGB'); r=im(base+'_Rough_1k.jpg','Non-Color'); nr=im(base+'_nor_gl_1k.jpg','Non-Color')
    mx=nt.nodes.new('ShaderNodeMixRGB'); mx.blend_type='MULTIPLY'; mx.inputs[0].default_value=1; mx.inputs[2].default_value=(*col,1); nt.links.new(d.outputs[0],mx.inputs[1]); nt.links.new(mx.outputs[0],b.inputs['Base Color'])
    mr=nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value=rough[0]; mr.inputs['To Max'].default_value=rough[1]; nt.links.new(r.outputs[0],mr.inputs[0]); nt.links.new(mr.outputs[0],b.inputs['Roughness'])
    nm=nt.nodes.new('ShaderNodeNormalMap'); nm.inputs[0].default_value=bump; nt.links.new(nr.outputs[0],nm.inputs[1]); nt.links.new(nm.outputs[0],b.inputs['Normal']); return m
FL=concrete('floor',(.30,.28,.25),(.16,.62),.42,.35); WL=concrete('wall',(.34,.31,.27),(.6,.95),.3,.9)
def box(loc,size,m,rot=(0,0,0)):
    me=bpy.data.meshes.new('b'); x,y,z=[v/2 for v in size]; me.from_pydata([(i*x,j*y,k*z) for i in(-1,1) for j in(-1,1) for k in(-1,1)],[],[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]); me.materials.append(m); o=bpy.data.objects.new('b',me); s.collection.objects.link(o); o.location=loc; o.rotation_euler=rot; return o
box((0,0,-.05),(60,60,.1),FL); box((0,11,3.6),(34,.6,9),WL); box((0,-14,3.6),(34,.6,9),WL); box((-11.5,1,3.6),(.6,30,9),WL,(0,0,.12)); box((12,0,3.6),(.6,30,9),WL,(0,0,-.1))
box((-6.4,7.4,2.4),(3.4,.9,8),WL,(-.06,.2,-.5)); box((6.8,8.2,1.7),(2.2,1,6.5),WL,(0,.08,.35)); box((7.2,-4.2,.22),(2.6,6,.44),WL)
E={}
def emit(k,loc,size,col,rot=(0,0,0)):
    if k not in E:
        m=MT.new('e'+k); m.use_nodes=True; nt=m.node_tree; nt.nodes.clear(); e=nt.nodes.new('ShaderNodeEmission'); e.inputs[0].default_value=(*col,1); o=nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0],o.inputs[0]); E[k]=(m,e)
    return box(loc,size,E[k][0],rot)
for x in(-1.5,1.5): emit('frame',(x,.2,4.1),(.08,6.4,.05),(1,.93,.82))
for y in(-3.0,3.4): emit('frame',(0,y,4.1),(3.08,.08,.05),(1,.93,.82))
emit('slit',(-10.4,5.2,2.6),(.06,.16,5.2),(1,.58,.22)); emit('red',(0,10.5,.03),(14,.03,.03),(.9,.03,.02))
for x in(-1.5,1.5):
    for y in(-2.4,2.6): box((x,y,6.1),(.012,.012,4),MT['void'])
def light(t,loc,tgt,col,**k):
    l=bpy.data.lights.new('l',t); l.color=col; [setattr(l,a,v) for a,v in k.items()]; o=bpy.data.objects.new('l',l); s.collection.objects.link(o); o.location=loc; o.rotation_euler=(Vector(tgt)-Vector(loc)).to_track_quat('-Z','Y').to_euler(); o.visible_camera=False; return l
side=light('AREA',(6.6,-1,1.5),(0,0,.6),(.95,.97,1),shape='RECTANGLE',size=7,size_y=.45)
warm=light('AREA',(-6.8,3.4,2.2),(0,.2,.6),(1,.68,.36),shape='RECTANGLE',size=4.5,size_y=.9)
front=light('AREA',(0,-8.5,2.4),(0,0,.5),(1,.96,.9),shape='RECTANGLE',size=7,size_y=.5)
top=light('AREA',(0,.2,4.0),(0,.2,0),(1,.94,.85),shape='RECTANGLE',size=2.6,size_y=6)
wash=light('SPOT',(-3,5.5,7.5),(-2,11,1.5),(.93,.85,.72),spot_size=1.5,spot_blend=1,shadow_soft_size=1)
HL=[light('SPOT',(x,-2.30,.59),(x*1.05,-11,-.15),(1,.83,.58),spot_size=.62,spot_blend=.7,shadow_soft_size=.05) for x in(-.66,-.50,.50,.66)]
TL=light('AREA',(0,2.75,.71),(0,2.3,.71),(1,.03,.015),shape='RECTANGLE',size=1.4,size_y=.12); TF=light('AREA',(0,2.40,.71),(0,6,.2),(1,.03,.015),shape='RECTANGLE',size=1.5,size_y=.1)
silk=MT.new('silk'); silk.use_nodes=True; b=B(silk); b.inputs['Base Color'].default_value=(.78,.74,.66,1); b.inputs['Roughness'].default_value=.42; b.inputs['Sheen Weight'].default_value=.55; b.inputs['Sheen Roughness'].default_value=.3; b.inputs['Specular IOR Level'].default_value=.6
nt=silk.node_tree; tr=nt.nodes.new('ShaderNodeBsdfTranslucent'); tr.inputs[0].default_value=(.8,.74,.62,1); mx=nt.nodes.new('ShaderNodeMixShader'); mx.inputs[0].default_value=.16; ot=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL'); nt.links.new(b.outputs[0],mx.inputs[1]); nt.links.new(tr.outputs[0],mx.inputs[2]); nt.links.new(mx.outputs[0],ot.inputs[0])
R=np.load(ROOT+'blender/cloth_raw.npy',mmap_mode='r') if os.path.exists(ROOT+'blender/cloth_raw.npy') else None; NX,NY=151,231; S0=109
cl=None
if R is not None and R.shape[1]==NX*NY:
    me=bpy.data.meshes.new('cl'); me.from_pydata(R[S0].tolist(),[],[(j*NX+i,j*NX+i+1,(j+1)*NX+i+1,(j+1)*NX+i) for j in range(NY-1) for i in range(NX-1)]); [setattr(p,'use_smooth',True) for p in me.polygons]; me.materials.append(silk); cl=bpy.data.objects.new('cl',me); s.collection.objects.link(cl); 
    cs=cl.modifiers.new('cs','SMOOTH'); cs.factor=.5; cs.iterations=4; vg=cl.vertex_groups.new(name='fix'); cs.vertex_group='fix'
    sd=cl.modifiers.new('s','SUBSURF'); sd.levels=sd.render_levels=1
w=bpy.data.worlds.new('w'); s.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(.0025,.0025,.0025,1)
hz=box((0,-1,3),(22,24,6.4),MT.new('haze')); m=MT['haze']; m.use_nodes=True; nt=m.node_tree; nt.nodes.clear(); v=nt.nodes.new('ShaderNodeVolumeScatter'); v.inputs['Density'].default_value=.0028; v.inputs['Anisotropy'].default_value=.55; o=nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(v.outputs[0],o.inputs['Volume']); hz.visible_shadow=False
s.render.engine='CYCLES'; c=s.cycles; c.samples=SPP; c.use_adaptive_sampling=True; c.adaptive_threshold=.02; c.use_denoising=True; c.max_bounces=10; c.transmission_bounces=8; c.volume_bounces=0; c.caustics_reflective=c.caustics_refractive=False; c.sample_clamp_indirect=6; c.use_light_tree=True
s.render.resolution_x,s.render.resolution_y=1600,900; s.render.resolution_percentage=SCALE; s.render.use_persistent_data=True; s.view_settings.view_transform='AgX'; s.view_settings.look='AgX - Medium High Contrast'; s.render.image_settings.file_format='PNG'
p=bpy.context.preferences.addons['cycles'].preferences; p.compute_device_type='METAL'; p.get_devices(); [setattr(d,'use',True) for d in p.devices]; c.device='GPU'
cam=bpy.data.objects.new('c',bpy.data.cameras.new('c')); s.collection.objects.link(cam); s.camera=cam; cam.data.sensor_fit='VERTICAL'; cam.data.sensor_height=24; cam.data.dof.use_dof=True; cam.data.dof.aperture_fstop=4.5; cam.data.clip_end=80
# f, position, look, vertical fov, focus distance point
K=[(0,(5.3,-7.6,1.15),(-.5,-.1,.82),32,(.6,-2,.6)),(24,(5.0,-7.1,1.05),(-.4,-.2,.8),32,(.6,-2,.6)),(84,(4.3,-5.7,.62),(0,-.2,.78),36,(.6,-1.8,.6)),(150,(2.9,-6.3,.55),(0,-.9,.62),32,(.4,-2.2,.6)),
 (188,(0,-6.1,.55),(0,-1.6,.50),30,(0,-2.3,.6)),(206,(1.9,-5.0,.5),(.35,-1.6,.55),31,(.6,-2.1,.6)),(232,(6.7,-.35,.8),(0,-.02,.78),33,(.95,0,.6)),(250,(3.3,-2.9,.46),(.75,-1.45,.42),31,(.93,-1.46,.35)),(268,(2.2,-4.0,1.55),(-.1,-1.5,.78),31,(0,-1.5,.85)),
 (280,(1.25,-4.3,1.72),(-.1,-1.25,.84),31,(0,-1.7,.95)),(281,(-4.7,3.3,1.0),(-.1,.95,.6),32,(-.9,2.0,.6)),(304,(-1.6,5.3,.75),(.15,1.5,.62),30,(0,2.35,.7)),(319,(4.4,-5.6,1.5),(0,0,.6),36,(.6,-1.8,.6))]
def clear_wheels(X):
    '''The simulation let some silk slip into the hollow wheels. Lift anything inside a soft disc in front of each wheel back out.'''
    w=np.zeros(len(X),dtype=np.float32)
    for yc in(-1.461,1.372):
        r=np.hypot(X[:,1]-yc,X[:,2]-.332); ss=np.clip((.47-r)/.13,0,1); ss=ss*ss*(3-2*ss); need=.90+.095*ss
        for s in(-1,1):
            ax=X[:,0]*s; m=(r<.47)&(ax>.45)&(ax<need); X[m,0]=s*need[m]; w[(r<.55)&(ax>.45)]=np.maximum(w[(r<.55)&(ax>.45)],np.clip((.55-r[(r<.55)&(ax>.45)])/.15,0,1))
    X[:,2]=np.maximum(X[:,2],.012); return X,w
def sm(t): t=min(1,max(0,t)); return t*t*(3-2*t)
def rp(a,b,x): return sm((x-a)/(b-a))
# front -> rear would fly over the hood too fast to scroll, so there is a cut at 281 as well
# rear -> front would cross the room, so the last move is a cut at 305 to a wide shot that settles on the realtime start camera
CUT=305; WIDE=((5.2,-6.6,1.9),(0,0,.7),36,(.6,-1.8,.6))
def sample(f):
    if f>=CUT:
        t=sm((f-CUT)/(N-1-CUT)); z=K[-1]; mixv=lambda a,b:tuple(p+(q-p)*t for p,q in zip(a,b)); return mixv(WIDE[0],z[1]),mixv(WIDE[1],z[2]),36,z[4]
    KK=[k for k in K[:-1] if (k[0]<281)==(f<281)]; i=0
    while i<len(KK)-2 and f>KK[i+1][0]: i+=1
    a0,b0=KK[i],KK[i+1]; t=(f-a0[0])/(b0[0]-a0[0]); t=sm(t)*.55+t*.45; t=min(1,max(0,t)); p0,p3=KK[max(0,i-1)],KK[min(len(KK)-1,i+2)]
    def h(k):
        o=[]
        for u0,u1,u2,u3 in zip(p0[k],a0[k],b0[k],p3[k]): m1=(u2-u0)*.32; m2=(u3-u1)*.32; o.append((2*t**3-3*t*t+1)*u1+(t**3-2*t*t+t)*m1+(-2*t**3+3*t*t)*u2+(t**3-t*t)*m2)
        return o
    return h(1),h(2),a0[3]+(b0[3]-a0[3])*t,h(4)
os.makedirs(OUT,exist_ok=True)
for f in frames(a[1]):
    P=f'{OUT}/f{f:04d}.png'
    if os.path.exists(P): continue
    pos,look,fov,foc=sample(f); cam.location=pos; cam.rotation_euler=(Vector(look)-Vector(pos)).to_track_quat('-Z','Y').to_euler(); cam.data.angle_y=math.radians(fov) if hasattr(cam.data,'angle_y') else 0; cam.data.lens=24/(2*math.tan(math.radians(fov)/2)); cam.data.dof.focus_distance=(Vector(foc)-Vector(pos)).length
    key=.5+.5*rp(40,140,f); dark=rp(160,178,f)*(1-rp(206,224,f)); tail=rp(286,298,f)*(1 if f<CUT else 0); hl=rp(172,180,f)*(1-rp(204,216,f)); k=key*(1-.72*dark)*(1-.80*tail); fin=1 if f>=CUT else 0
    if fin: hl=.35; tail=0; k=1
    E['frame'][1].inputs[1].default_value=1.5+34*k; E['slit'][1].inputs[1].default_value=10+40*k; E['red'][1].inputs[1].default_value=9
    side.energy=130*k; warm.energy=70+190*k; front.energy=60*k; top.energy=150*k; wash.energy=120+420*k
    for l in HL: l.energy=300*hl
    b=B(MT['lampFront']); b.inputs['Emission Color'].default_value=(1,.86,.62,1); b.inputs['Emission Strength'].default_value=20*hl
    b=B(MT['lampRear']); b.inputs['Emission Color'].default_value=(1,0,0,1); b.inputs['Emission Strength'].default_value=1.4*max(tail,.3*fin); TL.energy=0; TF.energy=34*tail
    if cl:
        g=S0+rp(24,30,f)*0+max(0,(f-24))/(150-24)*(len(R)-1-S0); g=min(len(R)-1,max(S0,g)); i=int(g); t=g-i; X=R[i]*(1-t)+R[min(i+1,len(R)-1)]*t; X,W8=clear_wheels(np.array(X,dtype=np.float32)); vg.add(list(range(len(X))),0,'REPLACE'); [vg.add([int(q)],float(W8[q]),'REPLACE') for q in np.nonzero(W8>0)[0]]; me.vertices.foreach_set('co',X.ravel()); me.update(); cl.hide_render=f>=160
    s.render.filepath=P; bpy.ops.render.render(write_still=True); print('RENDERED',f,flush=True)
