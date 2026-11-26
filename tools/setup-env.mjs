/** Writes .env with fresh random passwords. Keeps an existing file. The file is ignored by git. */
import { existsSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
if (existsSync('.env')) { console.log('.env already exists, nothing changed'); process.exit(0) }
const secret = () => randomBytes(18).toString('base64url')
writeFileSync('.env', `DB_PASSWORD=${secret()}\nADMIN_USERNAME=curator\nADMIN_PASSWORD=${secret()}\nCOOKIE_SECURE=false\n`, { mode: 0o600 })
console.log('Wrote .env. The front desk user name and password are in it.')
