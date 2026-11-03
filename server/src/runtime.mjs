import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { dirname, extname, resolve, sep } from 'node:path'
import { readFile, stat } from 'node:fs/promises'

export function deliveryKey(databasePath) {
  const path = resolve(dirname(databasePath), 'delivery.key')
  mkdirSync(dirname(path), { recursive: true })
  if (!existsSync(path)) {
    try {
      writeFileSync(path, randomBytes(32), { flag: 'wx', mode: 0o600 })
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
    }
  }
  const key = readFileSync(path)
  if (key.length !== 32) throw new Error('Invalid delivery encryption key')
  return key
}

export function staticApp(directory) {
  const root = resolve(directory)
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
    '.svg': 'image/svg+xml',
  }
  return async (req, res, pathname) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405)
      res.end()
      return
    }
    let path
    try {
      path = resolve(root, '.' + decodeURIComponent(pathname))
    } catch {
      res.writeHead(400)
      res.end()
      return
    }
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(404)
      res.end()
      return
    }
    try {
      if (path === root || !(await stat(path)).isFile()) path = resolve(root, 'index.html')
    } catch {
      if (extname(pathname)) {
        res.writeHead(404)
        res.end()
        return
      }
      path = resolve(root, 'index.html')
    }
    if (!mime[extname(path)]) {
      res.writeHead(404)
      res.end()
      return
    }
    try {
      const data = await readFile(path)
      res.setHeader('Content-Type', mime[extname(path)])
      res.setHeader(
        'Cache-Control',
        pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      )
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
      res.writeHead(200)
      res.end(req.method === 'HEAD' ? undefined : data)
    } catch {
      res.writeHead(503)
      res.end('Build the frontend before starting the server.')
    }
  }
}
