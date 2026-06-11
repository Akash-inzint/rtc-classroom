const { RtcTokenBuilder, RtcRole } = require('agora-token')

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { channel, uid } = req.query

  if (!channel) {
    return res.status(400).json({ error: 'channel is required' })
  }

  const appId = process.env.VITE_AGORA_APP_ID
  const appCertificate = process.env.VITE_AGORA_APP_CERTIFICATE

  if (!appId || !appCertificate) {
    return res.status(500).json({ error: 'Agora credentials not configured' })
  }

  const expireTs = Math.floor(Date.now() / 1000) + 3600 // 1 hour
  const token = RtcTokenBuilder.buildTokenWithUserAccount(
    appId,
    appCertificate,
    channel,
    uid || '',
    RtcRole.PUBLISHER,
    expireTs,
    expireTs
  )

  res.json({ token, expireTs })
}
