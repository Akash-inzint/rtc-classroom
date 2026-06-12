// Production server: serves built frontend + /api/agora-token
// Used inside Docker. For local dev, use `npm run dev:win` instead.
const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const zlib = require('zlib')

const PORT = process.env.PORT || 8080
const DIST = path.join(__dirname, 'dist')

// ── Agora token builder (pure Node crypto/zlib, no extra deps) ──────────────
function le16(n) { return Buffer.from([n & 0xff, (n >>> 8) & 0xff]) }
function le32(n) { return Buffer.from([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]) }
function packStr(s) { const b = Buffer.from(s); return Buffer.concat([le16(b.length), b]) }
function hmac(key, msg) { return crypto.createHmac('sha256', key).update(msg).digest() }

function buildAgoraToken(appId, cert, channel, uid, expireTs) {
  const issueTs = Math.floor(Date.now() / 1000)
  const salt = Math.floor(Math.random() * 99999999) + 1
  const signing = hmac(le32(salt), hmac(le32(issueTs), cert))
  const privs = Buffer.concat([le16(4), le16(1), le32(expireTs), le16(2), le32(expireTs), le16(3), le32(expireTs), le16(4), le32(expireTs)])
  const service = Buffer.concat([le16(1), privs, packStr(channel), packStr(uid)])
  const signingInfo = Buffer.concat([packStr(appId), le32(issueTs), le32(expireTs), le32(salt), le16(1), service])
  const sig = hmac(signing, signingInfo)
  const content = Buffer.concat([le16(sig.length), sig, signingInfo])
  return '007' + zlib.deflateSync(content).toString('base64')
}

// ── MIME types ───────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
}

// ── Server ───────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost`)

  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }

  // API: generate Agora token
  if (url.pathname === '/api/agora-token') {
    const appId = process.env.VITE_AGORA_APP_ID
    const cert  = process.env.VITE_AGORA_APP_CERTIFICATE
    const channel = url.searchParams.get('channel') || ''
    const uid     = url.searchParams.get('uid') || ''

    if (!appId || !cert) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Agora credentials not configured' }))
    }
    if (!channel) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'channel is required' }))
    }

    try {
      const expireTs = Math.floor(Date.now() / 1000) + 3600
      const token = buildAgoraToken(appId, cert, channel, uid, expireTs)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ token, expireTs }))
      console.log(`[api] token for channel="${channel}" uid="${uid}"`)
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  // Static files from dist/
  let filePath = path.join(DIST, url.pathname)

  // SPA fallback: serve index.html for all non-file routes
  const serveFile = (fp) => {
    const ext = path.extname(fp)
    const mime = MIME[ext] || 'application/octet-stream'
    fs.readFile(fp, (err, data) => {
      if (err) {
        // 404 → fallback to index.html (SPA routing)
        fs.readFile(path.join(DIST, 'index.html'), (err2, html) => {
          if (err2) { res.writeHead(404); return res.end('Not found') }
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(html)
        })
        return
      }
      const maxAge = ext === '.html' ? 0 : 31536000 // cache assets 1yr, HTML no-cache
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': ext === '.html' ? 'no-cache' : `public, max-age=${maxAge}, immutable`,
      })
      res.end(data)
    })
  }

  // If path has no extension, treat as SPA route → index.html
  if (!path.extname(url.pathname)) {
    filePath = path.join(DIST, 'index.html')
  }

  serveFile(filePath)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Listening on http://0.0.0.0:${PORT}`)
  console.log(`[server] Serving ${DIST}`)
})
