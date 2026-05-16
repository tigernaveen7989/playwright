# Agent Instructions — Playwright TypeScript Framework

> This file defines the mandatory coding standards, patterns, and constraints for all automated test development in this framework.
> Every agent or developer working on this codebase **must** follow these instructions without exception.

---

## 1. Framework Architecture

```
PlaywrightTypescript/
├── tests/
│   ├── basetest.ts                          # Browser lifecycle, page object wiring, proxy exports
│   ├── fixtures.ts  →  utilities/fixtures.ts # Custom test fixtures: testData, assert, logger
│   └── call-center-tests/
│       └── *.spec.ts                        # Test specs — one file per feature/flow
├── pageobjects/
│   ├── pageobjectmanager.ts                 # Central factory — instantiates all page objects
│   └── *.ts                                 # One page object per UI screen
├── utilities/
│   ├── blackpanther.ts                      # BASE CLASS — all reusable Playwright actions live here
│   ├── assertions.ts                        # Custom assertion wrapper with Allure step logging
│   ├── fixtures.ts                          # Playwright fixture extensions (testData, assert, logger)
│   ├── logger.ts                            # LoggerFactory — used in every file
│   └── jsonhandler.ts                       # Test data loader from JSON
└── testdata/
    └── {env}/{subenv}/{tenant}/
        ├── url-and-accounts.json            # App URL, credentials
        └── call-center-ui.json              # Per-TC test data, global config (dateFormat, card details)
```

---

## 2. The BlackPanther Base Class — Use It, Don't Bypass It

`utilities/blackpanther.ts` is the **single source of truth** for all Playwright interactions.
Every page object **must extend** `BlackPanther`. Every interaction **must go through** its protected methods.

### Available methods — always check here first before writing any Playwright code

| Method | Signature | Purpose |
|---|---|---|
| `click` | `click(locator: Locator)` | Waits 1s, asserts visible (20s), clicks, logs to Allure |
| `fill` | `fill(locator: Locator, value: string)` | Waits 1s, asserts visible (20s), fills, logs to Allure |
| `selectValueFromDropdown` | `selectValueFromDropdown(locator: Locator, value: string)` | Waits visible (10s), selects by label, logs to Allure |
| `clickOnCheckbox` | `clickOnCheckbox(locator: Locator)` | Waits visible (20s), only clicks if unchecked |
| `pressTab` | `pressTab(count?: number)` | Presses Tab key n times |
| `sleep` | `sleep(ms: number)` | Promise-based delay |
| `getTravelDates` | `getTravelDates(tripType, todayPlusDate)` | Returns date strings in tenant-aware format (MM/DD or DD/MM) |
| `formatDateMMDDYYYY` | `formatDateMMDDYYYY(date, format?)` | Formats a Date object per format string |
| `getPaxType` | `getPaxType(paxType: string)` | Parses `2A1C` → Map of PAX1→ADT, PAX2→ADT, PAX3→CNN |
| `loadConfig` | `loadConfig()` | Loads `url-and-accounts.json` for the active env/subenv/tenant |

### Rules

- **DO NOT** call `locator.click()`, `locator.fill()`, `page.locator(...).click()`, or any raw Playwright API inside a page object method.
- **DO NOT** call `expect(locator).toBeVisible()` inside a page object — `click` and `fill` already do this.
- **DO NOT** call `page.waitForTimeout()` inside page objects — use `sleep()` only when a UI transition genuinely requires a fixed delay, and add a comment explaining why.
- If you need an interaction not covered by the existing methods, **first add it to `blackpanther.ts`** as a new `protected` method following the same pattern (waitFor + Allure step + logger), then call it from the page object.

---

## 3. Strict Page Object Model — One Page = One File

Every page object maps **1:1 to a distinct UI screen** visible in the browser. The name of the page object must match the name of the screen in the application.

### Correct pattern

```
Login screen           → loginpage.ts            → LoginPage
Home / Search screen   → homepage.ts             → HomePage
Passenger Details form → passengerdetailspage.ts → PassengerDetailsPage
Add Payment form       → addpaymenttonewreservationpage.ts → AddPaymentToNewReservationPage
Pay by Credit Card     → paybycreditcardpage.ts  → PayByCreditCardPage
Booking Confirmation   → bookingconfirmationpage.ts → BookingConfirmationPage
Seat Selection screen  → seatselectionpage.ts    → SeatSelectionPage   ← new page = new file
Ancillary Services     → ancillarypage.ts        → AncillaryPage       ← new page = new file
```

### Do NOT club pages

```typescript
// ❌ WRONG — mixing seat selection and booking confirmation in one file
export default class SeatAndConfirmationPage extends BlackPanther { ... }

// ✅ CORRECT — one file per screen
// seatselectionpage.ts
export default class SeatSelectionPage extends BlackPanther { ... }
// bookingconfirmationpage.ts
export default class BookingConfirmationPage extends BlackPanther { ... }
```

### After creating a new page object, always register it in `pageobjectmanager.ts` and `basetest.ts`

```typescript
// pageobjectmanager.ts — add import + field + instantiation
import SeatSelectionPage from './seatselectionpage';
public seatSelectionPage: SeatSelectionPage;
this.seatSelectionPage = new SeatSelectionPage(page);

// basetest.ts — add static field + assignment in setup() + proxy export
static seatSelectionPage: SeatSelectionPage;
BaseTest.seatSelectionPage = this.poManager.seatSelectionPage;
export const seatSelectionPage = createPageProxy<SeatSelectionPage>('seatSelectionPage');
```

---

## 4. Page Object File Structure

Every page object must follow this exact structure:

```typescript
import { Page, Locator } from '@playwright/test';
import { BlackPanther } from '../utilities/blackpanther';
import { LoggerFactory } from '../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export default class SeatSelectionPage extends BlackPanther {

  // ── Locators ────────────────────────────────────────────────────────────────
  private readonly seatMapContainer: Locator;
  private readonly confirmSeatButton: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.seatMapContainer = page.locator('#seatMap');
    this.confirmSeatButton = page.locator('#btnConfirmSeat');
  }

  // ── Public Methods ──────────────────────────────────────────────────────────

  /**
   * Selects a seat from the seat map for the specified passenger.
   * Waits for the seat map to be visible, clicks the target seat element,
   * and logs the action. Call this once per passenger in a multi-pax flow.
   *
   * @param seatNumber - The seat label to select, e.g. '14A'
   */
  async selectSeat(seatNumber: string): Promise<void> {
    logger.info(`Selecting seat: ${seatNumber}`);
    const seatLocator = this.page.locator(`[data-seat="${seatNumber}"]`);
    await this.click(seatLocator);
    logger.info(`Seat ${seatNumber} selected`);
  }

  /**
   * Clicks the Confirm Seat button to finalise seat selection.
   * Should be called after all passengers have had seats assigned.
   */
  async clickConfirmSeat(): Promise<void> {
    logger.info('Clicking Confirm Seat button');
    await this.click(this.confirmSeatButton);
    logger.info('Seat selection confirmed');
  }
}
```

---

## 5. Mandatory Commenting Rules

Every public/async method **must** have a JSDoc block comment immediately above it. The comment must include:

- A one-sentence description of what the method does
- What UI action(s) it performs
- `@param` for every parameter with its meaning and example values
- `@returns` if the method returns a non-void value

```typescript
/**
 * Fills the payer billing address and phone numbers on the Add Payment screen.
 * Generates random address data via Faker and selects Poland as the country.
 * Call this before selectCardType() in the payment flow.
 */
async fillPayerDetails(): Promise<void> { ... }

/**
 * Returns the PNR number and Order ID extracted from the booking confirmation header.
 * Waits up to 20s for the confirmation text to appear.
 *
 * @returns Map with keys 'pnrNumber' and 'orderNumber'
 */
async getPNRAndOrderNumber(): Promise<Map<string, string>> { ... }
```

Private helper methods should have at minimum a single-line comment explaining why they exist.

---

## 6. Logger Rules

Every page object and utility file **must** declare a logger at the top:

```typescript
import { LoggerFactory } from '../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);
```

Every public method **must** log:
- Entry: `logger.info('Starting <action>')` — before the action
- Completion: `logger.info('<action> completed')` — after the action
- Key values: log IDs, names, or identifiers being acted on

```typescript
async selectCardType(cardType: string): Promise<void> {
  logger.info(`Selecting card type: ${cardType}`);
  await this.sleep(3000);
  await this.selectValueFromDropdown(this.selectCreditCardDropdown, cardType);
  logger.info(`Card type '${cardType}' selected`);
}
```

Do **not** log passwords, full card numbers, or PII at INFO level.

---

## 7. Test Spec File Rules

- One spec file per feature/flow: `createordertest.spec.ts`, `seatstest.spec.ts`
- Import page objects only via the proxy exports from `basetest.ts` — never instantiate them directly
- All test data comes from the `testData` fixture — never hardcode values in specs
- Use `logger.info()` to mark major steps so log output is readable in CI
- Assertions use the `assert` fixture from `utilities/assertions.ts` — never use raw `expect()` in specs

```typescript
// ✅ CORRECT
import { loginPage, homePage } from '../basetest';
const userName = testData.get('userName')?.toString()!;
await assert.toEqual('Welcome, ', await homePage.getWelcomeText(), 'Verify welcome text');

// ❌ WRONG
import LoginPage from '../../pageobjects/loginpage';
const login = new LoginPage(page);
expect(await homePage.getWelcomeText()).toContain('Welcome');
```

---

## 8. Test Data Rules

- All test data lives under `testdata/{env}/{subenv}/{tenant}/call-center-ui.json`
- The key at the top level must exactly match the test case title from the spec (before any `@` tag)
- Shared values (credentials, card details, date format) go under the `global` array
- Never put test data directly in spec files or page objects

### Format

```json
{
  "global": [
    {
      "userName": "agent@sabre.com",
      "password": "Pa$$word@2k25",
      "cardType": "MasterCard",
      "cardNumber": "5123456789012346",
      "cardName": "Test User",
      "cvv": "123",
      "expirationDate": "1229",
      "dateFormat": "DD/MM/YYYY"
    }
  ],
  "TC1_Verify_Login_Into_Call_Center_And_Create_Paid_Order": [
    {
      "tripType": "RT",
      "origin": "BEG",
      "destination": "IST",
      "todayPlusDate": "10,17",
      "paxType": "2A1C",
      "cabinType": "ECONOMY",
      "brandType": "ECONOMY"
    }
  ]
}
```

---

## 9. Locator Strategy

Use this priority order when defining locators:

1. **ID** — `page.locator('#btnConfirmSeat')` — preferred, most stable
2. **Data attribute** — `page.locator('[data-bind*="confirmSeat"]')`
3. **Starts-with ID** — `page.locator("xpath=//input[starts-with(@id,'tbxAvailability')]")`
4. **Role + text** — `page.locator('[role="menuitemcheckbox"]:has-text("Reservations")')`
5. **CSS/XPath compound** — only when no stable ID or attribute exists

Never use positional nth-child CSS selectors for functional elements (they break on layout changes).
All locators are declared as `private readonly` class fields in the constructor — never create inline locators inside methods.

---

## 10. Allure Reporting

Wrap logical sub-steps inside methods using `step()` from `allure-js-commons` for detailed Allure reports:

```typescript
import { step } from 'allure-js-commons';

async clickOnBookButton(): Promise<void> {
  logger.info('Clicking Book button');
  await step('Click Book button to proceed to passenger details', async () => {
    await this.click(this.bookButton);
  });
  logger.info('Book button clicked');
}
```

---

## 11. Checklist Before Submitting Code

- [ ] Page object file name matches the UI screen name exactly
- [ ] Class extends `BlackPanther`
- [ ] Logger declared and used in every public method
- [ ] No raw Playwright API (`locator.click()`, `page.waitForTimeout()`, `expect()`) in page objects
- [ ] Every public method has a JSDoc comment
- [ ] New page object is registered in `pageobjectmanager.ts` and `basetest.ts`
- [ ] Test data added to the correct JSON file under `testdata/`
- [ ] No hardcoded values in spec files
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
