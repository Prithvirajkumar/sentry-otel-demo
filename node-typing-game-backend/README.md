# node-typing-game-backend

## What does this application do?

This backend powers a distributed tracing demo for a typing game. It exposes REST endpoints and a Socket.IO server to:

- Serve a list of words for the game (`/words`)
- Check spelling attempts from the frontend (`/check`)
- Emit random words to clients in real-time via Socket.IO

## Instrumentation Level

- **OpenTelemetry (OTel):**
  - All HTTP requests, spelling checks, and Socket.IO events are instrumented with OTel spans and logs.
  - OTel context is extracted from incoming requests and made active for all backend operations.
  - OTel trace and log data is exported to Sentry using OTLP exporters.
- **Sentry:**
  - All backend errors are reported to Sentry, with OTel trace context attached for perfect correlation.
  - Sentry events are flushed immediately for reliability.
  - No Sentry spans are used; all tracing is handled by OTel.

## How to get it up and running

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the backend server:**
   ```bash
   npm start
   # or
   node index.js
   ```
3. **Environment variables:**
   - `PORT`: (optional) Port to run the backend (default: 3001)
   - Sentry DSN and OTLP endpoints are preconfigured in code for demo purposes.

## Features

- Distributed tracing: Trace context is propagated from frontend to backend for every request.
- Error correlation: Sentry events on both sides share the same trace ID for root cause analysis.
- Real-time word emission: Socket.IO emits random words to connected clients.

## Observability

- All traces and errors are visible in Sentry, with full correlation between frontend and backend events.

## Demo Error Scenario

- To trigger a correlated error in Sentry (frontend and backend):
  - Type the word `dragon` and enter `error` as your input.
  - This will cause the backend to throw a simulated error, which is reported to Sentry with the correct trace context.
  - The frontend will also report the error, and both events will share the same trace ID in Sentry for root cause analysis.

---

See the frontend README for details on the client and how to run the full demo.
