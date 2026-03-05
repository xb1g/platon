export interface MockSession {
  id: string;
  tenantId: string;
  agentId: string;
  sessionId: string;
  task: { kind: string; summary: string };
  outcome: { status: "success" | "failed" | "partial"; summary: string };
  tools: { name: string; category: string }[];
  events: { type: string; summary: string }[];
  artifacts: { kind: string; uri: string; summary?: string }[];
  errors: { message: string; code?: string; retryable: boolean }[];
  humanFeedback?: { rating: number; summary: string };
  createdAt: string;
  duration: number; // seconds
}

export interface MockLearning {
  id: string;
  title: string;
  confidence: number;
  sessionId: string;
  agentId: string;
  tactics: string[];
  createdAt: string;
  type: "learning" | "failure" | "success_pattern";
}

export interface MockReflection {
  sessionId: string;
  wentWell: string[];
  wentWrong: string[];
  likelyCauses: string[];
  reusableTactics: string[];
  learnings: { title: string; confidence: number }[];
  confidence: number;
}

const agents = [
  "code-reviewer-v3",
  "deploy-agent-v2",
  "test-runner-v1",
  "data-pipeline-agent",
  "security-scanner",
  "doc-generator",
  "api-integrator",
  "perf-optimizer",
];

const toolNames = [
  "git-diff",
  "eslint",
  "jest-runner",
  "docker-deploy",
  "kubectl",
  "pg-query",
  "redis-cache",
  "s3-upload",
  "openai-chat",
  "neo4j-query",
  "webhook-send",
  "file-parser",
];

export const mockSessions: MockSession[] = [
  {
    id: "sess-001",
    tenantId: "tenant-1",
    agentId: "code-reviewer-v3",
    sessionId: "sess-001",
    task: { kind: "code-review", summary: "Review PR #142 — Add user authentication middleware" },
    outcome: { status: "success", summary: "Found 3 issues, all auto-fixed. PR approved." },
    tools: [
      { name: "git-diff", category: "vcs" },
      { name: "eslint", category: "linting" },
      { name: "openai-chat", category: "llm" },
    ],
    events: [
      { type: "start", summary: "Session initiated by webhook" },
      { type: "tool_call", summary: "Fetched diff for PR #142 (47 files changed)" },
      { type: "analysis", summary: "Identified 3 security concerns in auth middleware" },
      { type: "fix", summary: "Applied auto-fix for SQL injection vulnerability" },
      { type: "fix", summary: "Added input sanitization to login handler" },
      { type: "fix", summary: "Updated CORS config to whitelist origins" },
      { type: "complete", summary: "PR approved with all fixes applied" },
    ],
    artifacts: [
      { kind: "patch", uri: "/patches/pr-142-fix.diff", summary: "Security fixes patch" },
      { kind: "report", uri: "/reports/pr-142.md", summary: "Review report" },
    ],
    errors: [],
    humanFeedback: { rating: 5, summary: "Excellent catch on the SQL injection!" },
    createdAt: "2026-03-05T09:23:00Z",
    duration: 47,
  },
  {
    id: "sess-002",
    tenantId: "tenant-1",
    agentId: "deploy-agent-v2",
    sessionId: "sess-002",
    task: { kind: "deployment", summary: "Deploy staging environment for feature/payments" },
    outcome: { status: "failed", summary: "Docker build failed — missing env variable STRIPE_KEY" },
    tools: [
      { name: "docker-deploy", category: "deployment" },
      { name: "kubectl", category: "orchestration" },
    ],
    events: [
      { type: "start", summary: "Deployment triggered via CI pipeline" },
      { type: "tool_call", summary: "Building Docker image from Dockerfile.staging" },
      { type: "error", summary: "Build failed: STRIPE_KEY not found in env" },
      { type: "retry", summary: "Attempted fallback with .env.example — still missing" },
      { type: "complete", summary: "Deployment aborted after 2 retries" },
    ],
    artifacts: [
      { kind: "log", uri: "/logs/deploy-staging-002.log", summary: "Build log" },
    ],
    errors: [
      { message: "Environment variable STRIPE_KEY is required but not set", code: "ENV_MISSING", retryable: true },
      { message: "Docker build exited with code 1", code: "BUILD_FAIL", retryable: false },
    ],
    createdAt: "2026-03-05T08:15:00Z",
    duration: 123,
  },
  {
    id: "sess-003",
    tenantId: "tenant-1",
    agentId: "test-runner-v1",
    sessionId: "sess-003",
    task: { kind: "testing", summary: "Run full test suite for release/v2.4.0" },
    outcome: { status: "partial", summary: "187/200 tests passed. 13 flaky tests skipped." },
    tools: [
      { name: "jest-runner", category: "testing" },
      { name: "pg-query", category: "database" },
    ],
    events: [
      { type: "start", summary: "Test suite triggered for release branch" },
      { type: "tool_call", summary: "Running 200 test files across 4 workers" },
      { type: "warning", summary: "13 tests marked as flaky — auto-skipped" },
      { type: "complete", summary: "Test run completed in 3m 42s" },
    ],
    artifacts: [
      { kind: "report", uri: "/reports/test-v2.4.0.html", summary: "Test results HTML" },
      { kind: "coverage", uri: "/coverage/v2.4.0/lcov.info", summary: "Code coverage" },
    ],
    errors: [],
    humanFeedback: { rating: 3, summary: "Too many flaky tests being skipped" },
    createdAt: "2026-03-04T16:45:00Z",
    duration: 222,
  },
  {
    id: "sess-004",
    tenantId: "tenant-1",
    agentId: "data-pipeline-agent",
    sessionId: "sess-004",
    task: { kind: "etl", summary: "Sync user analytics from Segment to warehouse" },
    outcome: { status: "success", summary: "Processed 1.2M events. 0 dropped." },
    tools: [
      { name: "pg-query", category: "database" },
      { name: "redis-cache", category: "cache" },
      { name: "s3-upload", category: "storage" },
    ],
    events: [
      { type: "start", summary: "Scheduled ETL job started" },
      { type: "tool_call", summary: "Fetching events from Segment API" },
      { type: "processing", summary: "Transforming 1.2M events into warehouse schema" },
      { type: "tool_call", summary: "Batch inserting into PostgreSQL (24 batches)" },
      { type: "tool_call", summary: "Uploading backup to S3" },
      { type: "complete", summary: "Pipeline completed successfully" },
    ],
    artifacts: [
      { kind: "data", uri: "s3://analytics/2026-03-04/segment-sync.parquet" },
    ],
    errors: [],
    createdAt: "2026-03-04T02:00:00Z",
    duration: 845,
  },
  {
    id: "sess-005",
    tenantId: "tenant-1",
    agentId: "security-scanner",
    sessionId: "sess-005",
    task: { kind: "security-scan", summary: "Nightly vulnerability scan on production deps" },
    outcome: { status: "success", summary: "2 low-severity CVEs found. No critical issues." },
    tools: [
      { name: "file-parser", category: "analysis" },
      { name: "webhook-send", category: "notification" },
    ],
    events: [
      { type: "start", summary: "Nightly scan triggered at 00:00 UTC" },
      { type: "analysis", summary: "Scanning 342 dependencies across 6 lockfiles" },
      { type: "finding", summary: "CVE-2026-1234: low severity in lodash@4.17.20" },
      { type: "finding", summary: "CVE-2026-5678: low severity in axios@0.21.1" },
      { type: "tool_call", summary: "Sending summary to #security Slack channel" },
      { type: "complete", summary: "Scan completed. Report generated." },
    ],
    artifacts: [
      { kind: "report", uri: "/reports/security-2026-03-04.json", summary: "Security scan report" },
    ],
    errors: [],
    createdAt: "2026-03-04T00:00:00Z",
    duration: 156,
  },
  {
    id: "sess-006",
    tenantId: "tenant-1",
    agentId: "doc-generator",
    sessionId: "sess-006",
    task: { kind: "documentation", summary: "Generate API docs for /v2/payments endpoints" },
    outcome: { status: "success", summary: "Generated OpenAPI spec + 12 example requests" },
    tools: [
      { name: "file-parser", category: "analysis" },
      { name: "openai-chat", category: "llm" },
      { name: "s3-upload", category: "storage" },
    ],
    events: [
      { type: "start", summary: "Doc generation requested via CLI" },
      { type: "tool_call", summary: "Parsing route handlers in src/routes/payments/" },
      { type: "analysis", summary: "Extracted 8 endpoints with request/response schemas" },
      { type: "tool_call", summary: "Generating example payloads with GPT-4" },
      { type: "complete", summary: "OpenAPI 3.1 spec published to docs site" },
    ],
    artifacts: [
      { kind: "spec", uri: "/docs/openapi/v2-payments.yaml", summary: "OpenAPI spec" },
      { kind: "doc", uri: "/docs/payments/README.md", summary: "Payments API guide" },
    ],
    errors: [],
    humanFeedback: { rating: 4, summary: "Good coverage, missing webhook docs" },
    createdAt: "2026-03-03T14:30:00Z",
    duration: 89,
  },
  {
    id: "sess-007",
    tenantId: "tenant-1",
    agentId: "api-integrator",
    sessionId: "sess-007",
    task: { kind: "integration", summary: "Connect Stripe webhook to order fulfillment service" },
    outcome: { status: "success", summary: "Webhook handler deployed and verified with test event" },
    tools: [
      { name: "webhook-send", category: "notification" },
      { name: "pg-query", category: "database" },
      { name: "docker-deploy", category: "deployment" },
    ],
    events: [
      { type: "start", summary: "Integration task created from Jira ticket" },
      { type: "tool_call", summary: "Creating webhook endpoint at /api/webhooks/stripe" },
      { type: "tool_call", summary: "Configuring Stripe webhook signing secret" },
      { type: "tool_call", summary: "Deploying updated service to staging" },
      { type: "tool_call", summary: "Sending test webhook event" },
      { type: "complete", summary: "Integration verified — order created from test payment" },
    ],
    artifacts: [
      { kind: "code", uri: "/src/webhooks/stripe.ts", summary: "Webhook handler" },
    ],
    errors: [],
    createdAt: "2026-03-03T10:00:00Z",
    duration: 312,
  },
  {
    id: "sess-008",
    tenantId: "tenant-1",
    agentId: "perf-optimizer",
    sessionId: "sess-008",
    task: { kind: "optimization", summary: "Optimize slow dashboard queries (P95 > 2s)" },
    outcome: { status: "success", summary: "P95 reduced from 2.3s to 340ms. Added 3 indexes." },
    tools: [
      { name: "pg-query", category: "database" },
      { name: "redis-cache", category: "cache" },
    ],
    events: [
      { type: "start", summary: "Performance optimization triggered by alert" },
      { type: "analysis", summary: "Identified 4 slow queries via pg_stat_statements" },
      { type: "fix", summary: "Added composite index on (tenant_id, created_at)" },
      { type: "fix", summary: "Added partial index on sessions WHERE status = 'active'" },
      { type: "fix", summary: "Added covering index on learnings (agent_id, confidence)" },
      { type: "tool_call", summary: "Setting up Redis cache for dashboard aggregates" },
      { type: "complete", summary: "All queries now under 400ms at P95" },
    ],
    artifacts: [
      { kind: "migration", uri: "/migrations/20260303_add_indexes.sql", summary: "Index migration" },
    ],
    errors: [],
    humanFeedback: { rating: 5, summary: "Huge improvement! Dashboard feels instant now." },
    createdAt: "2026-03-03T08:00:00Z",
    duration: 567,
  },
  {
    id: "sess-009",
    tenantId: "tenant-1",
    agentId: "code-reviewer-v3",
    sessionId: "sess-009",
    task: { kind: "code-review", summary: "Review PR #138 — Refactor notification system" },
    outcome: { status: "partial", summary: "4 issues found, 2 auto-fixed, 2 need manual review" },
    tools: [
      { name: "git-diff", category: "vcs" },
      { name: "eslint", category: "linting" },
      { name: "openai-chat", category: "llm" },
    ],
    events: [
      { type: "start", summary: "Review requested by @sarah" },
      { type: "tool_call", summary: "Fetched diff for PR #138 (23 files)" },
      { type: "analysis", summary: "Found potential race condition in notification queue" },
      { type: "fix", summary: "Auto-fixed unused import warnings" },
      { type: "fix", summary: "Auto-fixed type assertion issues" },
      { type: "comment", summary: "Left review comment about race condition" },
      { type: "comment", summary: "Suggested architectural change for queue handling" },
      { type: "complete", summary: "Review submitted with 2 blocking comments" },
    ],
    artifacts: [
      { kind: "report", uri: "/reports/pr-138.md", summary: "Review report" },
    ],
    errors: [],
    createdAt: "2026-03-02T15:20:00Z",
    duration: 65,
  },
  {
    id: "sess-010",
    tenantId: "tenant-1",
    agentId: "deploy-agent-v2",
    sessionId: "sess-010",
    task: { kind: "deployment", summary: "Production release v2.3.1 hotfix" },
    outcome: { status: "success", summary: "Deployed to 3 regions. Zero-downtime rollout complete." },
    tools: [
      { name: "docker-deploy", category: "deployment" },
      { name: "kubectl", category: "orchestration" },
      { name: "webhook-send", category: "notification" },
    ],
    events: [
      { type: "start", summary: "Hotfix deployment initiated" },
      { type: "tool_call", summary: "Building production image v2.3.1" },
      { type: "tool_call", summary: "Rolling update to us-east-1" },
      { type: "tool_call", summary: "Rolling update to eu-west-1" },
      { type: "tool_call", summary: "Rolling update to ap-southeast-1" },
      { type: "health_check", summary: "All 3 regions healthy" },
      { type: "tool_call", summary: "Notified #releases channel" },
      { type: "complete", summary: "v2.3.1 live in all regions" },
    ],
    artifacts: [
      { kind: "manifest", uri: "/k8s/v2.3.1/deployment.yaml", summary: "K8s manifest" },
    ],
    errors: [],
    humanFeedback: { rating: 5, summary: "Smooth deployment, no issues!" },
    createdAt: "2026-03-02T11:00:00Z",
    duration: 445,
  },
  {
    id: "sess-011",
    tenantId: "tenant-1",
    agentId: "test-runner-v1",
    sessionId: "sess-011",
    task: { kind: "testing", summary: "Integration test suite for payments module" },
    outcome: { status: "failed", summary: "Stripe sandbox down — 42 payment tests failed" },
    tools: [
      { name: "jest-runner", category: "testing" },
      { name: "webhook-send", category: "notification" },
    ],
    events: [
      { type: "start", summary: "Integration tests triggered by merge to develop" },
      { type: "tool_call", summary: "Running payment integration tests" },
      { type: "error", summary: "Stripe sandbox API returning 503" },
      { type: "retry", summary: "Retried after 30s — still 503" },
      { type: "complete", summary: "42 tests failed due to external dependency" },
    ],
    artifacts: [
      { kind: "report", uri: "/reports/payments-integration.html", summary: "Test report" },
    ],
    errors: [
      { message: "Stripe sandbox API unavailable (503)", code: "EXTERNAL_DEPENDENCY", retryable: true },
    ],
    createdAt: "2026-03-02T09:30:00Z",
    duration: 98,
  },
  {
    id: "sess-012",
    tenantId: "tenant-1",
    agentId: "data-pipeline-agent",
    sessionId: "sess-012",
    task: { kind: "etl", summary: "Backfill missing user metadata from auth provider" },
    outcome: { status: "success", summary: "Backfilled 15,423 user records with enriched profiles" },
    tools: [
      { name: "pg-query", category: "database" },
      { name: "redis-cache", category: "cache" },
    ],
    events: [
      { type: "start", summary: "Backfill job requested via admin panel" },
      { type: "tool_call", summary: "Querying auth provider for user metadata" },
      { type: "processing", summary: "Matching 15,423 users by email hash" },
      { type: "tool_call", summary: "Batch updating PostgreSQL user_profiles table" },
      { type: "complete", summary: "Backfill complete. Cache invalidated." },
    ],
    artifacts: [],
    errors: [],
    createdAt: "2026-03-01T22:00:00Z",
    duration: 1234,
  },
];

export const mockLearnings: MockLearning[] = [
  {
    id: "learn-001",
    title: "Always validate environment variables before Docker builds",
    confidence: 0.95,
    sessionId: "sess-002",
    agentId: "deploy-agent-v2",
    tactics: ["Pre-flight env check", "Fail fast with clear error message", "List required vars in Dockerfile"],
    createdAt: "2026-03-05T08:20:00Z",
    type: "failure",
  },
  {
    id: "learn-002",
    title: "Composite indexes significantly improve multi-tenant query performance",
    confidence: 0.92,
    sessionId: "sess-008",
    agentId: "perf-optimizer",
    tactics: ["Add (tenant_id, created_at) composite index", "Use partial indexes for status filters", "Cache aggregate queries in Redis"],
    createdAt: "2026-03-03T08:30:00Z",
    type: "success_pattern",
  },
  {
    id: "learn-003",
    title: "SQL injection in auth middleware is a common pattern in PR reviews",
    confidence: 0.88,
    sessionId: "sess-001",
    agentId: "code-reviewer-v3",
    tactics: ["Check for parameterized queries", "Flag string concatenation in SQL", "Suggest ORM usage"],
    createdAt: "2026-03-05T09:30:00Z",
    type: "learning",
  },
  {
    id: "learn-004",
    title: "Flaky tests should be quarantined, not skipped silently",
    confidence: 0.78,
    sessionId: "sess-003",
    agentId: "test-runner-v1",
    tactics: ["Tag flaky tests with @flaky decorator", "Run quarantined tests in separate CI job", "Track flaky test trends over time"],
    createdAt: "2026-03-04T17:00:00Z",
    type: "learning",
  },
  {
    id: "learn-005",
    title: "External API dependencies need circuit breakers in test suites",
    confidence: 0.91,
    sessionId: "sess-011",
    agentId: "test-runner-v1",
    tactics: ["Implement circuit breaker pattern", "Use mock servers for integration tests", "Add fallback test results for known outages"],
    createdAt: "2026-03-02T10:00:00Z",
    type: "failure",
  },
  {
    id: "learn-006",
    title: "Zero-downtime deployments require health checks on all regions",
    confidence: 0.96,
    sessionId: "sess-010",
    agentId: "deploy-agent-v2",
    tactics: ["Wait for health check pass before next region", "Use readiness probes", "Implement automatic rollback on failure"],
    createdAt: "2026-03-02T11:30:00Z",
    type: "success_pattern",
  },
  {
    id: "learn-007",
    title: "Race conditions in notification queues cause duplicate sends",
    confidence: 0.72,
    sessionId: "sess-009",
    agentId: "code-reviewer-v3",
    tactics: ["Use idempotency keys", "Implement distributed locks", "Add deduplication at consumer level"],
    createdAt: "2026-03-02T15:30:00Z",
    type: "learning",
  },
  {
    id: "learn-008",
    title: "Batch operations over 10K records should use cursor pagination",
    confidence: 0.89,
    sessionId: "sess-012",
    agentId: "data-pipeline-agent",
    tactics: ["Use keyset pagination instead of OFFSET", "Process in batches of 1000", "Report progress incrementally"],
    createdAt: "2026-03-01T22:30:00Z",
    type: "success_pattern",
  },
  {
    id: "learn-009",
    title: "OpenAPI specs should include example payloads for every endpoint",
    confidence: 0.85,
    sessionId: "sess-006",
    agentId: "doc-generator",
    tactics: ["Generate examples from Zod schemas", "Include error response examples", "Add webhook payload examples"],
    createdAt: "2026-03-03T15:00:00Z",
    type: "learning",
  },
  {
    id: "learn-010",
    title: "Webhook signature verification prevents replay attacks",
    confidence: 0.94,
    sessionId: "sess-007",
    agentId: "api-integrator",
    tactics: ["Always verify Stripe-Signature header", "Use timing-safe comparison", "Log failed verification attempts"],
    createdAt: "2026-03-03T10:30:00Z",
    type: "success_pattern",
  },
  {
    id: "learn-011",
    title: "CVE scanning should include transitive dependencies",
    confidence: 0.82,
    sessionId: "sess-005",
    agentId: "security-scanner",
    tactics: ["Scan full dependency tree, not just direct deps", "Auto-open PRs for patch-level updates", "Integrate with GitHub security advisories"],
    createdAt: "2026-03-04T00:10:00Z",
    type: "learning",
  },
  {
    id: "learn-012",
    title: "ETL pipelines need idempotent upserts for reliability",
    confidence: 0.93,
    sessionId: "sess-004",
    agentId: "data-pipeline-agent",
    tactics: ["Use ON CONFLICT DO UPDATE", "Track sync watermarks", "Implement exactly-once semantics with dedup keys"],
    createdAt: "2026-03-04T02:30:00Z",
    type: "success_pattern",
  },
];

export const mockReflections: Record<string, MockReflection> = {
  "sess-001": {
    sessionId: "sess-001",
    wentWell: [
      "Quickly identified SQL injection vulnerability",
      "Auto-fix was applied correctly without breaking tests",
      "CORS config update was appropriately scoped",
    ],
    wentWrong: [],
    likelyCauses: [],
    reusableTactics: [
      "Pattern-match SQL string concatenation in auth routes",
      "Always check CORS origins against allowlist",
    ],
    learnings: [
      { title: "SQL injection in auth middleware is common", confidence: 0.88 },
    ],
    confidence: 0.92,
  },
  "sess-002": {
    sessionId: "sess-002",
    wentWell: [
      "Error message was clear and actionable",
    ],
    wentWrong: [
      "Did not pre-validate environment variables",
      "Retry logic attempted same invalid state",
    ],
    likelyCauses: [
      "No env validation step in deployment pipeline",
      "Retry strategy doesn't distinguish between transient and permanent failures",
    ],
    reusableTactics: [
      "Add pre-flight env check before Docker build",
      "Classify errors as retryable vs permanent",
    ],
    learnings: [
      { title: "Always validate env vars before Docker builds", confidence: 0.95 },
    ],
    confidence: 0.85,
  },
};

export const chartData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date("2026-02-04");
  date.setDate(date.getDate() + i);
  const base = 8 + Math.floor(Math.random() * 12);
  return {
    date: date.toISOString().slice(5, 10),
    sessions: base,
    success: Math.floor(base * (0.6 + Math.random() * 0.3)),
    failed: Math.floor(base * (0.05 + Math.random() * 0.15)),
  };
});

export const activityFeed = [
  { id: "act-1", type: "success", agent: "code-reviewer-v3", summary: "PR #142 approved with 3 auto-fixes", time: "2 min ago" },
  { id: "act-2", type: "failed", agent: "deploy-agent-v2", summary: "Staging deploy failed — missing STRIPE_KEY", time: "15 min ago" },
  { id: "act-3", type: "learning", agent: "perf-optimizer", summary: "New learning: composite indexes for multi-tenant queries", time: "1 hr ago" },
  { id: "act-4", type: "success", agent: "data-pipeline-agent", summary: "Synced 1.2M Segment events to warehouse", time: "3 hr ago" },
  { id: "act-5", type: "success", agent: "security-scanner", summary: "Nightly scan complete — 2 low-severity CVEs", time: "5 hr ago" },
  { id: "act-6", type: "success", agent: "doc-generator", summary: "Generated OpenAPI spec for /v2/payments", time: "8 hr ago" },
  { id: "act-7", type: "partial", agent: "test-runner-v1", summary: "187/200 tests passed, 13 flaky skipped", time: "12 hr ago" },
  { id: "act-8", type: "success", agent: "api-integrator", summary: "Stripe webhook integration verified", time: "1 day ago" },
  { id: "act-9", type: "success", agent: "perf-optimizer", summary: "Dashboard P95 reduced from 2.3s to 340ms", time: "1 day ago" },
  { id: "act-10", type: "failed", agent: "test-runner-v1", summary: "42 payment tests failed — Stripe sandbox down", time: "2 days ago" },
];

export const agentStats = agents.slice(0, 6).map((name) => ({
  name,
  sessions: Math.floor(10 + Math.random() * 40),
  successRate: Math.floor(65 + Math.random() * 30),
}));

export const sparklineData = (base: number, variance: number, points = 12) =>
  Array.from({ length: points }, () => base + (Math.random() - 0.5) * variance * 2);
