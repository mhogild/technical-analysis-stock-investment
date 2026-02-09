# Implementation Execution Guide

## Task Execution Protocol

For each task in `spec/plan.md`:

### Before Starting
1. Read the task description and identify target file(s)
2. Check if the file exists or needs to be created
3. Read related files for context (imports, interfaces, types)
4. Understand what the checkpoint expects

### During Execution
1. Write the code/configuration specified by the task
2. Follow patterns established in existing code
3. Keep changes focused - only do what the task says
4. Run build/lint after each task if configured

### After Completing
1. Mark the task as done: `- [x] [T001] ...`
2. Verify the phase checkpoint if this was the last task in the phase
3. Run tests if available: `npm test`, `./gradlew test`, `pytest`, etc.
4. Move to the next task

## Error Recovery

### Build Failure
1. Read the error message
2. Fix the issue in the file that caused it
3. Re-run the build
4. If stuck after 3 attempts, report the error and move on

### Test Failure
1. Read the failing test
2. Fix the implementation (not the test, unless the test is wrong)
3. Re-run the test
4. If the test was written incorrectly, fix it and document why

### Dependency Not Found
1. Check if a prerequisite task was skipped
2. If yes, complete that task first
3. If no, install the missing dependency and document it

## Phase Completion Protocol

After completing all tasks in a phase:
1. Run the phase checkpoint verification
2. If all checks pass, proceed to next phase
3. If checks fail, identify which tasks need revision
4. Fix and re-verify before proceeding
