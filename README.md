
# sabremosaic-e2e-qa

End-to-end testing project using [Playwright](https://playwright.dev/) with TypeScript.

---

## 📁 Project Structure

```
sabremosaic-e2e-qa/
├── tests/
│   ├── call-center-tests/
│   ├── xml-api-tests/
│   └── json-api-tests/
├── environment.env
├── playwright.config.ts
├── utilities/
│   ├── email-reporter.ts
│   └── distributed-test-agent.ts
├── agent-config.json
├── agent-manager.ps1
├── agent-manager.sh
├── Dockerfile
├── docker-compose.yml
└── .github/
    └── workflows/
        └── playwright.yml
```

---

## 🚀 Getting Started

### 1. **Install Dependencies**

```bash
npm install
npx playwright install
```

### 1.1 **Install/Enable Playwright CLI Workflow (Agent Mode)**

Use this when UI test case development is done in Copilot agent mode.

> Note: For this project, `playwright-cli` is a Copilot skill/workflow reference, not a separate npm package to install with `npx install playwright-cli`.

1. Ensure VS Code has GitHub Copilot and GitHub Copilot Chat enabled.
2. Open Copilot Chat and select Agent mode.
3. Install project dependencies and Playwright browsers:
```bash
npm ci
npx playwright install
```
4. Use prompts that explicitly request `playwright-cli` automation for UI test development.
5. Follow the project guide for examples and usage patterns:
  [architecture/PLAYWRIGHT_CLI_GUIDE.md](architecture/PLAYWRIGHT_CLI_GUIDE.md)

Example prompt:

```text
Use playwright-cli to generate UI test skeleton for TC1 login flow with page object + spec updates.
```

### 2. **Install Allure Packages**

Install the Allure command-line tool and the Allure Playwright reporter to generate and view Allure reports:

```bash
npm install --save-dev allure-playwright
npm install --save-dev allure-commandline
```

To generate and open the Allure report after a test run:

```bash
npx allure generate allure-results --clean -o allure-reports
npx allure open allure-reports
```

### 3. **Set Environment Variables**

Create a file named `environment.env` in the root directory and define:

```
ENVIRONMENT=your_environment
SUBENVIRONMENT=your_subenvironment
TENANT=your_tenant
```

### 4. **Run All Tests**

```bash
npx playwright test
```

### 5. **Run Specific Project Tests**

```bash
npx playwright test --project=call-center
npx playwright test --project=xml-api
npx playwright test --project=json-api
```

### 6. **Run Tests by Tag**

```bash
npx playwright test --grep "@TagName"
```

### 7. **Run a Specific Spec File**

```bash
npx playwright test tests/xml-api-tests/createordertest.spec.ts
npx playwright test tests/json-api-tests/createordertest.spec.ts
npx playwright test tests/call-center-tests/createordertest.spec.ts
npx playwright test tests/call-center-tests/createordertest.spec.ts --headed  # launch browser in headed mode
```

---

## ⚙️ Configuration Highlights

- **Test Directory**: `./tests`
- **Timeouts**:
  - Test timeout: 15 minutes
  - Expect timeout: 60 seconds
- **Parallel Execution**: Fully parallel unless in CI
- **Retries**: 0 (no retries)
- **Headless Mode**: Enabled
- **Viewport**: Full screen
- **Launch Options**: Maximized window

---

## 📊 Reporting

- **HTML Report**: Saved in `playwright-report/`
- **List Reporter**: Console output
- **Email Reporter**: Custom reporter in `utilities/email-reporter.ts`
- **Allure Report**:
  - Results saved in `allure-results/`
  - Includes environment info from `environment.env`

---

## 🧪 Debugging Tools

- **Trace Viewer**: Enabled on first retry
- **Screenshots**: Captured only on failure

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Allure Playwright Integration](https://github.com/allure-framework/allure-playwright)
- [Playwright CLI Guide (Project)](architecture/PLAYWRIGHT_CLI_GUIDE.md)

---

## 🤖 Agent Setup Guide

This project supports multiple types of test agents for different execution scenarios:

### 1. **Local Agent (Default)**
Run tests on your local machine:
```bash
npm test                    # Run all tests
npm run test:call-center    # Browser tests only
npm run test:xml-api        # XML API tests only  
npm run test:json-api       # JSON API tests only
```

### 2. **Docker Agents**
Containerized test execution with dedicated agents per test type:

**Setup:**
```powershell
npm run agent:setup
```

**Start agents:**
```powershell
npm run agent:start
```

**Check status:**
```powershell
npm run agent:status
```

**View logs:**
```powershell
npm run agent:logs
```

**Stop agents:**
```powershell
npm run agent:stop
```

### 3. **Distributed Test Agent**
Coordinate tests across multiple workers with automatic retry logic:

```bash
npm run test:distributed
```

Features:
- ✅ Automatic load balancing
- ✅ Retry mechanism with configurable attempts
- ✅ Parallel execution for API tests
- ✅ Sequential execution for UI tests
- ✅ Comprehensive logging and reporting

### 4. **CI/CD Agents**

**GitHub Actions:**
- Automatically triggers on push/PR to main branches
- Matrix strategy for parallel project execution
- Artifact collection for reports
- Manual workflow dispatch with project selection

**Azure DevOps:**
- Multi-stage pipeline with test matrix
- Artifact publishing for reports
- Scheduled execution support
- Variable group integration

### 5. **Agent Configuration**

Customize agent behavior via [`agent-config.json`](agent-config.json):

```json
{
  "agents": {
    "browser-agent": {
      "projects": ["call-center"],
      "maxWorkers": 2,
      "retries": 2,
      "timeout": 30000
    },
    "api-agent": {
      "projects": ["xml-api", "json-api"], 
      "maxWorkers": 4,
      "retries": 1,
      "parallel": true
    }
  }
}
```

## 🚀 Quick Start with Agents

1. **For local development:**
   ```bash
   npm test
   ```

2. **For containerized execution:**
   ```powershell
   npm run agent:setup
   npm run agent:start
   ```

3. **For distributed testing:**
   ```bash
   npm run test:distributed
   ```

4. **For CI/CD:**
   - Push to main branch (auto-triggers)
   - Or manually dispatch via GitHub Actions UI
