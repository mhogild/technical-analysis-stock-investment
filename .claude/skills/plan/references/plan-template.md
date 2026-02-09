# Implementation Plan: [FEATURE NAME]

**Created**: [DATE]
**Status**: Draft
**Spec**: [link to spec/requirements.md or relevant spec file]

## Summary

[1-2 sentences: primary requirement from spec + chosen technical approach]

## Technical Context

**Language/Version**: [e.g., Python 3.11, Kotlin 1.9, TypeScript 5.x]
**Primary Dependencies**: [e.g., FastAPI, Jetpack Compose, React]
**Storage**: [e.g., PostgreSQL, Room/SQLite, files, N/A]
**Testing**: [e.g., pytest, JUnit 5, Jest]
**Target Platform**: [e.g., Linux server, Android 14+, Web]
**Project Type**: [single/web/mobile/monorepo]
**Performance Goals**: [from spec NFRs, e.g., 1000 req/s, <2s load, 60fps]
**Constraints**: [from spec NFRs, e.g., <200ms p95, offline-capable, <2% battery]

## System Architecture

### High-Level Architecture

```
[ASCII diagram showing layers/components and their relationships]
```

### Component Breakdown

#### Component: [Name]
**Purpose**: [What it does]
**Location**: [File path]
**Responsibilities**:
- [Responsibility 1]
- [Responsibility 2]

**State** (if applicable):
```
[Data structure or state shape]
```

[Repeat for each major component]

## Data Model

### Entity: [Name]
**Purpose**: [What it stores]
**Key Fields**:
- [field]: [type] - [description]
- [field]: [type] - [description]

**Relationships**: [How it relates to other entities]

[Repeat for each entity]

## Key Interactions & Flows

### Flow: [Name]
**Scenario**: [Which user story/FR this implements]
**Trigger**: [What initiates this flow]

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Error Handling**:
- [Error case] -> [Recovery strategy]

[Repeat for each critical flow]

## Project Structure

```
[Directory tree showing file organization]
```

**Structure Decision**: [Why this layout was chosen]

## Design Decisions & Tradeoffs

### Decision: [Choice Made]
**Choice**: [What was selected]
**Alternatives Considered**: [Other options]
**Rationale**: [Why this choice]
**Tradeoffs**:
- Gain: [benefit]
- Lose: [cost]

[Repeat for each significant decision]

## Testing Strategy

### Verification Approach
- **Unit Tests**: [What and where]
- **Integration Tests**: [What and where]
- **Manual Testing**: [Key scenarios]

**Test Command**: [e.g., `./gradlew test`, `npm test`]
**Coverage Target**: [e.g., 80% domain layer]

## Development Phases

### Phase 1: [Name]
- [Task/deliverable]
- [Task/deliverable]

### Phase 2: [Name]
- [Task/deliverable]
- [Task/deliverable]

[Continue for all phases]

## Open Questions

- [Any remaining technical questions to resolve during implementation]

## References

- [Link to spec]
- [Link to relevant docs/APIs]
