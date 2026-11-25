/** Publishes dist/ to the gh-pages branch as a single commit, without touching the working tree. */
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
const get = (k) => git(['config', k]), dir = mkdtempSync(join(tmpdir(), 'pages-')), repo = process.cwd(), src = git(['rev-parse', '--short', 'HEAD'])
cpSync('dist', dir, { recursive: true }); writeFileSync(join(dir, '.nojekyll'), '')
git(['init', '-q', '-b', 'gh-pages'], dir); git(['config', 'user.name', get('user.name')], dir); git(['config', 'user.email', get('user.email')], dir)
git(['add', '-A'], dir); git(['commit', '-q', '-m', `Publish site from ${src}`], dir)
// Push through the project's own repository so its credentials are used.
git(['fetch', '-q', dir, 'gh-pages'], repo); git(['push', '-q', '--force', 'origin', 'FETCH_HEAD:refs/heads/gh-pages'], repo)
rmSync(dir, { recursive: true }); console.log('published', src)
