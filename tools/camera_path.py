"""Writes src/pages/camera.json: the film camera, frame by frame, from blender/film.py itself. python3 tools/camera_path.py"""
import json, re
src = open('blender/film.py').read()
ns = {}
pick = lambda a, b: src[src.index(a):src.index(b, src.index(a))]
exec('N=320\n' + pick('K=[(0,', '\ndef clear_wheels') + '\n' + pick('def sm(t)', 'os.makedirs(OUT'), ns)
out = []
for f in range(320):
    pos, look, fov, _ = ns['sample'](f)
    out.append([round(v, 2) for v in (pos[0], pos[1], pos[2], look[0], look[1])] + [round(fov, 1)])
json.dump(out, open('src/pages/camera.json', 'w'), separators=(',', ':'))
print(len(out), 'frames', out[0], out[280], out[281], out[319])
