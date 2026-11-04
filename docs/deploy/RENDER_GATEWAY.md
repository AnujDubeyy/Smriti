# Smriti voice gateway — Render free deployment

## What this deploys

This Blueprint deploys `services/realtime-gateway`: a consent-ticketed PCM16 WebSocket proxy for Gnani Prisma streaming STT. It **does not deploy the Next.js Smriti website**, the Gemini conversation controller, or Gnani Timbre TTS. These live in `apps/web`. The current feature branch includes the gateway and ticket API, but the public voice UI has not yet been wired to it on this branch.

The gateway is deliberately **locked until credentials are configured**. `GET /health` returns HTTP 200 with `ready:false` if required variables are absent. WebSocket upgrades fail with 503 until configured.

## Deploy a free gateway

1. Open [Deploy this branch to Render](https://render.com/deploy?repo=https://github.com/AnujDubeyy/Smriti/tree/feature/smriti-care-voice-gateway).
2. Authenticate and authorize GitHub access to `AnujDubeyy/Smriti`. Select this feature branch, not `main`.
3. Render reads the root `render.yaml`; review that it creates only one `smriti-voice-gateway` Node web service on `plan: free`.
4. Create the service. Before adding keys, `https://YOUR-SERVICE.onrender.com/health` should return `{"ok":true,"ready":false,"service":"smriti-gnani-stream"}`.
5. In **Render → smriti-voice-gateway → Environment**, set the variables below, then redeploy.

| Render environment variable | Value |
| --- | --- |
| `GNANI_API_KEY_ID` | Your key from https://app.gnani.ai/voice |
| `SMRITI_GATEWAY_SECRET` | A random 32+ character secret, e.g. from `openssl rand -hex 32` run locally |
| `SMRITI_ALLOWED_ORIGIN` | Comma-separated exact browser origins, e.g. `http://localhost:3000,https://your-smriti-site.vercel.app` |

Keep all secrets in the hosting dashboard, never in the public repo. The `SMRITI_GATEWAY_SECRET` must be copied to the Next.js application's server environment as the identical value.

## Connect the Next.js app (after voice client integration)

In the Smriti Next.js project's server/environment settings, set:
- `SMRITI_GATEWAY_SECRET`: same exact secret as Render.
- `NEXT_PUBLIC_SMRITI_GATEWAY_URL`: `wss://YOUR-SERVICE.onrender.com/ws` (this is a public endpoint URL, not an API key).
- `GNANI_API_KEY_ID`: Gnani key for server-side Timbre REST and any existing server-side STT calls.
- `GEMINI_API_KEY`: key from https://aistudio.google.com/apikey for narrative generation.

The frontend needs to issue `POST /api/v1/voice/realtime-ticket` with an authorized live voice session, connect to the WebSocket using subprotocols `smriti.v1` and `ticket.<signed ticket>`, send PCM16LE 16 kHz 1024-byte frames, and consume transcript events. This is **not yet connected in this feature branch's voice UI**.

## Verify and troubleshoot

- `GET /health` returns `ready:true` only when the gateway has key, secret, and allowed origins.
- Successful `ready:true` does not guarantee Gnani credentials or provider voice access work. Test an actual authorized streaming session.
- The `Origin` must exactly match an entry in `SMRITI_ALLOWED_ORIGIN`, including scheme and port.
- Free Render web services can spin down after 15 minutes of inactivity, delaying first call. Provider STT and TTS credits are billed/limited separately.
- This is a synthetic-data prototype. Do not send identifiable patients' medical information using free-tier AI credentials.
