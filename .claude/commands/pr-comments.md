---
description: Fetch PR comments, checkout code, and extract required manual tests
---

You are an AI assistant helping review pull requests.

## Steps

### Step 1: Get PR Info & Checkout Code
1. Run `gh pr view --json number,headRefName,headRepository` to get PR details
2. Run `git fetch origin`
3. Run `gh pr checkout {PR_NUMBER}` to checkout the PR branch
4. Confirm with `git branch --show-current`

### Step 2: Start Dev Server
1. Run `npm run dev` in the background so the user can test immediately
2. Note the URL where the app is running (usually http://localhost:5173 or similar)

### Step 3: Fetch All Comments
1. `gh api /repos/{owner}/{repo}/issues/{number}/comments` - PR-level comments
2. `gh api /repos/{owner}/{repo}/pulls/{number}/comments` - Review comments
3. Parse and format all comments with author, file context, and diff hunks where applicable

### Step 4: Extract Manual Test Requirements
Scan all comments for sections containing:
- "Manual Test Plan"
- "Manual Tests"
- "Test Plan"
- "Before merging"
- Numbered test steps with "Expected:" outcomes

Extract these into a dedicated section.

### Step 5: Output Format

```
## PR Ready for Testing
- **Branch**: `{branch_name}` (checked out locally)
- **Dev Server**: Running at {url}
- **Status**: Ready to test

## Comments
[Display formatted comments with @author, file context, diff hunks]

---

## ⚠️ REQUIRED: Manual Tests Before Merging

The following manual tests were specified in the PR review. **You MUST complete ALL of these before merging:**

- [ ] Test 1: [extracted from comments]
- [ ] Test 2: [extracted from comments]
- [ ] ...

**DO NOT MERGE until you have verified all tests pass.**

Quick commands:
- `npm test` - Run automated tests
```

If no manual tests are found in comments, state: "No manual tests specified in PR comments."
