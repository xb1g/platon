# MCP Integration

To use the Memory MCP server with Claude Desktop or other clients, add the following to your configuration:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/path/to/repo/apps/mcp/dist/server.js"],
      "env": {
        "API_URL": "http://localhost:3000"
      }
    }
  }
}
```
