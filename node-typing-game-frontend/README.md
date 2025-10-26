# node-typing-game-frontend

## What does this application do?

This frontend is a Node.js CLI client for a distributed tracing demo typing game. It:

- Fetches a list of words from the backend
- Prompts the user to type each word
- Checks spelling attempts via the backend
- Handles errors and displays results

## Instrumentation Level

- **OpenTelemetry (OTel):**
  - All API calls and game logic are instrumented with OTel spans and logs.
  - OTel context is created on the frontend and propagated to the backend for every request.
  - OTel trace and log data is exported to Sentry using OTLP exporters.
- **Sentry:**
  - All frontend errors are reported to Sentry, with OTel trace context attached for perfect correlation.
  - No Sentry spans are used; all tracing is handled by OTel.

## How to get it up and running

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the frontend game:**
   ```bash
   node game.js
   ```
3. **Environment variables:**
   - `BACKEND_URL`: (optional) URL of the backend API (default: http://localhost:3001)

## Features

- Distributed tracing: Trace context is generated on the frontend and propagated to the backend for every request.
- Error correlation: Sentry events on both sides share the same trace ID for root cause analysis.

## Observability

- All traces and errors are visible in Sentry, with full correlation between frontend and backend events.

## Demo Error Scenario

- To trigger a correlated error in Sentry (frontend and backend):
  - Type the word `dragon` and enter `error` as your input.
  - This will cause the backend to throw a simulated error, which is reported to Sentry with the correct trace context.
  - The frontend will also report the error, and both events will share the same trace ID in Sentry for root cause analysis.

---

See the backend README for details on the server and how to run the full demo.
