# <span style="color:#6366F1">🤖 Agent Instructions — Playwright TypeScript Framework</span>

> This file defines the mandatory coding standards, patterns, and constraints for all automated test development in this framework.
> Every agent or developer working on this codebase **must** follow these instructions without exception.

---

## <span style="color:#3B82F6">🏗️ 1. Framework Architecture</span>

```
PlaywrightTypescript/
├── tests/
│   ├── basetest.ts                          # Browser lifecycle, page object wiring, proxy exports
│   ├── fixtures.ts  →  utilities/fixtures.ts # Custom test fixtures: testData, assert, logger
│   ├── call-center-tests/
│   │   └── *.spec.ts                        # UI test specs — one file per feature/flow
│   └── json-api-tests/
│       └── *.spec.ts                        # API test specs — one file per feature/flow
├── pageobjects/
│   ├── pageobjectmanager.ts                 # Central factory — instantiates all page objects
│   └── *.ts                                 # One page object per UI screen
├── json-api/
│   ├── builders/                            # Build JSON request payloads using the Builder pattern
│   │   └── *-payload-builder.ts
│   ├── clients/                             # Send HTTP JSON requests and attach Allure evidence
│   │   ├── base-api-client.ts               # Abstract base — handles HTTP + Allure + logging
│   │   └── *-api-client.ts
│   └── response-parsers/                   # Extract data from JSON API responses
│       └── *-response-parser.ts
├── xml-api/
│   ├── builders/                            # Build XML request payloads using the Builder pattern
│   │   └── *-xml-payload-builder.ts
│   ├── clients/                             # Send HTTP XML requests and attach Allure evidence
│   │   ├── base-xml-api-client.ts           # Abstract base — handles XML HTTP + Allure + logging
│   │   └── *-xml-api-client.ts
│   ├── response-parsers/                   # Extract data from XML API responses
│   │   └── *-xml-response-parser.ts
│   └── payloads/                            # XML template files (.txt) with $PLACEHOLDER tokens
│       ├── shop/
│       ├── price/
│       └── create-order/
├── api-base/
│   ├── activatejwttoken.ts                  # JWT token generation and config loader
│   └── xml-template-processor.ts           # Reads .txt templates and replaces $PLACEHOLDER tokens
├── utilities/
│   ├── blackpanther.ts                      # BASE CLASS — all reusable Playwright actions live here
│   ├── assertions.ts                        # Custom assertion wrapper with Allure step logging
│   ├── fixtures.ts                          # Playwright fixture extensions (testData, assert, logger)
│   ├── logger.ts                            # LoggerFactory — used in every file
│   └── jsonhandler.ts                       # Test data loader from JSON
└── testdata/
    └── {tenant}/
        ├── url-and-accounts.json            # App URL, credentials (per-tenant)
        └── {subenv}/
            ├── call-center-ui.json          # Per-TC test data, global config (dateFormat, card details)
            ├── dwres.json                   # DWRES test data
            ├── dx-vasm.json                 # DX-VASM test data
            ├── json-api.json                # JSON API test data
            └── xml-api.json                 # XML API test data
```

---

## <span style="color:#10B981">✏️ 1.5 API Layering Rule — One API = One Class Per Layer</span>

**One API method (Shop, Price, CreateOrder, etc.) must map 1:1 to exactly one Builder, one Client, and one Parser class. Do NOT create multiple classes for the same API.**

### ✅ Correct pattern

```
Shop API:
  ├── json-api/builders/shop-payload-builder.ts          (ONE class: ShopPayloadBuilder)
  ├── json-api/clients/shop-api-client.ts                (ONE class: ShopApiClient)
  └── json-api/response-parsers/shop-response-parser.ts  (ONE class: ShopResponseParser)

Price API:
  ├── json-api/builders/price-payload-builder.ts         (ONE class: PricePayloadBuilder)
  ├── json-api/clients/price-api-client.ts               (ONE class: PriceApiClient)
  └── json-api/response-parsers/price-response-parser.ts (ONE class: PriceResponseParser)
```

### ❌ Do NOT create multiple classes per API

```
// ❌ WRONG — do NOT do this
json-api/builders/shop-payload-builder.ts       (ShopPayloadBuilder)
json-api/builders/shop-payload-builder-alt.ts   (ShopPayloadBuilderAlt)      ← WRONG
json-api/clients/shop-api-client.ts             (ShopApiClient)
json-api/clients/shop-api-client-fallback.ts    (ShopApiClientFallback)      ← WRONG
```

**If variations are needed (e.g., different parameters, optional fields), handle them within the single class using parameters and conditional logic — not separate classes.**

---

## <span style="color:#8B5CF6">🐾 2. The BlackPanther Base Class — Use It, Don't Bypass It</span>

`utilities/blackpanther.ts` is the **single source of truth** for all Playwright interactions.
Every page object **must extend** `BlackPanther`. Every interaction **must go through** its protected methods.

### 🔍 Available methods — always check here first before writing any Playwright code

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

### ⚠️ Rules

- **DO NOT** call `locator.click()`, `locator.fill()`, `page.locator(...).click()`, or any raw Playwright API inside a page object method.
- **DO NOT** create non-parameterized locators inside methods. All stable locators must be declared as `private readonly` fields at class top and initialized in the constructor.
- **EXCEPTION:** method-local locators are allowed only for dynamic parameterized selectors (for example `seatNumber`) or dynamic web-table/grid row-cell targeting where constructor declaration is not practical.
- **DO NOT** call `expect(locator).toBeVisible()` inside a page object — `click` and `fill` already do this.
- **DO NOT** call `page.waitForTimeout()` inside page objects — use `sleep()` only when a UI transition genuinely requires a fixed delay, and add a comment explaining why.
- If you need an interaction not covered by the existing methods, **first add it to `blackpanther.ts`** as a new `protected` method following the same pattern (waitFor + Allure step + logger), then call it from the page object.

---

## <span style="color:#10B981">📄 3. Strict Page Object Model — One Page = One File</span>

Every page object maps **1:1 to a distinct UI screen** visible in the browser. The name of the page object must match the name of the screen in the application.

### ✅ Correct pattern

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

### ❌ Do NOT club pages

```typescript
// ❌ WRONG — mixing seat selection and booking confirmation in one file
export default class SeatAndConfirmationPage extends BlackPanther { ... }

// ✅ CORRECT — one file per screen
// seatselectionpage.ts
export default class SeatSelectionPage extends BlackPanther { ... }
// bookingconfirmationpage.ts
export default class BookingConfirmationPage extends BlackPanther { ... }
```

### 🔗 After creating a new page object, always register it in `pageobjectmanager.ts` and `basetest.ts`

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

## <span style="color:#10B981">📋 4. Page Object File Structure</span>

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

## <span style="color:#F59E0B">💬 5. Mandatory Commenting Rules</span>

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

## <span style="color:#10B981">📍 5.5 Variable Declaration — Declare at Top (All Classes)</span>

**This rule applies to ALL classes: page objects, builders, clients, parsers, utilities, fixtures, and tests — not just specs.**

### The Rule

In every async method or logical code block, **declare all variables at the top** before any logic or function calls. Never declare variables inline mid-execution.

### Why This Matters

- **Readability**: Method signature is crystal clear — you see all inputs and outputs upfront
- **Debugging**: When a test or method fails, the stack trace immediately shows what data was involved
- **Testability**: Variables are scoped properly; no "variable magically appears later" surprises
- **Performance**: Variables are allocated once at the start, not repeatedly in loops or conditionals
- **PR Review**: Reviewers can quickly audit all data transformations and sources

### ✅ Correct Pattern

**Page Object Example:**
```typescript
async selectAncillariesByRoute(routeMap: Map<string, string[]>): Promise<AncillaryResult[]> {
  logger.info('Starting ancillary selection by route');
  const ancillaryResults: AncillaryResult[] = [];
  const routes = Array.from(routeMap.keys());
  const selectedCount = 0;
  
  // Now execute logic using pre-declared variables
  for (const route of routes) {
    const ancillaries = routeMap.get(route) || [];
    for (const ancillary of ancillaries) {
      await this.click(this.getAncillaryCheckbox(ancillary));
      selectedCount++;
    }
  }
  
  logger.info(`Ancillaries selected: ${selectedCount}`);
  return ancillaryResults;
}
```

**Builder Example:**
```typescript
buildShopRequest(origin: string, destination: string, departDate: string): ShopPayload {
  logger.info('Building Shop request');
  const passengers: PassengerPayload[] = [];
  const segments: SegmentPayload[] = [];
  const payload: ShopPayload = {
    passengers,
    segments,
    origin,
    destination,
    departDate
  };
  
  // Logic comes after variable declarations
  for (const pax of this.paxList) {
    passengers.push(this.buildPassengerPayload(pax));
  }
  
  return payload;
}
```

**Client/HTTP Example:**
```typescript
async sendShopRequest(origin: string, destination: string): Promise<ShopResponse> {
  logger.info('Sending Shop API request');
  const url = `${this.baseUrl}/shop`;
  const headers = this.buildHeaders();
  const body = { origin, destination };
  let response: Response;
  let jsonData: ShopResponse;
  
  try {
    response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    jsonData = await response.json() as ShopResponse;
    logger.info('Shop request completed successfully');
    return jsonData;
  } catch (error) {
    logger.info(`Error in Shop request: ${error}`);
    throw error;
  }
}
```

### ❌ Incorrect Pattern

```typescript
// ❌ WRONG — variable declared inline mid-method
async selectAncillariesByRoute(routeMap: Map<string, string[]>): Promise<AncillaryResult[]> {
  logger.info('Starting ancillary selection');
  
  for (const route of routeMap.keys()) {
    const ancillaries = routeMap.get(route) || []; // ❌ Declared inside loop
    for (const ancillary of ancillaries) {
      await this.click(this.getAncillaryCheckbox(ancillary));
      const result = { route, ancillary, selected: true }; // ❌ Declared mid-execution
      results.push(result); // Error: 'results' not declared at top
    }
  }
  
  return results;
}
```

### 🧰 When Variables Are Loop/Iterator Variables

If a variable is truly **only needed within a loop**, it may be scoped locally in the loop **only if it makes the code significantly clearer**. However, the **loop container and result holder must still be declared at the top**:

```typescript
// ✅ ACCEPTABLE — loop variable locally scoped, but container declared at top
async processAllSegments(segments: Segment[]): Promise<SegmentResult[]> {
  const results: SegmentResult[] = [];
  
  for (const segment of segments) { // ✅ segment is loop-scoped, which is standard
    const segmentId = segment.id; // ✅ Acceptable: loop-local extraction
    results.push({ id: segmentId, processed: true });
  }
  
  return results;
}
```

---

## <span style="color:#F59E0B">🧠 6. Code Simplicity Principles (DRY / KISS / SOLID)</span>

All page objects, utilities, builders, parsers, and spec files **must** follow these principles:

### KISS — Keep It Simple

- Methods should be **short, flat, and obvious**. If a method needs a paragraph of comments to explain its control flow, it is too complex — simplify it.
- Avoid deeply nested `if/else` chains. Prefer early returns, guard clauses, or extracting a list of candidates and iterating them.
- Do not add defensive fallback logic for scenarios that cannot realistically occur during a test run. Let failures surface naturally via Playwright's built-in timeouts and error messages.
- Prefer a single clear path over multiple fallback branches that silently swallow problems.
- **Limit call depth to ≤ 3 levels** — a public method may call a private helper, which may call one more helper, but chains deeper than 3 levels (A → B → C → D → …) make debugging extremely difficult because the stack trace hops across many methods and the actual failing line is buried. If a method delegates to a helper that delegates to another helper that delegates again, flatten the chain or inline the intermediate steps.

### DRY — Don't Repeat Yourself

- If the same pattern appears more than twice (e.g., "check visible then click"), extract it into a private helper or a `BlackPanther` base method.
- Avoid copy-pasting blocks of code with minor variations — parameterize the differences instead.

### SOLID — Where Practical

- **Single Responsibility**: each method does one thing. A method that locates an element, clicks it, fills a form, and saves should be split into focused helpers.
- **Open/Closed**: prefer adding new methods over modifying existing ones when extending behavior.
- SOLID is a guideline, not a hard constraint — apply it where it genuinely improves readability and maintainability.

### ⚠️ Anti-patterns to avoid

| ❌ Anti-pattern | ✅ Preferred approach |
|---|---|
| Long `if/else if/else if/else` chains checking element visibility | Collect candidate locators in an array, iterate, and click the first visible one |
| Silently skipping actions with `logger.warn` + `return` when an element is missing | Let `this.click()` throw — the test should fail visibly if the UI is broken |
| Mixing unrelated concerns in one method (locate + fill + save + sleep) | Extract each concern into a focused private helper |
| Duplicating comment-sanitization or data-formatting logic inline | Create a shared utility method and call it |
| Deep call chains: A → B → C → D → E across many private helpers | Flatten to ≤ 3 levels; inline intermediate delegation methods that only forward calls |

### 🧹 Code Cleanliness — Remove Dead Code

**All code must be clean and active.** Remove:
- **Unused variables** — declare variables only when they are used
- **Unused imports** — keep only the imports referenced in the file
- **Unused functions and methods** — delete private helpers that are never called
- **Commented lines** — delete all commented-out code; use git history if you need to retrieve old code; comments are for explaining _why_, not for storing dead code

Reviewers will reject PRs containing dead code, unused imports/variables, or commented lines.

```typescript
// ✅ CORRECT — simple, flat, no deep nesting
async addCommentByPencilIcon(ancillaryName: string, comment: string): Promise<void> {
  logger.info(`Adding comment for ancillary '$${ancillaryName}'`);
  await this.sleep(1000);
  await this.clickFirstVisibleIcon(ancillaryName);
  await this.fillCommentAndSave(comment);
  logger.info(`Comment added for ancillary '$${ancillaryName}'`);
}

// ❌ WRONG — 50+ lines, deep if/else chains, silent fallbacks
async addCommentByPencilIcon(ancillaryName: string, comment: string): Promise<void> {
  // ... 60 lines of nested if/else, try/catch, and warn+return ...
}

// ❌ WRONG — deep call chain: selectAncillaries → selectByType → selectBaggage → processRouteMap → selectAncillary → addComment → openIcon
// 7 levels deep — impossible to debug from a stack trace
async selectAncillaries(data) {
  await this.selectAncillariesByType(type, routeMap);   // level 1
}                                                       // → selectBaggageAncillaries (level 2)
                                                        //   → processAncillaryRouteMap (level 3)
                                                        //     → selectAncillary (level 4)
                                                        //       → addCommentByPencilIcon (level 5)
                                                        //         → openDetailsIcon (level 6)

// ✅ CORRECT — flatten intermediate wrappers, keep call depth ≤ 3
async selectAncillaries(data) {
  for (const [type, routeMap] of data.entries()) {
    for (const [routeKey, paxEntries] of routeMap.entries()) {
      await this.selectAncillary(paxIndex, routeKey, name, qty);  // level 1
    }                                                             // → addCommentByPencilIcon (level 2)
  }                                                               //   → openDetailsIcon (level 3) ✅
}
```

---

## <span style="color:#F59E0B">🪵 7. Logger Rules</span>

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

## <span style="color:#06B6D4">🖥️ 8. Test Spec File Rules (UI Tests)</span>

- One spec file per feature/flow: `createordertest.spec.ts`, `seatstest.spec.ts`
- If agent mode is selected for implementation, UI test case development must use the `playwright-cli` skill/workflow for automation
- Invocation and usage reference: [PLAYWRIGHT_CLI_GUIDE.md](PLAYWRIGHT_CLI_GUIDE.md)
- Import page objects only via the proxy exports from `basetest.ts` — never instantiate them directly
- All test data comes from the `testData` fixture — never hardcode values in specs
- Use `logger.info()` to mark major steps so log output is readable in CI
- Assertions use the `assert` fixture from `utilities/assertions.ts` — never use raw `expect()` in specs
- **Declare all variables at the top of the test** (see section 5.5 for general variable declaration rules) — never declare variables inline mid-test
- Add a logger at the top of every spec file and log entry/exit of each test
- Allure feature labels must start with the project prefix and a hyphen: `@allure.label.feature:DWRES-...`, `@allure.label.feature:DXVASM-...`, `@allure.label.feature:CALLCENTER-...`, `@allure.label.feature:JSONAPI-...`, `@allure.label.feature:XMLAPI-...`
- Test case names must be relevant to the feature flow and key actions, for example: `TC1_Create_Paid_Order_Add_Paid_Seats_Payment`; do not include data-variant tokens such as trip type (`RT`/`OW`), pax composition (`2A`, `2A1C`), or route codes
- In each spec file, test case numbers must be continuous with no gaps or duplicates: `TC1`, `TC2`, `TC3`, ... ; missing numbers must be highlighted
- Every `test()` must include a concise block comment in `/** ... */` format immediately above it (1–2 lines covering testcase intent and expected result)
- **No implementation orchestration in spec files** — loops and business iteration logic (for example iterating parsed assignments) must be implemented in page objects/parsers/builders/utilities; specs must call a single expressive method
- **No folded multiline invocations in specs** — keep `test(...)` signatures and page-object/assert/logger method calls in single-line format; avoid wrapping a single invocation across multiple lines
- **Blank line between page-object transitions** — when the next step belongs to a different page object than the previous step, insert one blank line between them to visually separate the page boundaries. Steps that belong to the same page object are grouped together with no blank lines between them.

```typescript
// ✅ CORRECT — blank line separates page transitions
await ancillaryPage.clickSaveAndContinue();

await passengerDetailsPage.clickOnSaveButton();
await passengerDetailsPage.clickOnYesButton();

logger.info(`Processing payment using card type: ${cardType}`);
await addPaymentToNewReservationPage.fillPayerDetails();
await addPaymentToNewReservationPage.selectCardType(cardType);

// ❌ WRONG — no visual separation between page transitions
await ancillaryPage.clickSaveAndContinue();
await passengerDetailsPage.clickOnSaveButton();
await passengerDetailsPage.clickOnYesButton();
await addPaymentToNewReservationPage.fillPayerDetails();
```

### 🔁 Shared Setup via `test.beforeEach` — No Helper Functions

When multiple tests in a spec file share common setup steps (e.g., login, reservation creation, passenger details, payment), place those shared steps directly in `test.beforeEach`. Keep scenario-specific steps inside individual `test()` blocks.

**Every step must be a single, flat page-object method call.** Do **not** fold multiple steps into local helper functions, wrapper abstractions, type aliases, or utility closures within the spec file. Each line in `beforeEach` and `test` should be a direct `await pageObject.method()` or `assert.method()` call — never a call to a locally defined function that groups several steps.

#### ⚠️ Rules

- **DO** place repeated setup steps (login, reservation, passenger details, order payment, confirmation) in `test.beforeEach`
- **DO** place scenario-specific steps (seat selection, ancillary selection, specific payment flows) inside individual `test()` blocks
- **DO NOT** create local helper functions (e.g., `async function createOrderAndOpenSeats(...)`) inside spec files to group multiple page-object calls
- **DO NOT** create type aliases, wrapper types, or abstraction layers inside spec files
- **DO NOT** create reusable "scenario runner" functions inside spec files
- **DO NOT** implement nested loops in specs to apply domain data maps; move that orchestration to page objects/parsers/builders/utilities and call one method from the spec
- Each step in `beforeEach` and `test` must be a **single, readable page-object call** — not a folded abstraction
- Keep each spec invocation in one line (including `test(...)` declaration and `await assert...(...)` / `await pageObject...(...)` / `logger.info(...)` calls) unless a real syntax constraint prevents it

```typescript
// ✅ CORRECT — flat beforeEach with single-step page-object calls
test.beforeEach(async ({ testData, assert }) => {
  const userName = testData.get('userName')?.toString()!;
  const password = testData.get('password')?.toString()!;

  logger.info('beforeEach — Login and create order');
  await loginPage.login(userName, password);
  await homePage.selectTripType(testData.get('tripType')?.toString()!);
  await homePage.enterCityPairs(testData.get('origin')?.toString()!, testData.get('destination')?.toString()!);
  await homePage.clickSearch();
  logger.info('beforeEach — completed');
});

test('TC1_Create_Order_Add_Free_Seats', async ({ testData, assert }) => {
  logger.info('TC1 — started');
  await seatSelectionPage.selectFirstAvailableFreeSeat();
  await seatSelectionPage.clickSaveButton();
  logger.info('TC1 — completed');
});

test('TC2_Create_Order_Add_Paid_Seats_Complete_Payment', async ({ testData, assert }) => {
  logger.info('TC2 — started');
  await seatSelectionPage.selectFirstAvailablePaidSeat();
  await seatSelectionPage.clickSaveButton();
  await payByCreditCardPage.completePayment(...);
  logger.info('TC2 — completed');
});

// ❌ WRONG — helper function folding multiple steps
async function createOrderAndOpenSeats(testData: Map<string, object>) {
  await loginPage.login(...);
  await homePage.selectTripType(...);
  await homePage.enterCityPairs(...);
  await homePage.clickSearch(...);
}
test('TC1_Create_Order_Add_Free_Seats', async ({ testData }) => {
  await createOrderAndOpenSeats(testData); // ❌ folded steps
  await seatSelectionPage.selectFirstAvailableFreeSeat();
});
```

### 📋 General Spec Example

```typescript
// ✅ CORRECT
import { LoggerFactory } from '../../utilities/logger';
import { loginPage, homePage } from '../basetest';
const logger = LoggerFactory.getLogger(__filename);

test('TC1_Login_To_Call_Center_Validate_Welcome_Message', async ({ testData, assert }) => {
  // Declare all variables at the top
  const userName = testData.get('userName')?.toString()!;
  const password = testData.get('password')?.toString()!;
  const welcomeText = 'Welcome, ';

  logger.info('TC1_Login_To_Call_Center_Validate_Welcome_Message — started');
  await loginPage.login(userName, password);
  await assert.toEqual(welcomeText, await homePage.getWelcomeText(), 'Verify welcome text');
  logger.info('TC1_Login_To_Call_Center_Validate_Welcome_Message — completed');
});

// ❌ WRONG — variable declared mid-test and no logger
test('TC1_Login_To_Call_Center_Validate_Welcome_Message', async ({ testData, assert }) => {
  await loginPage.login(testData.get('userName')?.toString()!, testData.get('password')?.toString()!);
  const welcomeText = await homePage.getWelcomeText(); // ❌ declared mid-test
  await assert.toEqual('Welcome, ', welcomeText, 'Verify welcome text');
});
```

---

## <span style="color:#06B6D4">🗃️ 9. Test Data Rules</span>

- All test data lives under `testdata/{tenant}/{subenv}/call-center-ui.json` (or the appropriate project JSON file)
- Environment config lives under `testdata/{tenant}/url-and-accounts.json`
- The key at the top level must exactly match the test case title from the spec (before any `@` tag)
- Shared values (credentials, card details, date format) go under the `global` array
- Never put test data directly in spec files or page objects

### 📝 Format

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
  "TC1_Login_Into_Call_Center_Create_Paid_Order": [
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

## <span style="color:#14B8A6">📦 10. JSON File Coding Standards</span>

All JSON files in this framework — test data, environment configuration, and project config — **must** follow the rules below. Consistent JSON structure prevents silent data-loading failures, merge conflicts, and CI breakages.

---

### 📁 File Categories

| Category | Location | Example Files |
|---|---|---|
| **Test Data** | `testdata/{tenant}/{subenv}/` | `call-center-ui.json`, `json-api.json`, `xml-api.json`, `dwres.json`, `dx-vasm.json` |
| **Environment Config** | `testdata/{tenant}/` | `url-and-accounts.json` |
| **Project Config** | Repository root | `package.json`, `agent-config.json` |

---

### 🔤 Naming Conventions

#### J1 · File names: lowercase with hyphens
All JSON files use **kebab-case** (lowercase letters and hyphens). No spaces, no underscores, no PascalCase.

```
✅ call-center-ui.json
✅ url-and-accounts.json
✅ json-api.json

❌ CallCenterUI.json
❌ call_center_ui.json
❌ Json-Api.json
```

#### J2 · Property names: `camelCase`
All JSON property keys must use **camelCase** — no snake_case, no kebab-case, no PascalCase.

```json
// ✅ CORRECT
{
  "cardType": "MasterCard",
  "cardNumber": "5123456789012346",
  "paymentType": "CARD",
  "todayPlusDate": "10,17"
}

// ❌ WRONG
{
  "card_type": "MasterCard",
  "card-number": "5123456789012346",
  "PaymentType": "CARD"
}
```

> **Exception:** Legacy keys like `okta-audience` in existing `url-and-accounts.json` files are tolerated until migrated. New keys must always use `camelCase`.

#### J3 · Test case keys: exact match to spec title
Top-level keys in test data files must **exactly match** the test case title from the spec file (before any `@` tag). Use `PascalCase` words separated by underscores.

```json
// ✅ CORRECT — matches test('TC1_Login_Into_Call_Center_Create_Paid_Order', ...)
"TC1_Login_Into_Call_Center_Create_Paid_Order": [{ ... }]

// ❌ WRONG — name mismatch or different casing
"tc1_login_into_call_center_create_paid_order": [{ ... }]
"TC1-Login-Into-Call-Center-Create-Paid-Order": [{ ... }]
```

#### J4 · Environment keys: UPPERCASE identifiers
Top-level keys in `url-and-accounts.json` use **UPPERCASE** environment/subenv identifiers.

```json
{
  "INT1": { ... },
  "QA1": { ... },
  "TC1": { ... },
  "UT1": { ... }
}
```

---

### 📐 Structure Rules

#### J5 · Indentation: 4 spaces
All JSON files use **4-space indentation**. No tabs.

#### J6 · Test data values are always wrapped in an array
Every test case key and the `global` key must map to a **single-element array** containing one object. This is required by the `jsonhandler.ts` loader which accesses `[0]`.

```json
// ✅ CORRECT — array with single object
"global": [
    {
        "userName": "agent@sabre.com",
        "password": "Pa$$word@2k25"
    }
]

// ❌ WRONG — not wrapped in array
"global": {
    "userName": "agent@sabre.com",
    "password": "Pa$$word@2k25"
}
```

#### J7 · Global data contains shared values only
The `global` array holds values shared across **all** test cases in the file (credentials, card details, date format). Test-case-specific values go under their own test case key. Global values are merged with test case values — test case values override globals with the same key.

```json
{
    "global": [
        {
            "userName": "agent@sabre.com",
            "password": "Pa$$word@2k25",
            "dateFormat": "MM/DD/YYYY"
        }
    ],
    "TC1_Login_To_Call_Center_Validate_Welcome_Message": [
        {
            "tripType": "RT",
            "origin": "SYD"
        }
    ]
}
```

- `userName`, `password`, `dateFormat` — available in every test via `testData.get('userName')`
- `tripType`, `origin` — available only in `TC1_Login_To_Call_Center_Validate_Welcome_Message`
- If `TC1_Login_To_Call_Center_Validate_Welcome_Message` also declares `userName`, it overrides the global value for that test only

#### J8 · Empty global must still be an array with an empty object
If no global values are needed, use `[{}]` — not `[]` or omitted entirely. The loader expects `global[0]` to be an object.

```json
// ✅ CORRECT
"global": [{}]

// ❌ WRONG
"global": []
"global": [null]
```

#### J9 · No trailing commas
JSON does not allow trailing commas. This will cause `JSON.parse()` to throw at runtime.

```json
// ❌ WRONG — trailing comma after last property
{
    "origin": "SYD",
    "destination": "BNE",
}

// ✅ CORRECT
{
    "origin": "SYD",
    "destination": "BNE"
}
```

#### J10 · No comments in JSON
JSON does not support comments. Use descriptive key names instead.

```json
// ❌ WRONG — comments in JSON
{
    // departure city
    "origin": "SYD"
}

// ✅ CORRECT — self-descriptive key name
{
    "origin": "SYD"
}
```

---

### 🛡️ Data Integrity Rules

#### J11 · No hardcoded secrets in committed JSON
Passwords and tokens in `testdata/` are permitted **only for non-production test environments**. Production credentials must never appear in any JSON file checked into version control. Base64-encoded tokens in `url-and-accounts.json` are acceptable for dev/cert environments only.

#### J12 · Use empty string `""` for unused optional properties — never `null`
Unused or optional URL/endpoint properties must be set to an empty string, not `null` or omitted. This keeps the structure consistent across environments and avoids `undefined` access errors.

```json
// ✅ CORRECT
{
    "dcs": "",
    "cFlowApi": ""
}

// ❌ WRONG
{
    "dcs": null
}
```

#### J13 · Every test case in a spec file must have a matching JSON entry
If a spec file contains `test('TC3_Create_Multi_Pax_Order_Add_Seats', ...)`, the corresponding test data JSON file **must** contain a `"TC3_Create_Multi_Pax_Order_Add_Seats"` key. The `jsonhandler` throws an error if the key is missing — this is by design. Never add tests without adding their data.

#### J14 · No duplicate keys
JSON objects must not contain duplicate keys. If duplicates exist, `JSON.parse()` silently uses the last value, which hides data bugs.

```json
// ❌ WRONG — duplicate key, second value silently wins
{
    "origin": "SYD",
    "origin": "MEL"
}
```

---

### 🧩 Complex Value Formats

#### J15 · `seatType` formats
`seatType` supports two formats depending on test complexity:

**Simple format** — single seat type per passenger:
```json
"seatType": {
    "PAX1": "PAID"
}
```

**Segment format** — per-segment seat assignments with count:
```json
"seatType": {
    "SEGMENT_1": "PAX1:1P, PAX2:1P",
    "SEGMENT_2": "PAX1:1P, PAX2:1P, PAX3:1P"
}
```

- Segment keys: `SEGMENT_1`, `SEGMENT_2`, ... (1-based index)
- Pax entries: `PAXn:countType` where `n` = pax number, `count` = seat count, type = `P` (PAID) or `F` (FREE)
- Parsed by `jsonhandler.parseSeatType()` — follow the format exactly or parsing will throw

#### J16 · `paxType` format
Passenger type is a compact string: `"2A1C"` = 2 Adults + 1 Child. Parsed by `BlackPanther.getPaxType()`.

#### J17 · `todayPlusDate` format
Comma-separated day offsets from today: `"10,17"` = departure in 10 days, return in 17 days.

---

### 📋 JSON File Checklist

- [ ] File name is kebab-case with `.json` extension
- [ ] All property keys are `camelCase` (no snake_case or kebab-case for new keys)
- [ ] 4-space indentation, no tabs
- [ ] No trailing commas, no comments
- [ ] Every value under test case keys and `global` is wrapped in an array `[{...}]`
- [ ] Every test in the spec has a matching key in the JSON file
- [ ] No duplicate keys in any object
- [ ] Unused properties set to `""`, not `null`
- [ ] No production credentials in committed files
- [ ] `seatType` and `paxType` follow their documented formats exactly
- [ ] File is valid JSON — verify with `JSON.parse()` or editor validation before committing

---

## <span style="color:#2563EB">🔌 11. API Test Development — Three-Layer Architecture</span>

All JSON API tests follow a strict three-layer architecture. Each layer has a single responsibility.

### 🏗️ Layer 1 — Builders (`json-api/builders/`)

Construct request payloads using the fluent Builder pattern.

- File naming: `<name>-payload-builder.ts` (e.g. `shop-payload-builder.ts`)
- Every builder file starts with a JSDoc block showing a usage example
- All setter methods return `this` for fluent chaining
- Sections separated with `// ─── SectionName ───` dividers
- `.build()` returns a plain `object` and logs the payload via `logger.info`
- No HTTP logic, no response parsing — pure payload construction

```typescript
/**
 * Builds the shop request payload.
 *
 * Usage:
 *   new ShopPayloadBuilder()
 *     .withRoute('SYD', 'BNE')
 *     .withDepartureDate(10, 6, 2026)
 *     .withPassengers('2A1C')
 *     .build();
 */
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export class ShopPayloadBuilder {
  private origin: string = '';
  private destination: string = '';

  // ─── Route ───────────────────────────────────────────────────────────────

  withRoute(origin: string, destination: string): this {
    this.origin = origin;
    this.destination = destination;
    return this;
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  build(): object {
    const payload = { origin: this.origin, destination: this.destination };
    logger.info('Shop payload:', JSON.stringify(payload));
    return payload;
  }
}
```

### 📡 Layer 2 — Clients (`json-api/clients/`)

Send HTTP POST requests and attach request/response evidence to the Allure report.

- File naming: `<name>-api-client.ts` (e.g. `shop-api-client.ts`)
- All clients extend `BaseApiClient` — never write HTTP logic directly in a client
- Each client exposes a single named method (`.shop()`, `.price()`, `.createOrder()`)
- Allure step name format: `'Send <Operation> API Request and Log Request/Response'`
- Attachment names: `'<Operation> Request Payload'` and `'<Operation> Response Body'`
- `BaseApiClient` automatically handles: Allure step wrapping, request/response attachment, `Content-Type` header, logging, and error catching

```typescript
import { APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api-client';

export class ShopApiClient extends BaseApiClient {
  async shop(
    endpoint: string,
    headers: Record<string, string>,
    payload: object
  ): Promise<APIResponse> {
    return this.post(
      'Send Shop API Request and Log Request/Response',
      endpoint,
      headers,
      payload,
      'Shop Request Payload',
      'Shop Response Body'
    );
  }
}
```

### 🔍 Layer 3 — Response Parsers (`json-api/response-parsers/`)

Extract structured data from API response JSON.

- File naming: `<name>-response-parser.ts` (e.g. `shop-response-parser.ts`)
- No HTTP logic, no payload building — pure response parsing
- Methods named after the data they return
- **Must throw a descriptive `Error`** if a required field is missing from the response

```typescript
export class ShopResponseParser {
  getFirstOfferId(responseJson: any): string {
    const offerId = responseJson?.offers?.[0]?.offerId;
    if (!offerId) throw new Error('offerId not found in shop response');
    return offerId;
  }
}
```

### 📋 API Test Spec Rules (`tests/json-api-tests/`)

- File naming: `<feature>test.spec.ts` (e.g. `createordertest.spec.ts`)
- Always add `test.describe.configure({ mode: 'parallel' })` at the top
- **Declare all variables at the top of the test** — never declare variables inline mid-test
- **After every API call, assert the HTTP status is 200** using the `assert` fixture immediately after the call
- Add a logger at the top of every spec file and log entry/exit of each test
- Group API calls with inline section comments: `// Shop`, `// Price`, `// Create Order`
- Assertions use the `assert` fixture — never use raw `expect()` for business assertions
- JWT token and config are loaded in `beforeEach` — never inline them in the test body
- **Tests must never contain inline data extraction logic.** All data extraction must go in a named parser or builder method. For example, never write `Array.from(map.values())[0].get('key')` in a test — instead add a descriptively named method to the relevant parser class and call that.
- **No folded multiline invocations in API specs.** Keep `test(...)` signatures and API/assert/logger calls in single-line format; avoid wrapping a single invocation across multiple lines.
- **Blank line between API client transitions** — when calling a different API client than the previous step, insert one blank line between them to visually separate the API call boundaries; calls to the same client are grouped with no blank lines between them
- Allure feature labels must start with the project prefix and a hyphen: `@allure.label.feature:JSONAPI-...`
- Test case names must be relevant to the feature flow and key actions, for example: `TC1_Create_Paid_Order_Add_Paid_Seats_Payment`; do not include data-variant tokens such as trip type (`RT`/`OW`), pax composition (`2A`, `2A1C`), or route codes
- In each spec file, test case numbers must be continuous with no gaps or duplicates: `TC1`, `TC2`, `TC3`, ... ; missing numbers must be highlighted
- Keep invocation formatting single-line in specs (`test(...)`, `await apiClient...(...)`, `await assert...(...)`, `logger.info(...)`) unless a real syntax constraint prevents it

#### 🔁 Shared API Setup via `test.beforeEach` — No Helper Functions

When multiple API tests share common setup steps (e.g., JWT token loading, config loading, or repeated API call chains like Shop → Price), place those shared steps directly in `test.beforeEach`. Keep test-specific steps inside individual `test()` blocks.

**Every step must be a single, flat call.** Do **not** fold multiple API calls into local helper functions, wrapper abstractions, or utility closures within the spec file.

- **DO** place repeated setup (JWT token, config loading, shared API calls whose responses feed all tests) in `test.beforeEach`
- **DO** place test-specific API calls and assertions inside individual `test()` blocks
- **DO NOT** create local helper functions (e.g., `async function shopAndPrice(...)`) inside spec files
- **DO NOT** create type aliases or wrapper abstractions inside spec files
- Each step in `beforeEach` and `test` must be a **single, readable call** — not a folded abstraction

```typescript
// ✅ CORRECT — shared API setup in beforeEach, test-specific steps in test
test.describe('@allure.label.feature:JSONAPI-Order', () => {
  let headers: Record<string, string>;
  let apiUrl: string;
  let shopResponseJson: any;

  test.beforeEach(async ({ testData, testInfo, assert }) => {
    const token = new activateJwtToken();
    headers = await token.getJwtToken(testInfo);
    ({ apiUrl } = await token.loadConfig());

    // Shop — shared across all tests
    const shopPayload = new ShopPayloadBuilder()
      .withRoute(testData.get('origin')?.toString()!, testData.get('destination')?.toString()!)
      .withPassengers(testData.get('paxType')?.toString()!)
      .build();
    const shopResponse = await new ShopApiClient().shop(`${apiUrl}/shop`, headers, shopPayload);
    await assert.toBe(shopResponse.status(), 200, 'Verify shop response status is 200');
    shopResponseJson = await shopResponse.json();
  });

  test('TC1_Shop_And_Price_Order', async ({ testData, assert }) => {
    logger.info('TC1 — started');
    // Price — test-specific
    const offerId = new ShopResponseParser().getFirstOfferId(shopResponseJson);
    const pricePayload = new PricePayloadBuilder().withOfferId(offerId).build();
    const priceResponse = await new PriceApiClient().price(`${apiUrl}/price`, headers, pricePayload);
    await assert.toBe(priceResponse.status(), 200, 'Verify price response status is 200');
    logger.info('TC1 — completed');
  });

  test('TC2_Shop_Price_And_Create_Order', async ({ testData, assert }) => {
    logger.info('TC2 — started');
    // Price + Create Order — test-specific
    // ... direct API calls, no helper function wrappers
    logger.info('TC2 — completed');
  });
});

// ❌ WRONG — helper function folding multiple API calls
async function shopAndPrice(testData: Map<string, object>, headers: Record<string, string>) {
  const shopPayload = new ShopPayloadBuilder().withRoute(...).build();
  const shopResponse = await new ShopApiClient().shop(...);
  const pricePayload = new PricePayloadBuilder().withOfferId(...).build();
  return await new PriceApiClient().price(...);
}
test('TC1', async ({ testData }) => {
  const priceResponse = await shopAndPrice(testData, headers); // ❌ folded steps
});
```

```typescript
import { test } from '../../utilities/fixtures';
import { LoggerFactory } from '../../utilities/logger';
import { activateJwtToken } from '../../api-base/activatejwttoken';
import { ShopPayloadBuilder } from '../../json-api/builders/shop-payload-builder';
import { ShopApiClient } from '../../json-api/clients/shop-api-client';
import { ShopResponseParser } from '../../json-api/response-parsers/shop-response-parser';

const logger = LoggerFactory.getLogger(__filename);

test.describe.configure({ mode: 'parallel' });

test.describe('@allure.label.feature:SHOP', () => {
  let headers: Record<string, string>;
  let shopApiUrl: string;

  test.beforeEach(async ({ testInfo }) => {
    const token = new activateJwtToken();
    headers = await token.getJwtToken(testInfo);
    ({ shopApiUrl } = await token.loadConfig());
  });

  test('TC1_Send_Shop_Request_Validate_Offers', async ({ testData, assert }) => {
    // ── Declare all variables at the top (see section 5.5) ─────────────────
    const origin = testData.get('origin')?.toString()!;
    const destination = testData.get('destination')?.toString()!;
    const paxType = testData.get('paxType')?.toString()!;
    const parser = new ShopResponseParser();
    let shopResponse: any;
    let offerId: string;

    logger.info('TC1_Send_Shop_Request_Validate_Offers — started');

    // Shop
    const shopPayload = new ShopPayloadBuilder()
      .withRoute(origin, destination)
      .withPassengers(paxType)
      .build();

    shopResponse = await new ShopApiClient().shop(`${shopApiUrl}/shop`, headers, shopPayload);
    await assert.toBe(shopResponse.status(), 200, 'Verify shop response status is 200');

    offerId = parser.getFirstOfferId(await shopResponse.json());
    await assert.notToBeNull(offerId, 'Verify offer ID is not null');

    logger.info('TC1_Send_Shop_Request_Validate_Offers — completed');
  });
});
```

### ⚙️ What `BaseApiClient` handles automatically — DO NOT duplicate

| Concern | Handled by BaseApiClient |
|---|---|
| Attaching request payload to Allure | ✅ automatic |
| Attaching response body to Allure | ✅ automatic |
| Wrapping the call in an Allure step | ✅ automatic |
| Setting `Content-Type: application/json` | ✅ automatic |
| Logging request endpoint and response status | ✅ automatic |
| Catching and attaching network errors to Allure | ✅ automatic |

---

## <span style="color:#7C3AED">📨 12. XML API Test Development — Three-Layer Architecture</span>

All XML API tests follow the same three-layer architecture as JSON API tests. The key difference is that builders produce **XML strings** from template files (`.txt`) via `XmlTemplateProcessor`, and clients send `Content-Type: application/xml`.

### 🏗️ Layer 1 — Builders (`xml-api/builders/`)

Construct XML request payloads by combining template files with runtime values.

- File naming: `<name>-xml-payload-builder.ts` (e.g. `shop-xml-payload-builder.ts`)
- Every builder file starts with a JSDoc block showing a usage example
- All setter methods return `this` for fluent chaining
- Sections separated with `// ─── SectionName ───` dividers
- `.build()` returns a plain `string` (the complete XML), logs key parameters via `logger.info`
- Internally uses `XmlTemplateProcessor.replacePlaceholders()` and `readFileSync` for templates
- No HTTP logic, no response parsing — pure payload construction
- Throws descriptive `Error` if required inputs are missing before building

```typescript
/**
 * Builds the Shop XML request payload from the IATA AirShoppingRQ template.
 *
 * Usage:
 *   new ShopXmlPayloadBuilder()
 *     .withOrigin('SYD')
 *     .withDestination('MEL')
 *     .withDepartureDate('2025-12-20')
 *     .withPassengers(paxTypeMap)
 *     .withCurrency('AUD')
 *     .build();
 */
```

### 📡 Layer 2 — Clients (`xml-api/clients/`)

Send HTTP POST requests with XML payloads and attach formatted XML to the Allure report.

- File naming: `<name>-xml-api-client.ts` (e.g. `shop-xml-api-client.ts`)
- All clients extend `BaseXmlApiClient` — never write HTTP logic directly
- Each client exposes a single named method (`.shop()`, `.price()`, `.createOrder()`)
- `BaseXmlApiClient` automatically sets `Content-Type: application/xml`, attaches formatted request/response XML to Allure, logs endpoint and status, and catches network errors
- Allure step name format: `'Send <Operation> XML API Request and Log Request/Response'`
- Attachment names: `'<Operation> XML Request Payload'` and `'<Operation> XML Response Body'`

```typescript
// Example client
export class ShopXmlApiClient extends BaseXmlApiClient {
  async shop(endpoint: string, headers: Record<string, string>, xmlPayload: string): Promise<APIResponse> {
    return this.post(
      'Send Shop XML API Request and Log Request/Response',
      endpoint, headers, xmlPayload,
      'Shop XML Request Payload', 'Shop XML Response Body'
    );
  }
}
```

### 🔍 Layer 3 — Response Parsers (`xml-api/response-parsers/`)

Extract structured data from XML API responses using XPath.

- File naming: `<name>-xml-response-parser.ts` (e.g. `shop-xml-response-parser.ts`)
- No HTTP logic, no payload building — pure XML parsing with `xpath` + `xmldom`
- Methods named after the data they return
- **Must throw a descriptive `Error`** if a required field is missing
- `ShopXmlResponseParser.getPaxType()` is the canonical source for building the paxTypeMap — call it once per test and pass the result to builders and parsers that need it

### 📋 XML API Test Spec Rules (`tests/xml-api-tests/`)

- File naming: `<feature>test.spec.ts` (e.g. `createordertest.spec.ts`)
- Same rules as JSON API specs apply: `parallel` mode, declare all variables at top (see section 5.5), assert HTTP 200 after every call, logger at entry/exit, `assert` fixture only
- Group API calls with inline comments: `// Shop`, `// Price`, `// Create Order`
- `paxTypeMap` is obtained from `ShopXmlResponseParser.getPaxType()` before building the shop payload — **do not inline it in the builder**; pass it explicitly
- **Tests must never contain inline data extraction logic.** All data extraction must go in a named parser or builder method. For example, never write `Array.from(map.values())[0].get('key')` in a test — instead add a descriptively named method to the relevant parser class and call that.
- **No folded multiline invocations in XML API specs.** Keep `test(...)` signatures and API/assert/logger calls in single-line format; avoid wrapping a single invocation across multiple lines.
- **Blank line between API client transitions** — when calling a different API client than the previous step, insert one blank line between them to visually separate the API call boundaries; calls to the same client are grouped with no blank lines between them
- Allure feature labels must start with the project prefix and a hyphen: `@allure.label.feature:XMLAPI-...`
- Test case names must be relevant to the feature flow and key actions, for example: `TC1_Create_Paid_Order_Add_Paid_Seats_Payment`; do not include data-variant tokens such as trip type (`RT`/`OW`), pax composition (`2A`, `2A1C`), or route codes
- In each spec file, test case numbers must be continuous with no gaps or duplicates: `TC1`, `TC2`, `TC3`, ... ; missing numbers must be highlighted
- Keep invocation formatting single-line in specs (`test(...)`, `await apiClient...(...)`, `await assert...(...)`, `logger.info(...)`) unless a real syntax constraint prevents it

#### 🔁 Shared XML API Setup via `test.beforeEach` — No Helper Functions

When multiple XML API tests share common setup steps (e.g., JWT token loading, config loading, or a repeated Shop call whose response feeds all tests), place those shared steps directly in `test.beforeEach`. Keep test-specific API calls inside individual `test()` blocks.

**Every step must be a single, flat call.** Do **not** fold multiple API calls into local helper functions, wrapper abstractions, or utility closures within the spec file.

- **DO** place repeated setup (JWT token, config loading, shared Shop call, paxTypeMap generation) in `test.beforeEach`
- **DO** place test-specific API calls (Price, Create Order, custom operations) inside individual `test()` blocks
- **DO NOT** create local helper functions (e.g., `async function shopAndPrice(...)`) inside spec files
- **DO NOT** create type aliases or wrapper abstractions inside spec files
- Each step in `beforeEach` and `test` must be a **single, readable call** — not a folded abstraction

```typescript
import { APIResponse } from '@playwright/test';
import { ShopXmlPayloadBuilder } from '../../xml-api/builders/shop-xml-payload-builder';
import { ShopXmlApiClient } from '../../xml-api/clients/shop-xml-api-client';
import { ShopXmlResponseParser } from '../../xml-api/response-parsers/shop-xml-response-parser';
// ...

test('TC1_Create_Paid_Order_From_XML_Flow', async ({ testData, assert }) => {
  // Declare all variables at the top
  const paxType = testData.get('paxType')?.toString()!;
  const shopParser = new ShopXmlResponseParser();
  const priceParser = new PriceXmlResponseParser();
  const createOrderParser = new CreateOrderXmlResponseParser();
  let paxTypeMap: Map<string, string>;
  let shopResponse: APIResponse;
  // ... other variables

  logger.info('TC1_Create_Paid_Order_From_XML_Flow — started');

  // Shop
  paxTypeMap = shopParser.getPaxType(paxType);
  const shopPayload = new ShopXmlPayloadBuilder()
    .withOrigin('SYD').withDestination('MEL')
    .withDepartureDate('2025-12-20').withPassengers(paxTypeMap)
    .withCurrency('AUD').withCountryCode('AU').build();

  shopResponse = await new ShopXmlApiClient().shop(`${rmxNdcXml}/shop`, headers, shopPayload);
  await assert.toBe(shopResponse.status(), 200, 'Verify shop response status is 200');

  // ... Price, Create Order following the same pattern

  logger.info('TC1_Create_Paid_Order_From_XML_Flow — completed');
});
```

### 📌 XML Template Placeholders — Convention

| Template | Key placeholders |
|---|---|
| `shop.txt` | `$ARRIVAL` (origin), `$DESTINATION`, `$DATE`, `$CURRENCY`, `$AGENT_DUTY`, `$CITY_CODE`, `$COUNTRY_CODE`, `$SELLER_ORGID`, `$CARRIER_ORGID`, `#{@PAXLIST}` |
| `price.txt` | `$OFFERID`, `$OWNER_CODE`, `$CURRENCY`, `$LOCATION_CODE`, `$COUNTRY_CODE`, `$SELLER_ORGID`, `$CARRIER_ORGID`, `#{@SELECTEDOFFERITEM}` |
| `createorder.txt` | `$COUNTRY_CODE`, `$TOTAL_AMOUNT`, `#{@PAX}`, `#{@OFFER_ASSOCIATION}`, `#{@SELECTED_PRICED_OFFER}` |

> **Note:** In `shop.txt`, the origin departure airport maps to `$ARRIVAL` (a confusing legacy name). Builder method `withOrigin()` maps to `$ARRIVAL` internally. Do not rename the template variable.

---

## <span style="color:#EF4444">🎯 13. Locator Strategy</span>

Use this priority order when defining locators:

1. **ID** — `page.locator('#btnConfirmSeat')` — preferred, most stable
2. **Data attribute** — `page.locator('[data-bind*="confirmSeat"]')`
3. **Starts-with ID** — `page.locator("xpath=//input[starts-with(@id,'tbxAvailability')]")`
4. **Role + text** — `page.locator('[role="menuitemcheckbox"]:has-text("Reservations")')`
5. **CSS/XPath compound** — only when no stable ID or attribute exists

Never use positional nth-child CSS selectors for functional elements (they break on layout changes).
All stable locators are declared as `private readonly` class fields in the constructor — never create inline locators inside methods.
Exception: inline/method locators are allowed only for dynamic parameterized selectors and web-table/grid row-cell targeting.

---

## <span style="color:#D97706">📊 14. Allure Reporting</span>

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

## <span style="color:#0EA5E9">🔬 15. SonarQube Code Quality Rules</span>

All code written in this framework **must be compliant with the rules below** before being committed. SonarQube scans run as part of the CI pipeline. A scan that introduces new issues of severity **Critical** or **Blocker** will fail the build.

---

### 🛑 Reliability — No Bugs

#### R1 · Never leave a `Promise` unhandled
Every `async` call **must** be `await`-ed or explicitly returned. An unhandled promise is a silent failure in a test and a Blocker in Sonar.

```typescript
// ❌ WRONG — promise not awaited; test silently passes regardless of result
this.click(this.submitButton);

// ✅ CORRECT
await this.click(this.submitButton);
```

#### R2 · No empty `catch` blocks
Swallowing errors hides real failures. Either re-throw, log, or attach to Allure.

```typescript
// ❌ WRONG
try {
  await this.click(this.submitButton);
} catch (e) {}

// ✅ CORRECT
try {
  await this.click(this.submitButton);
} catch (e) {
  logger.error(`Submit button click failed: ${e}`);
  throw e;
}
```

#### R3 · No identical conditions in `if` / `else if` chains
Duplicate conditions always evaluate the same branch and indicate a logic error.

#### R4 · No self-assignments
`x = x` is always a copy-paste bug — Sonar flags it as Blocker.

---

### 🔒 Security — No Vulnerabilities

#### S1 · No hardcoded credentials in source code
Passwords, tokens, and API keys **must never** appear as string literals in `.ts` files. Load them from environment variables via `dotenvx` or the config loader.

```typescript
// ❌ WRONG
const token = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...';

// ✅ CORRECT
const token = await new activateJwtToken().getJwtToken(testInfo);
```

#### S2 · No hardcoded IP addresses
Use DNS names or environment-resolved URLs. Hardcoded IPs are flagged as a Vulnerability.

#### S3 · No use of `eval()` or `Function()` constructor
Dynamic code execution is a Critical security vulnerability. It is not permitted anywhere in this codebase.

#### S4 · Sensitive data must not be logged at INFO level
Passwords, CVV, full card numbers, and PII must **not** appear in `logger.info()` or `logger.debug()` calls. This is already required by Section 6 but is also enforced by Sonar rule `typescript:S2068`.

---

### 🧹 Maintainability — No Code Smells

#### M1 · Cognitive complexity ≤ 15 per method
Sonar rule `typescript:S3776`. A method that branches heavily is hard to understand and maintain. If a method exceeds cognitive complexity 15, split it into smaller private helpers.

```typescript
// ❌ WRONG — deeply nested logic inside one method
async buildComplexPayload(): Promise<void> {
  if (a) { if (b) { for (...) { if (c) { ... } } } }
}

// ✅ CORRECT — extract nested logic into private helpers
async buildComplexPayload(): Promise<void> {
  if (a) await this.handleCaseA(b);
}

private async handleCaseA(b: boolean): Promise<void> { ... }
```

#### M2 · No commented-out code
Remove dead code before committing. Use git history to recover deleted code. Sonar rule `typescript:S125`.

```typescript
// ❌ WRONG
// await this.click(this.oldButton);
await this.click(this.newButton);
```

#### M3 · No duplicate string literals — extract constants
Any string literal used **3 or more times** must be extracted to a named `const`. Sonar rule `typescript:S1192`.

```typescript
// ❌ WRONG
logger.info('Clicking Book button');
...
logger.info('Clicking Book button');
...
logger.info('Clicking Book button');

// ✅ CORRECT
const CLICK_BOOK_LOG = 'Clicking Book button';
```

#### M4 · No unused variables or imports
Remove any `import` or variable that is declared but never referenced. Sonar rule `typescript:S1481` and `typescript:S1128`. TypeScript's `noUnusedLocals` compiler option also enforces this.

```typescript
// ❌ WRONG
import { step } from 'allure-js-commons'; // imported but never used
const unusedVar = 'hello';
```

#### M5 · No magic numbers — use named constants
Numeric literals used in logic (not in simple increments or test IDs) must be extracted to a named `const` with a descriptive name. Sonar rule `typescript:S109`.

For `sleep()` timeouts in page objects, declare a **single** module-level constant `TIMEOUT` and reuse it across all methods — do not create separate named constants for each sleep call.

```typescript
// ❌ WRONG
await this.sleep(3000);

// ❌ ALSO WRONG — multiple constants for the same purpose
const SEGMENT_LOAD_DELAY_MS = 2000;
const PASSENGER_SWITCH_DELAY_MS = 1000;
const SAVE_DELAY_MS = 3000;

// ✅ CORRECT — single shared timeout constant per page object
const TIMEOUT = 3000;
await this.sleep(TIMEOUT);
```

#### M6 · No `TODO` or `FIXME` comments in committed code
Resolve the issue or create a tracked work item. Sonar flags these as Info/Minor issues that accumulate over time.

#### M7 · Functions must not have more than 5 parameters
Sonar rule `typescript:S107`. If more inputs are needed, group them into a typed options object.

```typescript
// ❌ WRONG
async buildOrder(origin: string, dest: string, date: string, pax: string, currency: string, cabin: string): Promise<void>

// ✅ CORRECT
interface OrderOptions { origin: string; destination: string; departureDate: string; paxType: string; currency: string; cabinType: string; }
async buildOrder(options: OrderOptions): Promise<void>
```

#### M9 · No `var` declarations — use `const` or `let`
`var` has function scope and causes subtle bugs. Sonar rule `typescript:S3735`. Always use `const` by default; use `let` only when reassignment is required.

#### M10 · Prefer `const` over `let` when value is never reassigned
Sonar rule `typescript:S3353`. Declare with `const` wherever the value is set once and never changed.

```typescript
// ❌ WRONG
let origin = testData.get('origin')?.toString()!;

// ✅ CORRECT
const origin = testData.get('origin')?.toString()!;
```

#### M11 · No non-null assertions (`!`) without a comment justifying them
The non-null assertion operator silences TypeScript's type checker. Every use must have an inline comment explaining why null is impossible at that point. Sonar rule `typescript:S4325`.

```typescript
// ❌ WRONG
const paxType = testData.get('paxType')!;

// ✅ CORRECT
// testData always contains 'paxType' — validated in beforeEach via fixture
const paxType = testData.get('paxType')!;
```

#### M12 · No `console.log` / `console.error` — use the logger
Raw `console` calls bypass log4js formatting and are not captured in the structured log output. Sonar rule `typescript:S2228`.

```typescript
// ❌ WRONG
console.log('Shop response:', response);

// ✅ CORRECT
logger.info(`Shop response status: ${response.status()}`);
```

#### M13 · Return type must be declared on all public methods
Sonar rule `typescript:S3776` (implicit). Explicit return types (`Promise<void>`, `Promise<string>`, etc.) improve readability and prevent accidental type widening.

---

### 📐 Naming & Structure Rules

#### N1 · Class names: `PascalCase`
`LoginPage`, `ShopPayloadBuilder`, `ShopApiClient` — no underscores, no abbreviations.

#### N2 · Method and variable names: `camelCase`
`selectSeat`, `getFirstOfferId`, `paxTypeMap` — descriptive nouns or verb-noun pairs.

#### N3 · Constants: `UPPER_SNAKE_CASE` for module-level constants
`const MAX_RETRY_COUNT = 3;` — only for truly fixed, named values. Local single-use consts may use `camelCase`.

#### N4 · File names: `kebab-case` for all source files
`shop-payload-builder.ts`, `loginpage.ts` — consistent with the rest of the framework.

---

### ⚙️ SonarQube Project Configuration

The `sonar-project.properties` file at the repo root controls what Sonar analyses. Key settings:

| Property | Value | Purpose |
|---|---|---|
| `sonar.projectKey` | `playwright-typescript` | Unique key in SonarQube server |
| `sonar.sources` | `.` | Analyse all TypeScript source files |
| `sonar.tests` | `tests` | Mark `tests/` directory as test code |
| `sonar.test.inclusions` | `**/*.spec.ts,**/*.test.ts` | Files treated as test code (relaxed rules) |
| `sonar.typescript.lcov.reportPaths` | `coverage/lcov.info` | Coverage data path |

> Test files (`*.spec.ts`) are scanned with a relaxed rule set — some maintainability rules (e.g. cognitive complexity, magic numbers) are less strict in test code. However, Reliability and Security rules apply equally to test and production code.

---

### 🚦 Sonar Quality Gate — Minimum Passing Thresholds

The pipeline quality gate requires **all new code** to meet:

| Metric | Threshold |
|---|---|
| Bugs (Blocker + Critical) | 0 |
| Vulnerabilities | 0 |
| Security Hotspots reviewed | 100% |
| Code Smells (new) | ≤ 5 |
| Duplicated lines on new code | < 5% |
| TypeScript compile errors | 0 |

---

## <span style="color:#22C55E">✅ 16. Checklist Before Submitting Code</span>

### 🖥️ UI Tests
- [ ] Page object file name matches the UI screen name exactly
- [ ] Class extends `BlackPanther`
- [ ] If agent mode is used, UI test case development is automated via `playwright-cli`
- [ ] Logger declared at the top of every page object and spec file
- [ ] Logger used in every public method (entry + completion + key values)
- [ ] No raw Playwright API (`locator.click()`, `page.waitForTimeout()`, `expect()`) in page objects
- [ ] Every public method has a JSDoc comment
- [ ] New page object is registered in `pageobjectmanager.ts` and `basetest.ts`
- [ ] All variables declared at the top of each test and class method (section 5.5), not inline mid-execution
- [ ] Test data added to the correct JSON file under `testdata/`
- [ ] No hardcoded values in spec files
- [ ] Test case names are relevant to the feature flow and key actions (example: `TC1_Create_Paid_Order_Add_Paid_Seats_Payment`) and do not include data-variant tokens (`RT`/`OW`, `2A`/`2A1C`, route codes)
- [ ] Test case numbers are continuous in each spec (`TC1`, `TC2`, `TC3`, ...) with no gaps or duplicates; missing numbers are highlighted
- [ ] Every `test()` has a concise `/** ... */` testcase comment (1–2 lines: intent and expected result) immediately above the test block
- [ ] Spec invocations are single-line (test signatures and page-object/assert/logger calls) with no folded multiline argument formatting

### 🔌 JSON API Tests
- [ ] Follows three-layer architecture: builder → client → parser
- [ ] Builder file has JSDoc header with usage example
- [ ] Builder section dividers use `// ─── SectionName ───` format
- [ ] Client extends `BaseApiClient` — no raw HTTP logic in tests or clients
- [ ] Parser methods throw descriptive `Error` if required field is missing
- [ ] `test.describe.configure({ mode: 'parallel' })` added at the top of every API spec
- [ ] Logger declared at the top of every API spec file
- [ ] Logger used at entry and exit of every test
- [ ] All variables declared at the top of the test and methods (section 5.5), not inline mid-execution
- [ ] **HTTP status 200 asserted immediately after every API call**
- [ ] `assert` fixture used for all assertions — no raw `expect()`
- [ ] JWT token and config loaded in `beforeEach`, not inline in tests
- [ ] **No inline data extraction logic in tests** — all extraction must be in named parser/builder methods
- [ ] Test data added to the correct JSON file under `testdata/`
- [ ] No hardcoded values in spec files
- [ ] Test case names are relevant to the feature flow and key actions, and do not include data-variant tokens (`RT`/`OW`, `2A`/`2A1C`, route codes)
- [ ] Test case numbers are continuous in each spec (`TC1`, `TC2`, `TC3`, ...) with no gaps or duplicates; missing numbers are highlighted
- [ ] Spec invocations are single-line (test signatures and API/assert/logger calls) with no folded multiline argument formatting

### 📨 XML API Tests
- [ ] Follows three-layer architecture: builder → client → parser
- [ ] Builder file has JSDoc header with usage example and lists all template placeholder mappings
- [ ] Builder section dividers use `// ─── SectionName ───` format
- [ ] Builder `.build()` returns a `string` (XML), not an object
- [ ] Builder throws descriptive `Error` if required fields are missing before building
- [ ] Client extends `BaseXmlApiClient` — no raw HTTP logic in tests or clients
- [ ] Parser uses `xpath` + `xmldom`; methods throw descriptive `Error` if required field is missing
- [ ] `paxTypeMap` obtained from `ShopXmlResponseParser.getPaxType()` and reused across builders/parsers
- [ ] `test.describe.configure({ mode: 'parallel' })` added at the top of every XML spec
- [ ] Logger declared at the top of every XML spec file
- [ ] Logger used at entry and exit of every test
- [ ] All variables declared at the top of the test and methods (section 5.5), not inline mid-execution
- [ ] **HTTP status 200 asserted immediately after every XML API call**
- [ ] `assert` fixture used for all assertions — no raw `expect()`
- [ ] JWT token and config loaded in `beforeEach`, not inline in tests
- [ ] **No inline data extraction logic in tests** — all extraction must be in named parser/builder methods
- [ ] No hardcoded values in spec files
- [ ] Test case names are relevant to the feature flow and key actions, and do not include data-variant tokens (`RT`/`OW`, `2A`/`2A1C`, route codes)
- [ ] Test case numbers are continuous in each spec (`TC1`, `TC2`, `TC3`, ...) with no gaps or duplicates; missing numbers are highlighted
- [ ] Spec invocations are single-line (test signatures and API/assert/logger calls) with no folded multiline argument formatting

### 🔒 All Code
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)

### 🔬 SonarQube
- [ ] All `Promise`s are `await`-ed — no unhandled promises (R1)
- [ ] No empty `catch` blocks — errors are logged and re-thrown (R2)
- [ ] No hardcoded credentials, tokens, or API keys in source files (S1)
- [ ] No `eval()` or `Function()` constructor usage (S3)
- [ ] Sensitive data (passwords, CVV, PII) not logged at INFO level (S4)
- [ ] No commented-out code blocks committed (M2)
- [ ] No unused variables or imports (M4)
- [ ] No magic numbers — numeric literals extracted to named `const` (M5)
- [ ] No `TODO` / `FIXME` comments in committed code (M6)
- [ ] No `var` declarations — `const` or `let` only (M9)
- [ ] `const` used wherever value is never reassigned (M10)
- [ ] Every non-null assertion (`!`) has an inline justification comment (M11)
- [ ] No `console.log` / `console.error` — logger used throughout (M12)
- [ ] All public methods have explicit return types (M13)
- [ ] Cognitive complexity ≤ 15 per method — split complex logic into helpers (M1)
- [ ] Call depth ≤ 3 levels — no deep delegation chains (A → B → C → D); flatten intermediate wrappers

---

## <span style="color:#EF4444">⏭️ Data-Driven Test Skipping (`skipTest`)</span>

When a test case is **not applicable** for a specific tenant or environment, use the `skipTest` flag in the test data JSON.

### Mechanism

The `testData` fixture in `utilities/fixtures.ts` automatically handles two skip scenarios:
1. **`skipTest: true` flag** — test data exists but is flagged as not applicable.
2. **Missing test case key** — the test case key is absent from the tenant's JSON file.

In both cases, `test.skip()` is called with a reason, and the test appears as **skipped** (not failed) in Playwright and Allure reports.

### JSON Format

```json
"TC1_Login_Into_Call_Center_Create_Paid_Order": [
    {
        "skipTest": true,
        "skipReason": "BEG-IST route not applicable for VA",
        "paymentType": "CARD",
        "tripType": "RT",
        "origin": "BEG",
        "destination": "IST"
    }
]
```

### Rules (SK1–SK5)

| ID | Rule |
|---|---|
| SK1 | **Always keep the test case key** in every tenant's JSON — never remove it. Use `skipTest: true` instead. |
| SK2 | **Always provide `skipReason`** — a clear, human-readable explanation shown in reports. |
| SK3 | **Keep the remaining data fields** intact — they serve as documentation of what the test would use if enabled. |
| SK4 | **Never add skip logic inside spec files** — the `testData` fixture handles it centrally. No `test.skip()` or `test.fixme()` calls in spec files for tenant-specific skips. |
| SK5 | If a test case key is **missing entirely** from a tenant's JSON, the fixture auto-skips with reason `"No test data for {testCaseName} in tenant: {tenant}"`. |
