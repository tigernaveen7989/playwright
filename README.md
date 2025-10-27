
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
│   └── email-reporter.ts
```

---

## 🚀 Getting Started

### 1. **Install Dependencies**

```bash
npm install
```

### 2. **Set Environment Variables**

Create a file named `environment.env` in the root directory and define:

```
ENVIRONMENT=your_environment
SUBENVIRONMENT=your_subenvironment
TENANT=your_tenant
```

### 3. **Run All Tests**

```bash
npx playwright test
```

### 4. **Run Specific Project Tests**

```bash
npx playwright test --project=call-center
npx playwright test --project=xml-api
npx playwright test --project=json-api
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
