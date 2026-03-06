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

## Cursor IDE (This Project)

This project includes Platon MCP integration for the coding agent:

- **Config**: `.cursor/mcp.json` — registers the `platon` MCP server
- **Rule**: `.cursor/rules/platon-agent.mdc` — instructs the agent to use Platon pre-run (retrieve context) and post-run (dump session)

**Production**: Uses `API_URL=https://platon.bigf.me/api` by default.

**Local development**: Edit `.cursor/mcp.json` and set `API_URL` to `http://localhost:3000` (or your local API URL).

**Build**: Run `pnpm --filter @memory/mcp build` before using the MCP server (or after pulling changes to `apps/mcp`).
