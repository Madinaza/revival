import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { call, Problem } from '../api/client'
import { Catalogue } from './Catalogue'
import { Requests } from './Requests'
import { Summary } from './Summary'
import { Week } from './Week'
import { Designs, History } from './Lists'
import { signedOut } from './shared'

const PAGES = { summary: ['Summary', Summary], requests: ['Requests', Requests], calendar: ['Calendar', Week], designs: ['Designs', Designs], catalogue: ['Catalogue', Catalogue], history: ['History', History] } as const
type Page = keyof typeof PAGES
const here = (): [Page, string] => { const [h, rest = ''] = location.hash.slice(1).split('/'); return [h in PAGES ? (h as Page) : 'summary', decodeURIComponent(rest)] }

export function Desk() {
  const [who, setWho] = useState<string | null | undefined>(undefined), [first, setFirst] = useState(true), [[page, find], setPage] = useState(here), [down, setDown] = useState('')
  const check = useCallback(async () => {
    try { const s = await call<{ username: string | null }>('GET', 'api/session'); setDown(''); setWho(s.username); if (s.username) setFirst(false); return s.username } catch (e) { setDown(e instanceof Problem ? e.message : 'The studio cannot be reached.'); return null }
  }, [])
  useEffect(() => {
    void check()
    const out = () => setWho(null), nav = () => setPage(here())
    signedOut.addEventListener('out', out); addEventListener('hashchange', nav)
    return () => { signedOut.removeEventListener('out', out); removeEventListener('hashchange', nav) }
  }, [check])
  useEffect(() => { document.title = `${PAGES[page][0]}, Revival front desk` }, [page])
  const leave = async () => { try { await call('POST', 'api/logout') } catch { /* already out */ } setFirst(true); setWho(null); void check() }
  const View = PAGES[page][1] as React.ComponentType<{ find?: string }>
  if (down) return <main className="alone"><h1>Revival</h1><p role="alert">{down}</p><button className="act" onClick={() => void check()}>Try again</button></main>
  if (who === undefined) return <main className="alone" aria-busy><h1>Revival</h1></main>
  return (
    <>
      {!first && (
        <div className="desk" inert={who === null}>
          <header>
            <p className="name">Revival</p>
            <nav aria-label="Sections">{(Object.keys(PAGES) as Page[]).map((k) => <a key={k} href={`#${k}`} aria-current={k === page ? 'page' : undefined}>{PAGES[k][0]}</a>)}</nav>
            <p className="me"><a href="./">View site</a><span>{who}</span><button onClick={() => void leave()}>Sign out</button></p>
          </header>
          <main><h1>{PAGES[page][0]}</h1><View key={page + find} find={find} /></main>
        </div>
      )}
      {who === null && <SignIn again={!first} onDone={async () => { if (await check()) signedOut.dispatchEvent(new Event('in')) }} />}
    </>
  )
}

function SignIn({ again, onDone }: { again: boolean; onDone: () => Promise<void> }) {
  const [note, setNote] = useState(''), [busy, setBusy] = useState(false), user = useRef<HTMLInputElement>(null)
  useEffect(() => user.current?.focus(), [])
  const go = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true); setNote('')
    const send = () => call('POST', 'api/login', new URLSearchParams({ username: String(f.get('username')), password: String(f.get('password')) }))
    try {
      // The old token dies with the old session, so one refusal is expected after a timeout.
      try { await send() } catch (x) { if (!(x instanceof Problem) || x.status !== 403) throw x; await call('GET', 'api/session'); await send() }
      await onDone()
    } catch (x) { setNote(x instanceof Problem && x.status === 401 ? 'That user name and password do not match.' : x instanceof Problem ? x.message : 'That did not work. Try again.') } finally { setBusy(false) }
  }
  return (
    <div className={`signin ${again ? 'is-over' : ''}`} role={again ? 'dialog' : undefined} aria-modal={again || undefined} aria-labelledby="signin">
      <form onSubmit={(e) => void go(e)}>
        <h1 id="signin">{again ? 'Your session ended' : 'Front desk'}</h1>
        {again && <p>Sign in to carry on. What you were editing is still here.</p>}
        <label><span>User name</span><input ref={user} name="username" autoComplete="username" required /></label>
        <label><span>Password</span><input name="password" type="password" autoComplete="current-password" required /></label>
        <p className="bad" role="alert">{note}</p>
        <button className="act" disabled={busy}>{busy ? 'Signing in' : 'Sign in'}</button>
      </form>
    </div>
  )
}
