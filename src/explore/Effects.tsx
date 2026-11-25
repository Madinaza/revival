import { Bloom, EffectComposer, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { useStore } from '../state/store'
import { QUALITY } from './quality'
export function Effects() {
  const tier = useStore((s) => s.tier)
  if (!QUALITY[tier].post) return null
  return (
    <EffectComposer multisampling={tier === 'high' ? 4 : 0}>
      <Bloom mipmapBlur intensity={0.75} luminanceThreshold={1.05} luminanceSmoothing={0.25} radius={0.72} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.22} darkness={0.72} />
      <Noise blendFunction={BlendFunction.OVERLAY} opacity={0.11} />
      <SMAA />
    </EffectComposer>
  )
}
