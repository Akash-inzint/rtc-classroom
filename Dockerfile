# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL deps (including devDeps for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .

# Build args passed at docker build time become VITE_ env vars baked into the bundle
ARG VITE_RTC_PROVIDER=agora
ARG VITE_AGORA_APP_ID
ARG VITE_AGORA_APP_CERTIFICATE
ARG VITE_AGORA_TOKEN
ARG VITE_TRTC_SDK_APP_ID
ARG VITE_TRTC_SECRET_KEY
ARG VITE_TRTC_USER_SIG

ENV VITE_RTC_PROVIDER=$VITE_RTC_PROVIDER
ENV VITE_AGORA_APP_ID=$VITE_AGORA_APP_ID
ENV VITE_AGORA_APP_CERTIFICATE=$VITE_AGORA_APP_CERTIFICATE
ENV VITE_AGORA_TOKEN=$VITE_AGORA_TOKEN
ENV VITE_TRTC_SDK_APP_ID=$VITE_TRTC_SDK_APP_ID
ENV VITE_TRTC_SECRET_KEY=$VITE_TRTC_SECRET_KEY
ENV VITE_TRTC_USER_SIG=$VITE_TRTC_USER_SIG

RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Only copy what's needed to run: built assets + server + token deps
COPY --from=builder /app/dist ./dist
COPY server.cjs ./

# No npm install needed — server.cjs uses only Node built-ins (http, fs, crypto, zlib)

EXPOSE 8080

# Runtime env vars (set via docker run -e or docker-compose / cloud env config)
# VITE_* below are only needed if you want to override at runtime (not typical —
# they are normally baked in at build time above).
# The server reads these at startup for the token API:
ENV VITE_AGORA_APP_ID=""
ENV VITE_AGORA_APP_CERTIFICATE=""
ENV PORT=8080

CMD ["node", "server.cjs"]
