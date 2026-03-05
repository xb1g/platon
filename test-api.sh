#!/bin/bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-1",
    "agentId": "agent-1",
    "sessionId": "session-1",
    "task": {"kind": "test", "summary": "test task"},
    "outcome": {"status": "success", "summary": "test outcome"}
  }'
