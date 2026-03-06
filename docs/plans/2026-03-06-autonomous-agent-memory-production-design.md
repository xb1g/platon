# Autonomous Agent Memory Production Design

## Goal

Turn Platon from a scaffolded memory pipeline into a production system that can honestly support this claim:

> Agents improve overnight from prior runs with low human intervention, and the platform proves that improvement with automated checks.

This design assumes a rigorous bar:

- no hand-wavy "it should help"
- no production claim without measurable lift
- no autonomy claim without automated governance
- no "finished" claim while key components are still stubs

## Current Reality

The current codebase has the skeleton of the product:

- API ingestion for session dumps
- worker-based async reflection queue
- graph persistence into Neo4j
- graph retrieval scoped by namespace
- MCP surface and Claude hook examples
- tests for API, worker, MCP, and shared schemas

The current codebase does not yet satisfy the product claim:

- reflection is heuristic, not model-driven
- vector retrieval is unimplemented
- retrieval quality is basic substring matching
- there is no live end-to-end smoke suite against real infra
- there is no memory hygiene or contradiction suppression
- there is no evaluation harness proving memory improves agent outcomes
- there is no unattended overnight orchestration to validate and repair the system

## Product Thesis

The product is not merely "persistent storage for agent logs." It is a learning control system.

The system must:

1. capture task outcomes with enough structure to support reuse
2. transform raw runs into high-quality reusable memory
3. retrieve the right memory at the right time
4. improve future agent outcomes
5. automatically detect when memory quality or system reliability degrades
6. repair, suppress, or escalate issues without requiring manual babysitting

If any of those fail, the product is incomplete.

## Production-Ready Definition

Platon is production ready for autonomous agent memory only when all of the following are true:

- reflection uses a real model or equivalent high-fidelity extraction path with structured outputs, retries, and quality checks
- retrieval combines graph and embedding-based relevance with defensible ranking
- agents with memory outperform agents without memory on a stable benchmark suite
- low-quality memories are automatically identified and suppressed
- cross-tenant leakage is prevented and continuously tested
- queue stalls, graph write failures, retrieval regressions, and billing/auth failures trigger automated incident workflows
- operators can replay and diagnose failures from telemetry and persisted provenance
- nightly automation runs unattended and produces actionable reports, not silent drift

## Non-Goals

This design does not optimize for:

- consumer-facing "AI memory" marketing claims without evidence
- broad multi-modal memory before text memory is trustworthy
- memory editing UI before memory quality governance exists
- general knowledge retrieval across unrelated tenants
- fully autonomous product development by the agents themselves

## System Architecture

The finished architecture should have six planes:

### 1. Ingestion Plane

Accepts structured session payloads from agents through API and MCP. Validates identity, tenant scope, payload shape, and provenance quality. Stores immutable raw session records and enqueues reflection work.

### 2. Reflection Plane

Transforms raw sessions into structured candidate memories:

- failure patterns
- success patterns
- reusable tactics
- causal hypotheses
- operator notes
- confidence scores
- provenance links

This plane must support strict JSON output contracts, retries, timeouts, fallback behavior, and reflection quality scoring.

### 3. Memory Governance Plane

Sits between reflection and retrieval. It decides whether a candidate memory should:

- be published
- be merged into an existing memory
- be decayed
- be suppressed
- be escalated for review

This plane owns dedupe, contradiction detection, freshness policy, trust weighting, and poisoning resistance.

### 4. Retrieval Plane

Combines:

- graph neighborhood retrieval
- vector similarity search
- namespace-safe filtering
- ranking based on confidence, freshness, provenance quality, conflict state, and prior usefulness

This plane returns context plus reasons for ranking so agents and operators can inspect what happened.

### 5. Evaluation Plane

Runs benchmark tasks with memory disabled and enabled. Measures:

- task success rate
- retries
- time to completion
- tool count
- operator correction rate
- repeated failure rate
- cost per successful task

This plane is the core truth source for whether the idea is fulfilled.

### 6. Operations Plane

Monitors the whole system, runs nightly checks, opens incidents, enforces rollout gates, and supports replay/debugging.

## Data Model Changes

The current graph stores namespaces, sessions, and learnings. Production requires richer nodes and relationships.

### Required graph entities

- `MemoryNamespace`
- `Session`
- `Learning`
- `Tactic`
- `FailurePattern`
- `SuccessPattern`
- `Tool`
- `Artifact`
- `EvalRun`
- `BenchmarkTask`
- `Incident`
- `MemoryQualityDecision`

### Required properties

- provenance fields for every published memory
- creation/update timestamps
- source session ids
- publishing status
- suppression reason
- quality score
- usefulness score
- contradiction group id
- decay or expiration metadata

### Required relationships

- session produced learning
- session used tool
- learning derived from artifact
- learning contradicted by learning
- eval run consumed memory
- eval run measured benchmark task
- incident linked to failing session, queue job, or retrieval path

## Reflection Quality Requirements

Reflection quality is the highest-leverage product risk.

Each reflection result must be scored along these dimensions:

- schema validity
- task specificity
- actionability
- causal clarity
- novelty
- duplication risk
- contradiction risk
- provenance completeness
- sensitivity or prompt-injection risk

Memories below threshold should not be published to retrieval.

## Retrieval Quality Requirements

Retrieval must be more than nearest-match search. It must answer:

- is this memory relevant to the current task
- is it trustworthy
- is it fresh enough
- is it specific enough
- has it helped before
- does it conflict with another memory

The ranking layer should combine:

- lexical overlap
- embedding similarity
- exact namespace match
- memory quality score
- freshness
- prior usefulness in evals or live runs
- source type boost for failure patterns when the query implies risk

## Memory Hygiene

Without memory hygiene the system will degrade autonomously.

Required hygiene jobs:

- deduplicate near-identical memories
- merge repeated evidence into existing patterns
- suppress low-confidence or stale memories
- detect contradictions
- quarantine suspicious memories from poisoned payloads
- recompute usefulness scores from live retrieval outcomes

## Evaluation Strategy

The product claim lives or dies on evaluation.

### Benchmark suite

Define a stable benchmark set of agent tasks across domains that matter:

- debugging
- deployment
- API integration
- auth failures
- dependency/version problems
- flaky external service behavior

Each benchmark task must include:

- task prompt
- expected success criteria
- tool environment
- known likely failure modes
- scoring rubric

### Experimental modes

- no-memory baseline
- graph-only retrieval
- graph-plus-vector retrieval
- graph-plus-vector-plus-hygiene

### Required metrics

- success rate
- repeated failure rate
- time to success
- cost per successful task
- number of retries
- proportion of harmful retrievals

## Installation, Delivery, And Execution Surfaces

The system needs a single installation contract that both humans and autonomous agents can fetch without repository access.

### Hosted installation contract

Publish a canonical markdown document at `/agent-installation.md` and treat it as the source of truth for:

- the short operator bootstrap prompt
- remote MCP versus direct HTTP installation choices
- the stable `agentKind` and `agentId` identity rules
- the retrieve-before / dump-after operating loop
- the x402 header requirements for paid transport

The homepage installation panel should render from the same shared content source so copy-paste guidance cannot drift from the hosted contract.

### Operator runbooks

Production readiness also requires explicit operator runbooks for:

- the cron executor that advances the implementation plan one task at a time
- staging deploys with branch discipline, smoke checks, and rollback triggers
- production deploys with release gates tied to verification and eval health

The executor runbook must describe task-state transitions, `codex/` worktree creation, verification, commit and merge behavior, and blocker handling so unattended runs remain auditable.

## Overnight Automation Design

The system needs an all-night autonomous regimen that continuously builds trust.

### Automation 1: End-to-end smoke runner

Posts synthetic and replayed sessions, waits for worker completion, confirms graph write, then retrieves context for the same domain.

### Automation 2: Reflection evaluator

Scores fresh reflections, stores quality assessments, suppresses weak memories, and opens incidents when quality drops.

### Automation 3: Memory hygiene worker

Performs dedupe, contradiction detection, decay, and stale suppression.

### Automation 4: Retrieval benchmark runner

Executes canned queries and grades relevance, ranking, namespace safety, and latency.

### Automation 5: Agent A/B evaluator

Runs benchmark tasks with memory on and off, compares outcomes, and stores lift metrics.

### Automation 6: Reliability sentinel

Checks queue health, stuck jobs, auth failures, payment failures, database connectivity, and route error rates.

### Automation 7: Incident generator

Creates a report when a gate fails, including evidence, graph ids, payload ids, logs, expected owner, and severity.

### Automation 8: Cost governor

Monitors model spend, reflection throughput, retrieval cost, and benchmark burn rate. Applies throttles or degrades gracefully if thresholds are exceeded.

### Automation 9: Data integrity checker

Finds missing provenance, orphaned sessions, duplicate edges, and invalid namespace references.

### Automation 10: Release gate evaluator

Blocks deploys or marks the build unhealthy if eval lift disappears or safety checks fail.

## Reliability Requirements

Production requires explicit SLOs:

- session ingestion success rate
- session ingestion latency
- reflection queue delay
- reflection completion rate
- graph write success rate
- retrieval latency
- retrieval empty-result rate
- benchmark lift over baseline
- false or harmful retrieval rate

Required operational capabilities:

- dashboards
- traces
- queue inspection
- replay tools
- dead-letter handling
- backfill jobs
- canary rollout
- rollback procedures

## Security And Safety Requirements

Autonomous memory is a high-risk surface because agents can poison future agents.

Required controls:

- tenant and agent identity binding
- namespace isolation tests
- payload size and content limits
- suspicious-content detection in reflections
- prompt-injection and data-exfiltration adversarial tests
- deletion, export, and audit paths
- secrets redaction before reflection and retrieval exposure
- human-review path for high-risk memory categories

## Economic Requirements

To be production worthy, the system must be economically legible.

Track:

- cost per reflected session
- cost per stored published memory
- cost per retrieval
- cost per useful retrieval
- benchmark lift per dollar
- nightly automation spend

The overnight system must justify itself through measurable quality or reliability gains.

## Rollout Strategy

### Phase 1: Truth

Build live end-to-end checks, reflection quality scoring, and benchmark evaluation before claiming value.

### Phase 2: Trust

Add memory hygiene, suppression, and observability before broadening traffic.

### Phase 3: Autonomy

Run nightly automation unattended with incident creation and hard release gates.

### Phase 4: Scale

Only after the first three phases are stable should the team optimize throughput, onboarding, and broader integrations.

## Acceptance Gates

The platform should not be described as "finished" until these gates pass:

- real model-backed reflection in production
- vector retrieval enabled and benchmarked
- one-week unattended overnight runs with no silent failures
- benchmark suite shows consistent lift over no-memory baseline
- harmful retrieval rate below agreed threshold
- zero known namespace leaks
- complete traceability from retrieval back to source session and reflection decision
- on-call runbooks validated in drills

## Recommendation

Treat Platon as an eval-driven autonomy system, not just a graph memory API.

The honest path to "fulfilled the idea" is:

1. prove memory improves agents
2. prove the system can maintain that quality overnight
3. harden every failure mode that would make those proofs untrustworthy

Until then, the codebase is a promising scaffold, not a completed production platform.
