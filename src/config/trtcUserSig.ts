import { deflate } from 'pako'

/**
 * Client-side TRTC UserSig generator.
 * ⚠️  FOR LOCAL TESTING ONLY — never expose SecretKey in production.
 *
 * Algorithm: https://github.com/Tencent-RTC/tls-sig-api-v2-node
 * 1. Build string to sign
 * 2. HMAC-SHA256 with SecretKey → base64
 * 3. Build JSON, zlib-deflate, base64 with TRTC url-safe substitutions
 */
export async function genTRTCUserSig(
  sdkAppId: number,
  secretKey: string,
  userId: string,
  expireSeconds = 604800  // 7 days
): Promise<string> {
  const currTime = Math.floor(Date.now() / 1000)

  // Step 1 — string to sign (must match this exact format)
  const stringToSign = [
    `TLS.identifier:${userId}`,
    `TLS.sdkappid:${sdkAppId}`,
    `TLS.time:${currTime}`,
    `TLS.expire:${expireSeconds}`,
  ].join('\n') + '\n'

  // Step 2 — HMAC-SHA256 via Web Crypto API
  const keyBytes = new TextEncoder().encode(secretKey)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sigBytes = await crypto.subtle.sign(
    'HMAC', cryptoKey, new TextEncoder().encode(stringToSign)
  )
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))

  // Step 3 — build JSON
  const json = JSON.stringify({
    'TLS.ver': '2.0',
    'TLS.identifier': userId,
    'TLS.sdkappid': sdkAppId,
    'TLS.time': currTime,
    'TLS.expire': expireSeconds,
    'TLS.sig': sigBase64,
  })

  // Step 4 — zlib deflate + base64 + TRTC url-safe substitutions (+ → * / → - = → _)
  const compressed = deflate(new TextEncoder().encode(json))
  const b64 = btoa(String.fromCharCode(...compressed))
  return b64.replace(/\+/g, '*').replace(/\//g, '-').replace(/=/g, '_')
}
