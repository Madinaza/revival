import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { fitFov } from '../lib/fov'
import { damp } from '../lib/math'
import { useStore } from '../state/store'
import { START } from './start'
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera, size = useThree((s) => s.size), reduced = useStore((s) => s.reduced), hotspot = useStore((s) => s.hotspot)
  // Starts uncovered, to match the film's last frame, then eases into the part of the view the panel leaves free.
  const cover = useRef<[number, number]>([0, 0]), applied = useRef(''), age = useRef(0)
  useEffect(() => { applied.current = ''; return () => camera.clearViewOffset() }, [camera, size])
  useFrame((_, dt) => {
    // Wait out the dissolve from the film, or the car would be seen twice.
    if (useStore.getState().live) age.current += dt
    const [x, y] = age.current < 1.1 ? [0, 0] : useStore.getState().inset, c = cover.current
    for (const [i, goal] of [x, y].entries()) c[i] = reduced || Math.abs(goal - c[i]) < 0.5 ? goal : damp(c[i], goal, 4, Math.min(dt, 0.05))
    const key = c.join()
    if (key === applied.current) return
    applied.current = key
    camera.fov = fitFov(START.fov, (size.width - c[0]) / size.height)
    camera.setViewOffset(size.width, size.height, c[0] / 2, c[1] / 2, size.width, size.height) // also updates the projection
  })
  return <OrbitControls makeDefault target={START.look as unknown as THREE.Vector3} enablePan={false} minDistance={3.2} maxDistance={9} minPolarAngle={0.5} maxPolarAngle={1.53} enableDamping={!reduced} dampingFactor={0.06} rotateSpeed={0.7} autoRotate={!reduced && !hotspot} autoRotateSpeed={0.25} />
}
