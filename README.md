# Whale Tracker PAPER dashboard
Tiny zero-dependency Node service. The bot POSTs its dashboard JSON to `/api/state`
(header `x-push-token`, value = `PUSH_TOKEN` env var). `GET /api/state` returns it, `GET /` is the page.
Open-position prices are refreshed in the browser from DexScreener. No secrets or trade data in this repo. PAPER ONLY.
