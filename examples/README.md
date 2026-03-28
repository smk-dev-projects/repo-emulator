# Repo Emulator Examples

This directory contains example usage of Repo Emulator.

## Examples

### Basic Usage

```bash
# Initialize a new repository
repo-emulator init my-repo

# Navigate to the repository
cd my-repo

# Create a file
echo "Hello World" > hello.txt

# Add and commit
repo-emulator add hello.txt
repo-emulator commit -m "Initial commit"

# View history
repo-emulator log
```

### Branching and Merging

```bash
# Create a new branch
repo-emulator branch feature-branch

# Switch to the branch
repo-emulator checkout feature-branch

# Make changes and commit
echo "Feature" >> hello.txt
repo-emulator add hello.txt
repo-emulator commit -m "Add feature"

# Switch back to main
repo-emulator checkout main

# Merge the feature branch
repo-emulator merge feature-branch
```

### Advanced Workflows

See individual example files for more complex scenarios.

---

**Note**: These examples are illustrative. Actual command syntax may vary based on implementation.
