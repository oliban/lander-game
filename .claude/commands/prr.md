---
description: Review a PR, automatically fix issues, and re-review
---

You are an expert code reviewer AND implementer. This command combines review with automatic fixes.

## Process

### Phase 1: Initial Review
Execute the full `/review` process:
1. Sync codebase (`git fetch origin`, `gh pr checkout $ARGUMENTS`)
2. Get PR information (`gh pr view`, `gh pr diff`)
3. Deep codebase analysis (use Task tool with subagent_type='Explore')
4. Code review analysis
5. Post initial review comment to PR

### Phase 2: Implement Fixes
After the review, IMMEDIATELY start fixing all identified issues:

#### For **MISSING TESTS**:
- Create test files following existing test patterns in `tests/` directory
- Cover all new functions/methods with tests
- Include edge cases (null, zero, empty string, boundary values)
- Run tests to verify they pass: `npm test`

#### For **DUPLICATION DETECTED**:
- Refactor to use the existing code identified in the review
- Remove the duplicated implementation
- Update imports as needed

#### For **REUSE OPPORTUNITY**:
- Evaluate if the suggestion improves the code
- If yes, refactor to use the existing utility/pattern
- If no, document why in the PR comment

#### For **Security Issues**:
- Fix immediately - these are blocking

#### For **Code Quality Issues**:
- Fix bugs and type errors
- Improve error handling where flagged

After each fix:
- Run `npm test` to ensure nothing is broken
- Run `npm run build` if applicable

### Phase 3: Commit Changes
After all fixes are implemented:
1. Stage the changes: `git add .`
2. Create a commit with message describing fixes:
   ```
   Address PR review feedback

   - Add tests for [new functions]
   - [Other fixes made]

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
   ```
3. Push to the PR branch: `git push`

### Phase 4: Re-Review
After pushing fixes, perform a fresh review:
1. Run `gh pr diff $ARGUMENTS` to see updated changes
2. Verify all previous issues are resolved
3. Check for any new issues introduced

### Phase 5: Post Final Review
Post a new comment to the PR with:

```
## Re-Review After Fixes

### Changes Made
- [List each fix implemented]

### Verification
- [ ] Tests added and passing
- [ ] Build successful
- [ ] No new issues introduced

### Manual Test Plan
The following manual tests are recommended before merging:

1. **[Feature/Area]**: [Specific test steps]
   - Expected: [Expected behavior]

2. **[Feature/Area]**: [Specific test steps]
   - Expected: [Expected behavior]

[Add 3-5 specific manual test scenarios based on what the PR changes]

---

✅ **Approved** - All issues resolved, ready to merge.

🤖 Review by Claude Code
```

### Phase 6: Merge (with user approval)
After posting the final review comment, ask the user if they want to merge:

1. Use the AskUserQuestion tool to prompt:
   - Question: "PR is approved and ready. Merge now?"
   - Options: "Yes, squash merge" / "No, I'll merge manually"

2. If user approves:
   ```
   gh pr merge $ARGUMENTS --squash --delete-branch
   ```

3. Confirm merge success and return to main branch:
   ```
   git checkout main && git pull
   ```

## Important Notes
- Do NOT ask for permission to make fixes - just do them
- Do NOT commit without running tests first
- If a fix would require major refactoring, flag it and ask the user instead of implementing
- Always push changes to the existing PR branch, never create a new branch
- Merge step requires explicit user approval - will NOT auto-merge without confirmation
- Code structure and style must remain consistent with the existing codebase - preserve established patterns
