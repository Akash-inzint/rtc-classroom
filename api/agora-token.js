import crypto from 'crypto'
import zlib from 'zlib'

function le16(n) {
  return Buffer.from([n & 0xff, (n >>> 8) & 0xff])
}

function le32(n) {
  return Buffer.from([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff])
}

function packStr(s) {
  const b = Buffer.from(s)
  return Buffer.concat([le16(b.length), b])
}

function buildAgoraToken(appId, appCertificate, channelName, uid, expireTs) {
  const issueTs = Math.floor(Date.now() / 1000)
  const salt = Math.floor(Math.random() * 0xffffffff)

  const privs = Buffer.concat([
    le16(4),
    le16(1), le32(expireTs),
    le16(2), le32(expireTs),
    le16(3), le32(expireTs),
    le16(4), le32(expireTs),
  ])

  const service = Buffer.concat([le16(1), privs, packStr(channelName), packStr(uid)])

  const signingInfo = Buffer.concat([
    packStr(appId),
    le32(issueTs),
    le32(expireTs),
    le32(salt),
    le16(1),
    service,
  ])

  const sig = crypto.createHmac('sha256', appCertificate).update(signingInfo).digest()
  const content = Buffer.concat([le16(sig.length), sig, signingInfo])
  const compressed = zlib.deflateSync(content)
  return '007' + compressed.toString('base64')
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { channel, uid } = req.query

  if (!channel) {
    return res.status(400).json({ error: 'channel is required' })
  }

  const appId = process.env.VITE_AGORA_APP_ID
  const appCertificate = process.env.VITE_AGORA_APP_CERTIFICATE

  if (!appId || !appCertificate) {
    return res.status(500).json({ error: 'Agora credentials not configured' })
  }

  try {
    const expireTs = Math.floor(Date.now() / 1000) + 3600
    const token = buildAgoraToken(appId, appCertificate, channel, uid || '', expireTs)
    res.json({ token, expireTs })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
