import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/bodoni-moda/opsz-italic.css'
import '@fontsource-variable/bodoni-moda/opsz.css'
import './admin.css'
import { createRoot } from 'react-dom/client'
import { Desk } from './Desk'
createRoot(document.getElementById('desk')!).render(<Desk />)
