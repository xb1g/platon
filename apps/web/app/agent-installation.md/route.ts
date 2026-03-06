import { agentInstallationMarkdown } from "@/lib/agent-installation";

export function GET() {
  return new Response(agentInstallationMarkdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'inline; filename="agent-installation.md"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
