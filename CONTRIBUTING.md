# Contributing to Repo Emulator

Thank you for your interest in contributing to Repo Emulator! This document provides guidelines and instructions for contributing.

## 🌟 Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to help us foster an open and welcoming community.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Commit Messages](#commit-messages)
- [Community](#community)

## 🚀 Getting Started

### Finding Issues to Work On

- Look for issues labeled [`good first issue`](https://github.com/yourusername/repo-emulator/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) or [`help wanted`](https://github.com/yourusername/repo-emulator/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)
- Check our [roadmap](README.md#roadmap) for planned features
- Feel free to open a new issue to discuss your ideas

### Claiming an Issue

1. Comment on the issue to let others know you're working on it
2. Wait for a maintainer to assign it to you
3. Start working on your solution

## 💻 Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

### Setting Up the Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/repo-emulator.git
cd repo-emulator

# Install dependencies
npm install

# Create a branch for your feature
git checkout -b feature/your-feature-name

# Start development mode (if applicable)
npm run dev
```

### Building the Project

```bash
# Build the project
npm run build

# Build in watch mode
npm run build:watch
```

## 🔄 Pull Request Process

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our coding standards
4. **Write tests** for new functionality
5. **Ensure all tests pass**:
   ```bash
   npm test
   ```
6. **Update documentation** if needed
7. **Commit your changes** with clear commit messages
8. **Push** to your fork
9. **Open a Pull Request** with a clear description of changes

### PR Requirements

- [ ] Code follows the project's style guidelines
- [ ] Tests are added/updated and passing
- [ ] Documentation is updated
- [ ] No breaking changes (or clearly documented if unavoidable)
- [ ] PR description explains the what and why

### Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged

## 📝 Coding Standards

### General Guidelines

- Follow existing code style and conventions
- Write clear, readable code with meaningful variable names
- Keep functions small and focused
- Add comments for complex logic (but prefer self-documenting code)
- Use TypeScript types appropriately (if using TypeScript)

### Code Style

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run format
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration

# Run tests in watch mode
npm run test:watch
```

### Writing Tests

- Write unit tests for all new functions
- Add integration tests for feature workflows
- Include edge cases and error scenarios
- Aim for high code coverage (but prioritize meaningful tests)

Example test structure:

```typescript
describe('CommandName', () => {
  describe('when valid input', () => {
    it('should perform expected action', () => {
      // Arrange
      // Act
      // Assert
    });
  });

  describe('when invalid input', () => {
    it('should throw appropriate error', () => {
      // Test error handling
    });
  });
});
```

## 📚 Documentation

### Updating Documentation

- Update README.md for user-facing changes
- Add JSDoc/TSDoc comments for public APIs
- Update inline code comments for complex logic
- Add examples for new features

### Documentation Guidelines

- Keep documentation clear and concise
- Include code examples where helpful
- Document parameters, return values, and exceptions
- Keep changelog updated for significant changes

## ✍️ Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(commands): add merge command implementation

Add merge functionality with conflict detection.

Closes #123

---

fix(core): resolve issue with branch switching

Properly handle uncommitted changes when switching branches.

---

docs(readme): update installation instructions

Add detailed prerequisites and setup steps.
```

## 🤝 Community

### Getting Help

- Join our [Discussions](https://github.com/yourusername/repo-emulator/discussions)
- Ask questions in issues (tagged with `question`)
- Reach out to maintainainers

### Reporting Bugs

Use our [bug issue template](.github/ISSUE_TEMPLATE/bug_report.md) when reporting bugs.

### Suggesting Features

Use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) to suggest new features.

## 📜 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to Repo Emulator! 🎉
