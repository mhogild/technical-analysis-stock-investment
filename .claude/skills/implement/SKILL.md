---
name: implement
description: Execute implementation tasks from a task list, writing code phase-by-phase following the spec and plan. Use this skill when the user wants to start coding, execute tasks, build the feature, implement the plan, or begin development. Triggers on requests like "implement the tasks", "start building", "execute the plan", "code this up", "/implement", or any request to write actual code based on an existing task list. Requires spec, plan, and task list (from specify, plan, and tasks skills) as input.
---

# Implement

Execute the task list phase-by-phase, writing code that fulfills the specification and follows the technical plan. This is the fourth phase of spec-driven development: **BUILD** what was planned.

## Prerequisites

All three must exist in `spec/`:
- Feature specification (`spec/requirements.md`) - the WHAT
- Implementation plan (`spec/design.md`) - the HOW
- Task list (`spec/plan.md`) - the WHAT TO DO NOW

If any are missing, direct the user to run `/specify`, `/plan`, and/or `/tasks` first.

## Workflow

1. Load all spec artifacts
2. Verify project setup
3. Execute tasks phase-by-phase
4. Validate after each phase
5. Report completion

## Step 1: Load Context

Read in this order:
1. `spec/plan.md` - the task list (primary guide for what to do)
2. `spec/design.md` - architecture, components, data model (reference for how)
3. `spec/requirements.md` - user stories, acceptance criteria (reference for why)

Identify:
- Which phases exist and their order
- Which tasks are already complete (`[x]`)
- Which phase to start from (first incomplete task)
- Parallel task opportunities (`[P]` markers)

## Step 2: Verify Project Setup

Before writing feature code, confirm:
- Project builds/compiles without errors
- Dependencies are installed
- Test framework runs (even with zero tests)
- Required directories exist

If setup is incomplete, complete Phase 1 (Setup) tasks first.

## Step 3: Execute Tasks

Read [references/execution-guide.md](references/execution-guide.md) for detailed execution protocol.

**For each task**:
1. Read the task description and target file path
2. Read existing related files for context (types, interfaces, patterns)
3. Write the code specified by the task
4. Mark the task complete in `spec/plan.md`: `- [ ]` becomes `- [x]`

**Execution rules**:
- Follow the task order within each phase
- Tasks marked `[P]` within the same phase can be done in any order
- Complete ALL tasks in a phase before moving to the next
- Do not skip tasks or reorder phases
- Stay focused: only write what the task specifies, no extras

**Code quality rules**:
- Follow patterns already in the codebase
- Use consistent naming, formatting, and style
- No hardcoded strings where config/constants are appropriate
- Handle errors at system boundaries (user input, API calls, file I/O)
- Write code the plan specifies, not more

## Step 4: Phase Checkpoints

After completing all tasks in a phase:
1. Run the checkpoint verification described in the task list
2. Build the project and fix any compilation errors
3. Run tests if they exist
4. Confirm acceptance criteria for completed user stories

**If a checkpoint fails**:
- Identify which task's output is incorrect
- Fix the issue
- Re-run the checkpoint
- Do not proceed to the next phase until the checkpoint passes

## Step 5: Report Progress

After each phase, report:
- Phase completed and tasks done
- Checkpoint result (pass/fail)
- Any issues encountered and how they were resolved
- Next phase preview

After all phases are complete, report:
- Total tasks completed
- All checkpoint results
- Which spec requirements and acceptance criteria are now satisfied
- Any remaining work or known issues
- How to run/test the completed feature
