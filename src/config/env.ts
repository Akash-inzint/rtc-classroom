export type RTCProviderName = 'agora' | 'trtc'

export const env = {
  rtcProvider: (import.meta.env.VITE_RTC_PROVIDER || 'agora') as RTCProviderName,
  agora: {
    appId: import.meta.env.VITE_AGORA_APP_ID as string || '',
    appCertificate: import.meta.env.VITE_AGORA_APP_CERTIFICATE as string || '',
    token: (import.meta.env.VITE_AGORA_TOKEN as string) || null,
  },
  trtc: {
    sdkAppId: Number(import.meta.env.VITE_TRTC_SDK_APP_ID) || 0,
    secretKey: import.meta.env.VITE_TRTC_SECRET_KEY as string || '',
    // Static UserSig fallback — only used if SecretKey is not set
    userSig: import.meta.env.VITE_TRTC_USER_SIG as string || '',
  },
}
