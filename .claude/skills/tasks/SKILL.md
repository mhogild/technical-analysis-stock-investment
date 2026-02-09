---
name: tasks
description: Decompose an implementation plan into actionable, ordered task lists for execution. Use this skill when the user wants to break down a design into work items, create a task list from a plan, generate implementation tasks, or prepare work for coding. Triggers on requests like "break this into tasks", "create task list", "decompose the plan", "/tasks", or any request to turn a technical plan into executable steps. Requires an existing spec and plan (from specify and plan skills) as input.
---

# Tasks

Decompose a technical plan into small, ordered, independently verifiable tasks. This is the third phase of spec-driven development: break the **HOW** into executable **WHAT TO DO NOW** steps.

## Prerequisites

Both must exist in `spec/`:
- Feature specification (`spec/requirements.md`) - from the specify skill
- Implementation plan (`spec/design.md` or `spec/plan.md`) - from the plan skill

If either is missing, direct the user to run `/specify` and/or `/plan` first.

## Workflow

1. Load spec, plan, and project context
2. Extract user stories, components, entities, and flows
3. Generate phased task list
4. Validate task quality
5. Write tasks to `spec/plan.md`

## Step 1: Load Context

Read these files:
- `spec/requirements.md` - user stories with priorities (P1/P2/P3)
- `spec/design.md` - components, data model, flows, file structure

Also scan the project for existing state:
- What code already exists?
- Are any phases already complete?
- What build/test infrastructure is in place?

## Step 2: Extract Work Items

From the **spec**, extract:
- User stories ordered by priority (P1 first)
- Acceptance criteria for each story
- Edge cases

From the **plan**, extract:
- Components and their file locations
- Data model entities
- Interaction flows
- Development phases
- Testing strategy

## Step 3: Generate Task List

Read [references/tasks-template.md](references/tasks-template.md) for the output format.

**Phase structure**:
1. **Setup** - Project initialization, dependency config, build verification
2. **Foundation** - Core infrastructure needed before any story (database, base components, navigation)
3. **User Stories** - One phase per story, ordered by spec priority (P1, P2, P3)
4. **Polish** - Performance, accessibility, edge cases, documentation

**Task format**: `- [ ] [T001] [P?] [US?] Description with file path`

- `[T001]` - Sequential ID
- `[P]` - Optional: marks task as parallelizable (different files, no dependency on sibling tasks)
- `[US1]` - Optional: links task to a user story (used in story phases)
- Description must be specific enough that another agent can execute it without guessing

**Task rules**:
- Every task must reference a specific file path or concrete action
- Each task should be completable in a single focused session
- Tasks within a phase can be marked `[P]` if they touch different files and have no data dependency
- Each user story phase must be independently testable
- Include a checkpoint after each phase describing how to verify completion

## Step 4: Validate Tasks

Check each task against:
- **Specificity**: Could another agent execute this without asking questions?
- **Completeness**: Do all spec requirements map to at least one task?
- **Order**: Are dependencies respected? (foundation before stories, P1 before P2)
- **Testability**: Does each story phase have a clear checkpoint?
- **Coverage**: Do tasks cover all components, entities, and flows from the plan?

Cross-reference: every functional requirement (FR-xxx) from the spec must appear in at least one task.

## Step 5: Write Output

Write the task list to: `spec/plan.md`

If `spec/plan.md` already exists with different content:
- **Replace task sections**: if it contains an older task breakdown for the same feature
- **New file**: write to `spec/<feature-name>-tasks.md` if it covers a different feature

After writing, report:
- Task file path
- Total task count
- Number of parallelizable tasks marked `[P]`
- MVP scope (which phases constitute a minimal working product)
- Recommended execution order
- Readiness for next phase (implementation)
