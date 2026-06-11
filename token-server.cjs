// Simple token server for local dev — run with: node token-server.cjs
const http = require('http')
const { RtcTokenBuilder, RtcRole } = require('agora-token')
require('dotenv').config({ path: '.env.local' })

const PORT = 3001
const appId = process.env.VITE_AGORA_APP_ID
const cert = process.env.VITE_AGORA_APP_CERTIFICATE

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (url.pathname !== '/api/agora-token') {
    res.writeHead(404)
    return res.end()
  }

  const channel = url.searchParams.get('channel') || ''
  const uid = url.searchParams.get('uid') || ''
  const expireTs = Math.floor(Date.now() / 1000) + 3600

  try {
    const token = RtcTokenBuilder.buildTokenWithUserAccount(
      appId, cert, channel, uid, RtcRole.PUBLISHER, expireTs, expireTs
    )
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ token }))
    console.log(`[token-server] Generated token for channel="${channel}" uid="${uid}"`)
  } catch (e) {
    res.writeHead(500)
    res.end(JSON.stringify({ error: e.message }))
  }
})

server.listen(PORT, () => {
  console.log(`[token-server] Running at http://localhost:${PORT}`)
})
