"""Photographs every specification. blender -b --factory-startup -P blender/stills.py -- <outDir> [scale%] [samples] [only]
Uses the studio, the lights and the last camera of film.py. Existing files are skipped."""
import bpy, os, sys, tempfile
args = sys.argv[sys.argv.index('--') + 1:]; out_dir = os.path.abspath(args[0]); scale = args[1] if len(args) > 1 else '100'; spp = args[2] if len(args) > 2 else '96'; only = args[3] if len(args) > 3 else ''
here = os.path.dirname(os.path.abspath(__file__))
# film.py sets the room up for the frame it renders, so let it render the last one very small first.
# Names here are lower case because film.py's own constants land in this module.
sys.argv = ['x', '--', tempfile.mkdtemp(), '319', '5', '1']
exec(compile(open(os.path.join(here, 'film.py')).read(), os.path.join(here, 'film.py'), 'exec'))
lin = lambda h: tuple(((int(h[i:i + 2], 16) / 255 + .055) / 1.055) ** 2.4 if int(h[i:i + 2], 16) > 10 else int(h[i:i + 2], 16) / 255 / 12.92 for i in (1, 3, 5))
# Same values as V2__sample_catalogue.sql
PAINT = {'obsidian': ('#0d0e11', .2, .34, 1), 'ivory': ('#cfc4ac', 0, .40, 1), 'oxblood': ('#3a0508', .4, .34, 1), 'bare-steel': ('#70757a', 1, .42, .25), 'aged-brass': ('#7a5a26', 1, .36, .6)}
WHEELS = {'gunmetal': ('#2a2b2d', .34), 'brass': ('#b08a48', .26), 'polished-steel': ('#b8babd', .14)}
s = bpy.context.scene; s.render.resolution_percentage = int(scale); s.cycles.samples = int(spp); os.makedirs(out_dir, exist_ok=True)
for pn, (col, metal, rough, coat) in PAINT.items():
    for fn in ('gloss', 'satin'):
        for wn, (wc, wr) in WHEELS.items():
            name = f'{pn}-{fn}-{wn}'; path = f'{out_dir}/{name}.png'
            if os.path.exists(path) or (only and only != name): continue
            b = B(bpy.data.materials['paint']); satin = fn == 'satin'
            b.inputs['Base Color'].default_value = (*lin(col), 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = max(.46, rough) if satin else rough
            b.inputs['Coat Weight'].default_value = .12 if satin else coat; b.inputs['Coat Roughness'].default_value = .5 if satin else .02
            w = B(bpy.data.materials['gunmetal']); w.inputs['Base Color'].default_value = (*lin(wc), 1); w.inputs['Metallic'].default_value = 1; w.inputs['Roughness'].default_value = wr
            s.render.filepath = path; bpy.ops.render.render(write_still=True); print('STILL', name, flush=True)
