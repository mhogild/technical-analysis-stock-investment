---
name: plan
description: Create or update a technical implementation plan from a feature specification. Use this skill when the user wants to design the architecture, choose a tech stack, define data models, map out components and flows, or plan HOW to build a feature that has already been specified. Triggers on requests like "plan the implementation", "create a design for", "write the technical plan", "/plan", or any request to turn requirements into a concrete technical design. Requires an existing spec (from the specify skill) as input.
---

# Plan

Turn a feature specification into a concrete technical implementation plan. This is the second phase of spec-driven development: define **HOW** to build what was specified.

## Prerequisites

A feature specification must exist in `spec/` (produced by the specify skill). If no spec exists, direct the user to run `/specify` first.

## Workflow

1. Load specification and project context
2. Research unknowns and resolve technical questions
3. Define technical context (stack, platform, constraints)
4. Design architecture, components, and data model
5. Map user stories to interaction flows
6. Document decisions and tradeoffs
7. Define testing strategy and development phases
8. Write plan to `spec/` folder

## Step 1: Load Context

Read the feature specification from `spec/requirements.md` (or the relevant spec file).

Also scan the project for existing context:
- Existing code: languages, frameworks, patterns already in use
- `spec/design.md` or `spec/plan.md`: prior design decisions
- `package.json`, `build.gradle.kts`, `Cargo.toml`, etc.: current dependencies
- README or docs: architecture notes

If the project has existing code, the plan must respect and integrate with what already exists.

## Step 2: Research & Resolve Unknowns

For each technical unknown:
1. Identify what needs clarification (SDK limitations, API availability, library choices)
2. Research using available tools (web search, documentation)
3. Document findings as: Decision, Rationale, Alternatives Considered

Ask the user about:
- Tech stack preferences (if not evident from existing code)
- Platform constraints or company standards
- Performance/scale requirements beyond what the spec states

Do not ask about things that can be inferred from the project or spec.

## Step 3: Define Technical Context

Fill in the technical context based on research and user input:
- Language/Version
- Primary Dependencies
- Storage
- Testing framework
- Target Platform
- Performance Goals (from spec NFRs)
- Constraints (from spec NFRs)

If the project already has a tech stack, use it. Only propose changes with clear justification.

## Step 4: Design Architecture

Read [references/plan-template.md](references/plan-template.md) for the output structure.

**System Architecture**:
- Draw high-level architecture as ASCII diagram showing layers and component relationships
- Identify major components with clear responsibilities
- Define component boundaries and communication patterns

**Component Breakdown** (for each major component):
- Purpose: single clear sentence
- Location: file path in project structure
- Responsibilities: bullet list of what it owns
- State: data structures or state shape if applicable

**Data Model** (for each entity):
- Purpose and key fields with types
- Relationships to other entities
- Validation rules from spec requirements

## Step 5: Map Flows

For each user story in the spec, create an interaction flow:
- Trigger: what initiates the flow
- Steps: numbered sequence showing data movement through components
- Error handling: what can fail and how to recover

Prioritize flows matching the spec's P1/P2/P3 priority order. Every functional requirement must be covered by at least one flow.

## Step 6: Document Decisions

For each significant technical decision:
- **Choice**: what was selected
- **Alternatives**: what else was considered
- **Rationale**: why this choice wins
- **Tradeoffs**: explicit gains and losses

Decisions worth documenting:
- Framework/library choices
- Architecture patterns (MVC, MVVM, Clean Architecture, etc.)
- Data storage approach
- API integration strategy
- State management approach

## Step 7: Testing Strategy & Phases

**Testing Strategy**:
- Define what gets unit tested (business logic, use cases)
- Define what gets integration tested (data flows, API calls)
- Define manual testing scenarios (UI polish, UX flows)
- Specify test commands and coverage targets

**Development Phases**:
- Break implementation into sequential phases
- Each phase should produce a working increment
- Order phases by dependency (foundations first, polish last)
- Align phases with spec priority (P1 stories before P2)

## Step 8: Write Output

Write the implementation plan to: `spec/design.md`

If `spec/design.md` already exists and covers a different feature:
- **Update**: extend existing design (if same project)
- **New file**: write to `spec/<feature-name>-design.md`

Also generate a project file structure showing where all components live.

After writing, report:
- Plan file path
- Number of components, entities, and flows designed
- Key technical decisions made
- Development phases with deliverables
- Readiness for next phase (tasks decomposition)
