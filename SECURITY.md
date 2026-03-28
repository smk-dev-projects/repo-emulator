# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Repo Emulator seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via email at [security@example.com](mailto:security@example.com) or create a private vulnerability report on GitHub.

### What to Include

Please include the following information in your report:

- A clear description of the vulnerability
- Steps to reproduce the issue
- Affected versions
- Any potential impact
- If possible, suggestions for addressing the issue

### Response Timeline

- You should receive an acknowledgment of your report within **48 hours**
- We will provide a more detailed response within **5 business days** indicating the next steps
- We will keep you informed of our progress throughout the process

### Security Update Process

1. **Investigation**: We will investigate the reported vulnerability
2. **Assessment**: We'll assess the severity and potential impact
3. **Fix Development**: A fix will be developed and tested
4. **Release**: A security patch will be released
5. **Disclosure**: After the fix is available, we'll publish a security advisory

### Disclosure Policy

- We request that you keep the vulnerability confidential until we have issued a fix
- We will coordinate with you on the public disclosure timing
- We typically aim to publish advisories within 90 days of disclosure

## Security Best Practices for Contributors

If you're contributing to Repo Emulator, please follow these security best practices:

### Code Security

- Never commit sensitive information (API keys, passwords, tokens)
- Validate and sanitize all user inputs
- Use parameterized queries to prevent injection attacks
- Implement proper access controls
- Follow the principle of least privilege

### Dependency Management

- Keep dependencies up to date
- Review security advisories for dependencies
- Use `npm audit` regularly to check for vulnerabilities
- Pin dependency versions for reproducibility

### Testing

- Include security-focused test cases
- Test for common vulnerabilities (XSS, CSRF, injection, etc.)
- Perform input validation testing
- Test authentication and authorization flows

## Security Tools

We use the following tools to help maintain security:

- **npm audit**: Automated vulnerability scanning
- **Dependabot**: Automated dependency updates
- **CodeQL**: Static code analysis (if applicable)
- **ESLint**: Security-focused linting rules

## Contact

For any questions about this security policy, please contact:

- Email: [security@example.com](mailto:security@example.com)
- GitHub Security Advisories: https://github.com/yourusername/repo-emulator/security/advisories

## Acknowledgments

We would like to thank the following for their contributions to our security:

- All security researchers who responsibly disclose vulnerabilities
- The open source community for their ongoing security efforts

---

**Last Updated**: March 28, 2026
