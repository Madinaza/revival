import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { fitFov } from '../lib/fov'
import { useStore } from '../state/store'
import { START } from './start'
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera, size = useThree((s) => s.size), reduced = useStore((s) => s.reduced), hotspot = useStore((s) => s.hotspot)
  useEffect(() => { camera.fov = fitFov(START.fov, size.width / size.height); camera.updateProjectionMatrix() }, [camera, size])
  return <OrbitControls makeDefault target={START.look as unknown as THREE.Vector3} enablePan={false} minDistance={3.2} maxDistance={9} minPolarAngle={0.5} maxPolarAngle={1.53} enableDamping={!reduced} dampingFactor={0.06} rotateSpeed={0.7} autoRotate={!reduced && !hotspot} autoRotateSpeed={0.25} />
}
