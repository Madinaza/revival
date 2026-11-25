export interface Hotspot { id: string; title: string; body: string; pos: [number, number, number]; facing: [number, number, number] }
/** Sizes are measured from the 3D model as scaled for this project. */
export const HOTSPOTS: readonly Hotspot[] = [
  { id: 'lamps', title: 'Four lamps', body: 'Two pairs sit deep inside a blacked-out mouth, behind clear lenses with a moulded pattern.', pos: [0.58, 0.6, 2.3], facing: [0, 0, 1] },
  { id: 'scoop', title: 'Hood scoop', body: 'One wide intake, split in two, set back towards the windscreen.', pos: [0, 0.94, 1.15], facing: [0, 1, 0.25] },
  { id: 'wheel', title: 'Steel wheels', body: 'Plain pierced steel. The thin red line on each tyre was added for this project.', pos: [0.95, 0.33, 1.46], facing: [1, 0, 0] },
  { id: 'roof', title: 'Vinyl roof', body: 'A textile-look roof in black against the painted body, edged in bright trim.', pos: [0.55, 1.2, -0.3], facing: [0.6, 1, 0] },
  { id: 'tail', title: 'Full-width tail', body: 'A single red band across the back, broken only by the reversing lamp.', pos: [-0.45, 0.71, -2.4], facing: [0, 0.1, -1] },
]
export const CREDIT = { name: 'Dodge Challenger 1970', author: 'Artem P', url: 'https://sketchfab.com/models/915d29c2e6af4ef8a48a93337835f3c8', license: 'CC BY 4.0' }
