# OpenTelemetry Collector Setup Guide

This guide explains how to run the OpenTelemetry (OTel) Collector to route traces and logs from your Node.js applications to Sentry.io.

## Architecture Overview

```
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  typing-game        │────▶│  OTel Collector      │────▶│  Sentry.io   │
│  (Frontend)         │     │  (localhost:4318)    │     │  (Frontend)  │
└─────────────────────┘     │                      │     └──────────────┘
                            │                      │
┌─────────────────────┐     │  Routes by service   │     ┌──────────────┐
│  typing-game-backend│────▶│  name to correct     │────▶│  Sentry.io   │
│  (Backend)          │     │  Sentry project      │     │  (Backend)   │
└─────────────────────┘     └──────────────────────┘     └──────────────┘
```

## Why Use an OTel Collector?

1. **Centralized Configuration**: Manage telemetry routing in one place
2. **Flexibility**: Easy to add additional destinations (e.g., Prometheus, Grafana)
3. **Data Processing**: Batch, filter, and enrich telemetry before sending
4. **Multi-Project Support**: Route different services to different Sentry projects
5. **Buffering**: Handle temporary network issues gracefully

## Prerequisites

- Docker and Docker Compose installed on your machine
- Both Node.js applications configured with OpenTelemetry SDK

## Configuration Files

### 1. `otel-collector-config.yaml`

This file configures the collector with:
- **Receivers**: Accept OTLP data via HTTP (port 4318) and gRPC (port 4317)
- **Processors**: Batch data and add resource attributes
- **Exporters**: 
  - `otlphttp/backend` - Routes to backend Sentry project
  - `otlphttp/frontend` - Routes to frontend Sentry project
  - `debug` - Logs telemetry locally for troubleshooting
- **Pipelines**: Define data flow for traces and logs

The collector routes data based on the `service.name` attribute:
- `typing-game-backend` → Backend Sentry project
- `typing-game` → Frontend Sentry project

### 2. `docker-compose.yml`

Defines the Docker container running the OTel Collector with:
- Port mappings for OTLP receivers
- Volume mount for configuration file
- Health check endpoint
- Auto-restart policy

## Setup Instructions

### Step 1: Start the OTel Collector

```bash
# From the project root directory
docker-compose up -d
```

This will:
- Pull the latest OTel Collector Contrib image
- Start the collector in detached mode
- Expose ports 4317 (gRPC) and 4318 (HTTP)

### Step 2: Verify Collector is Running

```bash
# Check container status
docker-compose ps

# View collector logs
docker-compose logs -f otel-collector

# Check health endpoint
curl http://localhost:13133
```

### Step 3: Start Your Applications

Start both Node.js applications as usual. They will now send telemetry to the local collector:

```bash
# Terminal 1 - Start backend
cd node-typing-game-backend
npm start

# Terminal 2 - Start frontend
cd node-typing-game-frontend
npm start
```

### Step 4: Verify Data Flow

1. **Check Collector Logs**: Look for incoming spans and logs
   ```bash
   docker-compose logs -f otel-collector
   ```

2. **Check Sentry**: Visit your Sentry projects to see traces and logs appearing

## Application Configuration

Both `otel.js` files have been updated to send data to the local collector:

**Before** (Direct to Sentry):
```javascript
const logExporter = new OTLPLogExporter({
  url: "https://o1161257.ingest.us.sentry.io/api/..../logs",
  headers: {
    "x-sentry-auth": "sentry sentry_key=...",
  },
});
```

**After** (Via Collector):
```javascript
const logExporter = new OTLPLogExporter({
  url: "http://localhost:4318/v1/logs",
  // No auth headers needed - collector handles authentication
});
```

## Troubleshooting

### Collector Not Starting

```bash
# Check for port conflicts
lsof -i :4318
lsof -i :4317

# View detailed logs
docker-compose logs otel-collector
```

### Applications Can't Connect

1. Ensure collector is running: `docker-compose ps`
2. Verify applications are pointing to `http://localhost:4318`
3. Check firewall settings

### No Data in Sentry

1. Check collector logs for errors:
   ```bash
   docker-compose logs otel-collector | grep -i error
   ```

2. Verify service names match routing configuration:
   - Backend should use `service.name = typing-game-backend`
   - Frontend should use `service.name = typing-game`

3. Test Sentry endpoints directly from collector container:
   ```bash
   docker exec otel-collector curl -v https://o1161257.ingest.us.sentry.io
   ```

### Enable Debug Mode

To see more details about what the collector is processing:

Edit `otel-collector-config.yaml`:
```yaml
service:
  telemetry:
    logs:
      level: debug  # Change from 'info' to 'debug'
```

Then restart:
```bash
docker-compose restart otel-collector
```

## Managing the Collector

### Stop the Collector
```bash
docker-compose down
```

### Restart the Collector
```bash
docker-compose restart otel-collector
```

### Update Configuration

After editing `otel-collector-config.yaml`:
```bash
docker-compose restart otel-collector
```

### View Metrics

The collector exposes Prometheus metrics on port 8888:
```bash
curl http://localhost:8888/metrics
```

## Advanced Configuration

### Adding Additional Destinations

To send data to multiple destinations (e.g., Sentry + Grafana), add more exporters:

```yaml
exporters:
  otlphttp/backend:
    # ... existing Sentry config ...
  
  otlphttp/grafana:
    traces_endpoint: https://your-grafana-instance/v1/traces
    headers:
      authorization: "Bearer YOUR_TOKEN"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlphttp/backend, otlphttp/frontend, otlphttp/grafana]
```

### Filtering Data

To filter out certain spans or logs:

```yaml
processors:
  filter:
    traces:
      span:
        - 'attributes["http.method"] == "OPTIONS"'
    logs:
      log_record:
        - 'severity_number < SEVERITY_NUMBER_INFO'

service:
  pipelines:
    traces:
      processors: [filter, batch, resource]
```

### Sampling

To reduce data volume:

```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 50  # Sample 50% of traces

service:
  pipelines:
    traces:
      processors: [probabilistic_sampler, batch, resource]
```

## Benefits of This Setup

✅ **Decoupled Architecture**: Applications don't need Sentry credentials  
✅ **Easy Testing**: Switch between dev/prod Sentry projects by updating collector config  
✅ **Multi-Destination**: Send to Sentry, Grafana, Jaeger simultaneously  
✅ **Data Control**: Filter, sample, and enrich before sending  
✅ **Reliability**: Collector buffers data during network issues  

## Next Steps

1. Consider running the collector in production (e.g., Kubernetes, EC2)
2. Set up monitoring for the collector itself
3. Explore additional processors (e.g., attributes, resource detection)
4. Configure retention and sampling policies

## Resources

- [OpenTelemetry Collector Documentation](https://opentelemetry.io/docs/collector/)
- [Sentry OTLP Documentation](https://docs.sentry.io/platforms/opentelemetry/)
- [OTel Collector Contrib Repository](https://github.com/open-telemetry/opentelemetry-collector-contrib)

