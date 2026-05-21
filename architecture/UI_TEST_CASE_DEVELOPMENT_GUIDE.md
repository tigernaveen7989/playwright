# <span style="color:#6366F1">🖥️ Call Center UI — Automated Test Cases</span>

## <span style="color:#3B82F6">🏗️ Architecture Overview</span>

This project follows a strict Page Object Model (POM) architecture for all UI tests. Each layer has a single responsibility, making tests easy to read, maintain, and extend.

```
PlaywrightTypescript/
├── tests/
│   ├── basetest.ts                    # Browser lifecycle, page object wiring, proxy exports
│   └── call-center-tests/
│       └── *.spec.ts                  # UI test specs — one file per feature/flow
├── pageobjects/
│   ├── pageobjectmanager.ts           # Central factory — instantiates all page objects
│   └── *.ts                           # One page object per UI screen
├── utilities/
│   ├── blackpanther.ts                # BASE CLASS — all reusable Playwright actions live here
│   ├── assertions.ts                  # Custom assertion wrapper with Allure step logging
│   └── fixtures.ts                    # Playwright fixture extensions (testData, assert, logger)
└── testdata/
    └── {env}/{subenv}/{tenant}/
        ├── url-and-accounts.json      # App URL and credentials
        └── call-center-ui.json        # Per-TC test data, global config (dateFormat, card details)
```

**Execution flow per test:**
1. `BaseTest.setup()` — launches browser, creates context/page, loads config URL, navigates to Call Center
2. Test body — interacts through Page Objects via proxy-wrapped static references
3. `BaseTest.teardown()` — closes browser

**Parallel execution:** `test.describe.configure({ mode: 'parallel' })` is applied across all spec files.

---

## <span style="color:#06B6D4">� Layer Responsibilities</span>

### 🐾 BlackPanther (`utilities/blackpanther.ts`)
**Purpose:** Single source of truth for all Playwright browser interactions.

- Every page object **must extend** `BlackPanther`
- All interactions go through its protected methods — never call raw Playwright API in page objects
- Handles waits, Allure step logging, and error context automatically

| Method | Signature | Purpose |
|---|---|---|
| `click` | `click(locator: Locator)` | Waits 1s, asserts visible (20s), clicks, logs to Allure |
| `fill` | `fill(locator: Locator, value: string)` | Waits 1s, asserts visible (20s), fills, logs to Allure |
| `selectValueFromDropdown` | `selectValueFromDropdown(locator, value)` | Waits visible (10s), selects by label, logs to Allure |
| `clickOnCheckbox` | `clickOnCheckbox(locator: Locator)` | Waits visible (20s), only clicks if unchecked |
| `sleep` | `sleep(ms: number)` | Promise-based delay — use only when a UI transition genuinely requires it |
| `getTravelDates` | `getTravelDates(tripType, todayPlusDate)` | Returns date strings in tenant-aware format (MM/DD or DD/MM) |
| `getPaxType` | `getPaxType(paxType: string)` | Parses `2A1C` → Map of PAX1→ADT, PAX2→ADT, PAX3→CNN |

### 📄 Page Objects (`pageobjects/`)
**Purpose:** Represent a single UI screen and expose named methods for every interaction on that screen.

- One file per screen — `loginpage.ts`, `homepage.ts`, `passengerdetailspage.ts`, etc.
- Class name matches the screen: `LoginPage`, `HomePage`, `PassengerDetailsPage`
- All locators declared as `private readonly` in the constructor — never create inline locators inside methods
- Every public method has a JSDoc comment and logs entry/exit via `LoggerFactory`
- Registered in `pageobjectmanager.ts` and re-exported as a proxy from `basetest.ts`

| Page Object | File | Responsibilities |
|---|---|---|
| **LoginPage** | `loginpage.ts` | Click Login link → fill username → Next → fill password → Verify |
| **HomePage** | `homepage.ts` | Select trip type (OW/RT), city pairs, travel dates, passengers, shop, select offer brand, book |
| **PassengerDetailsPage** | `passengerdetailspage.ts` | Fill passenger info (auto-generated via Faker), handle multi-pax flow, Save, Yes/No popup |
| **AddPaymentToNewReservationPage** | `addpaymenttonewreservationpage.ts` | Select card type or Other payment type (cash etc.), fill payer address details, Continue |
| **PayByCreditCardPage** | `paybycreditcardpage.ts` | Enter card number, name, CVV, expiry date, Complete Payment |
| **BookingConfirmationPage** | `bookingconfirmationpage.ts` | Extract PNR & Order Number, verify itinerary (origin/dest, departure/arrival times), price/payment limit text |

### 📋 Test Specs (`tests/call-center-tests/`)
**Purpose:** Orchestrate page object calls and assert business outcomes.

- One spec file per feature/flow — `createordertest.spec.ts`, `seatstest.spec.ts`
- All test data from the `testData` fixture — never hardcode values in specs
- Assertions use the `assert` fixture — never raw `expect()`
- All variables declared at the top of each test body before any logic
- Logger at entry and exit of every test

---

## <span style="color:#F59E0B">✏️ Writing a New UI Test</span>

Follow this step-by-step workflow:

### 🔧 Step 1 — Create the page object
Create `pageobjects/mynewpage.ts`:

```typescript
import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../utilities/blackpanther';
import { LoggerFactory } from '../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export default class MyNewPage extends BlackPanther {

  // ── Locators ────────────────────────────────────────────────────────────────
  private readonly myButton: Locator;
  private readonly myInput: Locator;
  private readonly resultText: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.myButton = page.locator('#myButton');
    this.myInput = page.locator('#myInput');
    this.resultText = page.locator('#result');
  }

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Fills the input field and clicks the submit button.
   * @param value - The value to enter into the input field
   */
  async submitForm(value: string): Promise<void> {
    logger.info(`Submitting form with value: ${value}`);
    await this.fill(this.myInput, value);
    await this.click(this.myButton);
    logger.info('Form submitted');
  }

  /**
   * Returns the result text displayed after form submission.
   * @returns The result string extracted from the result element
   */
  async getResult(): Promise<string> {
    logger.info('Getting result text');
    const text = await this.resultText.innerText();
    logger.info(`Result: ${text}`);
    return text;
  }
}
```

### 🔗 Step 2 — Register in `pageobjectmanager.ts` and `basetest.ts`

```typescript
// pageobjectmanager.ts — add import, field, and instantiation
import MyNewPage from './mynewpage';
public myNewPage: MyNewPage;
this.myNewPage = new MyNewPage(page);

// basetest.ts — add static field, assignment in setup(), and proxy export
static myNewPage: MyNewPage;
BaseTest.myNewPage = this.poManager.myNewPage;
export const myNewPage = createPageProxy<MyNewPage>('myNewPage');
```

### 📝 Step 3 — Write the test spec
Create `tests/call-center-tests/mynewtest.spec.ts`:

```typescript
import { test } from '../../utilities/fixtures';
import { LoggerFactory } from '../../utilities/logger';
import { loginPage, homePage, myNewPage } from '../basetest';
const logger = LoggerFactory.getLogger(__filename);

test.describe.configure({ mode: 'parallel' });

test.describe('@allure.label.feature:MY-FEATURE', () => {
  test('TC1_Verify_My_Feature', async ({ testData, assert }) => {
    // ── Declare all variables at the top ─────────────────────────────────
    const userName = testData.get('userName')?.toString()!;
    const password = testData.get('password')?.toString()!;
    const myValue = testData.get('myValue')?.toString()!;
    let result: string;

    logger.info('TC1_Verify_My_Feature — started');

    await loginPage.login(userName, password);
    await myNewPage.submitForm(myValue);
    result = await myNewPage.getResult();
    await assert.notToBeNull(result, 'Verify result is not null');

    logger.info('TC1_Verify_My_Feature — completed');
  });
});
```

### 🗃️ Step 4 — Add test data
Add to `testdata/{env}/{subenv}/{tenant}/call-center-ui.json`:

```json
{
  "global": [
    {
      "userName": "agent@sabre.com",
      "password": "Pa$$word@2k25",
      "dateFormat": "DD/MM/YYYY"
    }
  ],
  "TC1_Verify_My_Feature": [
    {
      "myValue": "some test value"
    }
  ]
}
```

---

## <span style="color:#D97706">📌 Key Conventions</span>

| Convention | Rule |
|---|---|
| Page object file name | Must match the UI screen name exactly: `loginpage.ts` → `LoginPage` |
| Page object base class | Always `extends BlackPanther` — never extend plain `Page` |
| Locator declarations | All `private readonly` in constructor — never inline inside methods |
| Locator strategy | ID → data attribute → starts-with ID → role+text → CSS/XPath compound (in priority order) |
| Method comments | Every public method must have a JSDoc block with description, `@param`, and `@returns` |
| Logger | `const logger = LoggerFactory.getLogger(__filename)` at the top of every file |
| Logger usage | Entry (`logger.info('Starting ...')`) and completion (`logger.info('... completed')`) in every method |
| Interactions | Always use `BlackPanther` methods — never raw `locator.click()` or `page.waitForTimeout()` |
| Registration | Every new page object must be added to `pageobjectmanager.ts` and `basetest.ts` |
| Test data | All test data from `testData` fixture — never hardcode values in specs or page objects |
| Test variables | Declare all `let`/`const` at the **top** of the test body — never declare mid-test |
| Assertions | Use `assert` fixture only — never raw `expect()` for business assertions |
| Parallelism | Add `test.describe.configure({ mode: 'parallel' })` at the top of every spec file |
| Test logging | `logger.info('TC1_... — started')` and `logger.info('TC1_... — completed')` in every test |

---

## <span style="color:#8B5CF6">⚙️ `BlackPanther` — What it handles automatically</span>

You do NOT need to manually do any of the following in page objects or tests:

- Waiting for elements before clicking or filling ✅ (automatic — 20s visibility wait)
- Logging each interaction to Allure as a step ✅ (automatic — every `click` and `fill` creates a step)
- Asserting element visibility before interaction ✅ (automatic — built into `click` and `fill`)
- Adding a delay before each action ✅ (automatic — 1s wait before every click/fill)
- Re-throwing errors with context ✅ (automatic — errors include locator and page details)

---

## <span style="color:#10B981">📁 Folder Naming Conventions</span>

| Layer | Folder | Naming Pattern | Example |
|---|---|---|---|
| Page Object | `pageobjects/` | `<screenname>page.ts` | `loginpage.ts`, `homepage.ts` |
| Test Spec | `tests/call-center-tests/` | `<feature>test.spec.ts` | `createordertest.spec.ts` |
| Test Data | `testdata/{env}/{subenv}/{tenant}/` | `call-center-ui.json` | fixed filename |
| Base Class | `utilities/` | `blackpanther.ts` | fixed filename |


## <span style="color:#64748B">🌐 Environment Matrix</span>

| Environment | Sub-Env | Tenant | Notes |
|---|---|---|---|
| `cert` | `ut1` | `ju` | Primary test environment (JU tenant) |
| `cert` | `ut1` | `va` | VA tenant — used in seat tests |
| `cert` | `tc1` | *(tbd)* | TC1 sub-environment |

Call Center URLs follow the pattern:  
`https://callcenter-{subenv}-{tenant}.sm.dev.sabre-gcp.com/Login`
