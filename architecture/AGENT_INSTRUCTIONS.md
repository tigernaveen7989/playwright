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
    └── {env}/{subenv}/{tenant}/
        ├── url-and-accounts.json            # App URL, credentials
        └── call-center-ui.json              # Per-TC test data, global config (dateFormat, card details)
```

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

## <span style="color:#F59E0B">🪵 6. Logger Rules</span>

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

## <span style="color:#06B6D4">🖥️ 7. Test Spec File Rules (UI Tests)</span>

- One spec file per feature/flow: `createordertest.spec.ts`, `seatstest.spec.ts`
- Import page objects only via the proxy exports from `basetest.ts` — never instantiate them directly
- All test data comes from the `testData` fixture — never hardcode values in specs
- Use `logger.info()` to mark major steps so log output is readable in CI
- Assertions use the `assert` fixture from `utilities/assertions.ts` — never use raw `expect()` in specs
- **Declare all variables at the top of the test** — never declare variables inline mid-test
- Add a logger at the top of every spec file and log entry/exit of each test

```typescript
// ✅ CORRECT
import { LoggerFactory } from '../../utilities/logger';
import { loginPage, homePage } from '../basetest';
const logger = LoggerFactory.getLogger(__filename);

test('TC1_Verify_Login', async ({ testData, assert }) => {
  // Declare all variables at the top
  const userName = testData.get('userName')?.toString()!;
  const password = testData.get('password')?.toString()!;
  const welcomeText = 'Welcome, ';

  logger.info('TC1_Verify_Login — started');
  await loginPage.login(userName, password);
  await assert.toEqual(welcomeText, await homePage.getWelcomeText(), 'Verify welcome text');
  logger.info('TC1_Verify_Login — completed');
});

// ❌ WRONG — variable declared mid-test and no logger
test('TC1_Verify_Login', async ({ testData, assert }) => {
  await loginPage.login(testData.get('userName')?.toString()!, testData.get('password')?.toString()!);
  const welcomeText = await homePage.getWelcomeText(); // ❌ declared mid-test
  await assert.toEqual('Welcome, ', welcomeText, 'Verify welcome text');
});
```

---

## <span style="color:#06B6D4">🗃️ 8. Test Data Rules</span>

- All test data lives under `testdata/{env}/{subenv}/{tenant}/call-center-ui.json`
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

## <span style="color:#2563EB">🔌 9. API Test Development — Three-Layer Architecture</span>

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

  test('TC1_Verify_Shop_Returns_Offers', async ({ testData, assert }) => {
    // ── Declare all variables at the top ──────────────────────────────────
    const origin = testData.get('origin')?.toString()!;
    const destination = testData.get('destination')?.toString()!;
    const paxType = testData.get('paxType')?.toString()!;
    const parser = new ShopResponseParser();
    let shopResponse: any;
    let offerId: string;

    logger.info('TC1_Verify_Shop_Returns_Offers — started');

    // Shop
    const shopPayload = new ShopPayloadBuilder()
      .withRoute(origin, destination)
      .withPassengers(paxType)
      .build();

    shopResponse = await new ShopApiClient().shop(`${shopApiUrl}/shop`, headers, shopPayload);
    await assert.toBe(shopResponse.status(), 200, 'Verify shop response status is 200');

    offerId = parser.getFirstOfferId(await shopResponse.json());
    await assert.notToBeNull(offerId, 'Verify offer ID is not null');

    logger.info('TC1_Verify_Shop_Returns_Offers — completed');
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

## <span style="color:#7C3AED">📨 10. XML API Test Development — Three-Layer Architecture</span>

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
- Same rules as JSON API specs apply: `parallel` mode, declare all variables at top, assert HTTP 200 after every call, logger at entry/exit, `assert` fixture only
- Group API calls with inline comments: `// Shop`, `// Price`, `// Create Order`
- `paxTypeMap` is obtained from `ShopXmlResponseParser.getPaxType()` before building the shop payload — **do not inline it in the builder**; pass it explicitly
- **Tests must never contain inline data extraction logic.** All data extraction must go in a named parser or builder method. For example, never write `Array.from(map.values())[0].get('key')` in a test — instead add a descriptively named method to the relevant parser class and call that.

```typescript
import { APIResponse } from '@playwright/test';
import { ShopXmlPayloadBuilder } from '../../xml-api/builders/shop-xml-payload-builder';
import { ShopXmlApiClient } from '../../xml-api/clients/shop-xml-api-client';
import { ShopXmlResponseParser } from '../../xml-api/response-parsers/shop-xml-response-parser';
// ...

test('TC1_Verify_Create_Paid_Order', async ({ testData, assert }) => {
  // Declare all variables at the top
  const paxType = testData.get('paxType')?.toString()!;
  const shopParser = new ShopXmlResponseParser();
  const priceParser = new PriceXmlResponseParser();
  const createOrderParser = new CreateOrderXmlResponseParser();
  let paxTypeMap: Map<string, string>;
  let shopResponse: APIResponse;
  // ... other variables

  logger.info('TC1_Verify_Create_Paid_Order — started');

  // Shop
  paxTypeMap = shopParser.getPaxType(paxType);
  const shopPayload = new ShopXmlPayloadBuilder()
    .withOrigin('SYD').withDestination('MEL')
    .withDepartureDate('2025-12-20').withPassengers(paxTypeMap)
    .withCurrency('AUD').withCountryCode('AU').build();

  shopResponse = await new ShopXmlApiClient().shop(`${rmxNdcXml}/shop`, headers, shopPayload);
  await assert.toBe(shopResponse.status(), 200, 'Verify shop response status is 200');

  // ... Price, Create Order following the same pattern

  logger.info('TC1_Verify_Create_Paid_Order — completed');
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

## <span style="color:#EF4444">🎯 11. Locator Strategy</span>

Use this priority order when defining locators:

1. **ID** — `page.locator('#btnConfirmSeat')` — preferred, most stable
2. **Data attribute** — `page.locator('[data-bind*="confirmSeat"]')`
3. **Starts-with ID** — `page.locator("xpath=//input[starts-with(@id,'tbxAvailability')]")`
4. **Role + text** — `page.locator('[role="menuitemcheckbox"]:has-text("Reservations")')`
5. **CSS/XPath compound** — only when no stable ID or attribute exists

Never use positional nth-child CSS selectors for functional elements (they break on layout changes).
All locators are declared as `private readonly` class fields in the constructor — never create inline locators inside methods.

---

## <span style="color:#D97706">📊 12. Allure Reporting</span>

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

## <span style="color:#22C55E">✅ 13. Checklist Before Submitting Code</span>

### 🖥️ UI Tests
- [ ] Page object file name matches the UI screen name exactly
- [ ] Class extends `BlackPanther`
- [ ] Logger declared at the top of every page object and spec file
- [ ] Logger used in every public method (entry + completion + key values)
- [ ] No raw Playwright API (`locator.click()`, `page.waitForTimeout()`, `expect()`) in page objects
- [ ] Every public method has a JSDoc comment
- [ ] New page object is registered in `pageobjectmanager.ts` and `basetest.ts`
- [ ] All variables declared at the top of each test, not inline mid-test
- [ ] Test data added to the correct JSON file under `testdata/`
- [ ] No hardcoded values in spec files

### 🔌 JSON API Tests
- [ ] Follows three-layer architecture: builder → client → parser
- [ ] Builder file has JSDoc header with usage example
- [ ] Builder section dividers use `// ─── SectionName ───` format
- [ ] Client extends `BaseApiClient` — no raw HTTP logic in tests or clients
- [ ] Parser methods throw descriptive `Error` if required field is missing
- [ ] `test.describe.configure({ mode: 'parallel' })` added at the top of every API spec
- [ ] Logger declared at the top of every API spec file
- [ ] Logger used at entry and exit of every test
- [ ] All variables declared at the top of the test, not inline mid-test
- [ ] **HTTP status 200 asserted immediately after every API call**
- [ ] `assert` fixture used for all assertions — no raw `expect()`
- [ ] JWT token and config loaded in `beforeEach`, not inline in tests
- [ ] **No inline data extraction logic in tests** — all extraction must be in named parser/builder methods
- [ ] Test data added to the correct JSON file under `testdata/`
- [ ] No hardcoded values in spec files

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
- [ ] All variables declared at the top of the test, not inline mid-test
- [ ] **HTTP status 200 asserted immediately after every XML API call**
- [ ] `assert` fixture used for all assertions — no raw `expect()`
- [ ] JWT token and config loaded in `beforeEach`, not inline in tests
- [ ] **No inline data extraction logic in tests** — all extraction must be in named parser/builder methods
- [ ] No hardcoded values in spec files

### 🔒 All Code
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
