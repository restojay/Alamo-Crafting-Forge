# Security TODO

## URGENT: Credential Rotation Required

### gptaccess.txt — Password Exposed in Git History

The file `gptaccess.txt` was previously committed to the git repository and contains a plaintext
password. The file has been removed from tracking (via `.gitignore` + `git rm --cached`) but the
password **remains in git history** until history is rewritten.

**Actions required:**

1. **Rotate the password** stored in `gptaccess.txt` immediately — treat it as compromised.
2. **Optionally rewrite git history** using `git filter-repo` or BFG Repo Cleaner to scrub the
   file from all historical commits. Coordinate with any contributors before doing this — it is a
   destructive, force-push operation.
   ```bash
   # Example using git-filter-repo (preferred)
   pip install git-filter-repo
   git filter-repo --path gptaccess.txt --invert-paths
   git push origin --force --all
   ```
3. If the password was reused anywhere else (other services, APIs), rotate those credentials too.

**References:**
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- https://github.com/newren/git-filter-repo
