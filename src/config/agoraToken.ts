// Browser-side Agora AccessToken2 generator
// ⚠️ Testing only — never expose App Certificate in production

function le16(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff])
}

function le32(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff])
}

function packStr(s: string): Uint8Array {
  const b = new TextEncoder().encode(s)
  return concat(le16(b.length), b)
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(arrays.reduce((s, a) => s + a.length, 0))
  let i = 0
  for (const a of arrays) { out.set(a, i); i += a.length }
  return out
}

async function zlibDeflate(data: Uint8Array): Promise<Uint8Array> {
  // Use pako for zlib deflate — already a dependency
  const { deflate } = await import('pako')
  return deflate(data)
}

export async function genAgoraToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: string,
  expireSeconds = 3600
): Promise<string> {
  const issueTs = Math.floor(Date.now() / 1000)
  const expireTs = issueTs + expireSeconds

  const saltArr = new Uint8Array(4)
  crypto.getRandomValues(saltArr)
  const salt = saltArr[0] | (saltArr[1] << 8) | (saltArr[2] << 16) | (saltArr[3] << 24)

  // Service RTC: type(1) + privileges(map) + channel + uid
  // privileges map: count(2) + [key(2) + val(4)] x4
  const privs = concat(
    le16(4),
    le16(1), le32(expireTs),  // join channel
    le16(2), le32(expireTs),  // publish audio
    le16(3), le32(expireTs),  // publish video
    le16(4), le32(expireTs),  // publish data
  )
  const service = concat(le16(1), privs, packStr(channelName), packStr(uid))

  // signing_info = appId + issueTs + expire + salt + serviceCount(1) + service
  const signingInfo = concat(
    packStr(appId),
    le32(issueTs),
    le32(expireTs),
    le32(salt),
    le16(1),
    service
  )

  // signature = HMAC-SHA256(appCertificate, signingInfo)
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(appCertificate),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, signingInfo as unknown as ArrayBuffer))

  // content = sig(packed) + signingInfo
  const content = concat(packStr(String.fromCharCode(...sig)), signingInfo)

  // token = '007' + base64(zlib_deflate(content))
  const compressed = await zlibDeflate(content)
  const b64 = btoa(String.fromCharCode(...compressed))
  return `007${b64}`
}
