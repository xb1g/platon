# MCP Integration

To use the Memory MCP server with Claude Desktop or other clients, add the following to your configuration:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["--import", "tsx", "/path/to/repo/apps/mcp/src/server.ts"],
      "env": {
        "MEMORY_API_URL": "http://localhost:3001",
        "PLATON_LOCAL_DEV_SUBSCRIBER_ID": "local-codex"
      }
    }
  }
}
```

## Cursor IDE (This Project)

This project includes Platon MCP integration for the coding agent:

- **Config**: `.cursor/mcp.json` — registers the `platon` MCP server
- **Rule**: `.cursor/rules/platon-agent.mdc` — instructs the agent to use Platon pre-run (retrieve context) and post-run (dump session)

**Production**: Use `MEMORY_API_URL=https://platon.bigf.me/api` and do not set `PLATON_LOCAL_DEV_SUBSCRIBER_ID`.

**Local development**: Edit `.cursor/mcp.json` and set `MEMORY_API_URL` to `http://localhost:3001` (or your local API URL). Set `PLATON_LOCAL_DEV_SUBSCRIBER_ID` only for local runs where you want to bypass real x402 verification.

**Launch path**: The current working local entrypoint is `node --import tsx apps/mcp/src/server.ts`.

**Build note**: `pnpm --filter @memory/mcp build` still succeeds, but the local MCP configuration should point at the source entrypoint above unless the package outDir is normalized.
