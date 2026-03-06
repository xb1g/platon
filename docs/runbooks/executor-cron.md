# Executor Cron Runbook

This runbook defines how the autonomous executor should advance `docs/plans/2026-03-06-autonomous-agent-memory-production-plan.md` without guessing.

## Preconditions

- The plan file is the source of truth for task state.
- Only one task may be active at a time.
- Project-local worktrees must live under `.worktrees/`, which is already gitignored.
- Do not merge into a dirty primary branch when unrelated user edits overlap the task surface.

## Task State Contract

Use only these markers in task headings:

- `[ ]` not started
- `[~]` in progress in an active worktree
- `[x]` completed and reconciled into the primary working branch
- `[!]` blocked and waiting on human intervention

After every state transition, update the plan immediately and append an execution note under the task.

## Task Selection Loop

1. Open `docs/plans/2026-03-06-autonomous-agent-memory-production-plan.md`.
2. Select the first `[ ]` task whose prerequisites are already `[x]`.
3. Change that task heading from `[ ]` to `[~]`.
4. Create a fresh worktree and branch for that task.
5. Implement only the files and steps listed for that task.
6. Run the task-specific verification commands and read the full output.
7. If verification fails, mark the task `[!]`, append a blocker note, leave the worktree intact, and stop.
8. If verification passes, commit in the task worktree.
9. Merge the verified branch back into the primary branch with a non-interactive command.
10. Change the task heading from `[~]` to `[x]`.
11. Append an execution note with branch, worktree, commit, verification commands, and merge result.
12. Push only when the plan explicitly reaches the push or deploy stage.

## Worktree Creation

Use one worktree per task and keep the branch name on the `codex/` prefix:

```bash
task_id=05
task_slug=installation-masterplan
branch_name="codex/task-${task_id}-${task_slug}"
worktree_path=".worktrees/codex-task-${task_id}-${task_slug}"

git worktree add "${worktree_path}" -b "${branch_name}"
```

Rules:

- Never reuse a dirty worktree for a different task.
- If a task is blocked, leave its worktree intact for inspection.
- If the primary branch has overlapping local edits in task files, stop and hand off rather than auto-resolving surprising conflicts.

## Verification And Merge

Run exactly the verification commands listed in the task. Do not substitute a narrower command because it is faster.

After verification succeeds in the task worktree:

```bash
git -C "${worktree_path}" status --short
git -C "${worktree_path}" add <task-files>
git -C "${worktree_path}" commit -m "<task commit message>"

git checkout main
git merge --no-ff --no-edit "${branch_name}"
```

If merge conflicts appear:

- change the task marker to `[!]`
- append a short note describing the conflict
- keep the worktree intact
- stop without attempting an automatic conflict resolution against unrelated edits

## Blocker Note Format

Append a short note directly under the blocked task:

```md
Blocker note (2026-03-06T18:00:00Z):
- Verification: `pnpm --filter @memory/web test -- agent-installation.test.ts`
- Failure: homepage install contract diverged from the hosted markdown source
- Worktree: `.worktrees/codex-task-05-installation-masterplan`
```

## Execution Note Format

Append a completion note directly under the completed task:

```md
Execution note (2026-03-06T18:00:00Z):
- Branch: `codex/task-05-installation-masterplan`
- Worktree: `.worktrees/codex-task-05-installation-masterplan`
- Commit: `abc1234`
- Verification: `pnpm --filter @memory/web test -- agent-installation.test.ts`, `pnpm --filter @memory/web typecheck`
- Merge: merged into `main`
```

## Push Discipline

- Tasks 1 through 12 merge locally only.
- Task 13 is the first task allowed to push and deploy.
- After any push or deploy, run the post-deploy smoke checks before marking the task complete.
