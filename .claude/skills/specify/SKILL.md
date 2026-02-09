---
name: specify
description: Create or update a feature specification from a natural language description. Use this skill when the user wants to define requirements for a new feature, write a spec, capture user stories and acceptance criteria, or start the spec-driven development workflow. Triggers on requests like "specify a feature", "write requirements for", "create a spec for", "/specify", or any request to define WHAT to build and WHY before HOW.
---

# Specify

Create structured, testable feature specifications from natural language descriptions. This is the first phase of spec-driven development: define the **what** and **why** before the **how**.

## Workflow

1. Gather feature description
2. Extract key concepts (actors, actions, data, constraints)
3. Generate specification using template
4. Validate specification quality
5. Handle clarifications (max 3)
6. Write final spec to `spec/` folder

## Step 1: Gather Input

The user provides a feature description either as:
- Inline text after `/specify` (e.g., `/specify user authentication with OAuth`)
- A conversational description of what they want to build
- A reference to an existing document or idea

If the input is empty or too vague to extract any user scenarios, ask the user to describe the feature they want to build.

## Step 2: Extract Key Concepts

From the description, identify:
- **Actors**: Who uses this feature?
- **Actions**: What do they do?
- **Data**: What information is involved?
- **Constraints**: What boundaries or rules apply?
- **Context**: What existing system does this integrate with?

Check for existing specs in `spec/` to understand project context and avoid conflicts.

## Step 3: Generate Specification

Read [references/spec-template.md](references/spec-template.md) for the output structure.

Fill the template following these rules:

**User Stories**:
- Prioritize as P1/P2/P3 user journeys
- Each story must be independently testable
- Use Given/When/Then acceptance scenarios
- Include 2+ edge cases per story

**Functional Requirements**:
- Every requirement must be testable and unambiguous
- Use MUST/SHOULD/MAY language (RFC 2119)
- No implementation details (no languages, frameworks, APIs)

**Success Criteria**:
- Measurable: include specific metrics (time, percentage, count)
- Technology-agnostic: no mention of frameworks or tools
- User-focused: outcomes from user/business perspective
- Verifiable: testable without knowing implementation

**General Rules**:
- Focus on **WHAT** users need and **WHY**
- Avoid **HOW** (no tech stack, APIs, code structure)
- Written for stakeholders, not developers
- Make informed guesses using industry standards for unspecified details
- Document assumptions in the Assumptions section
- Remove sections that don't apply (don't leave "N/A" placeholders)

## Step 4: Validate Quality

After generating the spec, self-validate against these criteria:

**Content Quality**:
- No implementation details leaked in
- Focused on user value and business needs
- All mandatory sections completed (User Scenarios, Requirements, Success Criteria)

**Requirement Completeness**:
- Requirements are testable and unambiguous
- Success criteria are measurable and technology-agnostic
- Edge cases identified
- Scope clearly bounded

**Feature Readiness**:
- All functional requirements have acceptance criteria
- User scenarios cover primary flows
- No more than 3 `[NEEDS CLARIFICATION]` markers remain

If validation fails, fix issues and re-validate (max 3 iterations).

## Step 5: Handle Clarifications

For unclear aspects, follow this priority:
1. Make informed guesses based on context and document them as assumptions
2. Only mark with `[NEEDS CLARIFICATION: specific question]` when:
   - The choice significantly impacts scope or user experience
   - Multiple reasonable interpretations exist
   - No reasonable default exists

**Maximum 3 clarification markers.** Prioritize: scope > security/privacy > UX > technical details.

When clarifications exist, present them as:

```
## Question 1: [Topic]
**Context**: [relevant spec section]
**Options**:
| Option | Answer | Implications |
|--------|--------|--------------|
| A | [answer] | [impact] |
| B | [answer] | [impact] |
| C | [answer] | [impact] |
```

After user responds, update the spec and re-validate.

## Step 6: Write Output

Write the specification to: `spec/requirements.md`

If `spec/requirements.md` already exists and contains a different feature, either:
- **Update**: Merge new requirements into existing spec (if same feature/project)
- **New file**: Write to `spec/<feature-name>-requirements.md` (if separate feature)

After writing, report:
- Spec file path
- Number of user stories, requirements, and success criteria
- Any remaining clarifications
- Readiness for next phase (design/plan)

## Defaults (Don't Ask About These)

- Data retention: Industry standard for the domain
- Performance: Standard web/mobile app expectations
- Error handling: User-friendly messages with fallbacks
- Authentication: Standard session-based or OAuth2 for web apps
- Integration patterns: RESTful APIs unless specified
