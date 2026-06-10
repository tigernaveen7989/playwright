# <span style="color:#6366F1">📘 API Test Case Development Guide</span>

## <span style="color:#3B82F6">🏗️ Architecture Overview</span>

This project follows a three-layer architecture for all JSON API tests. Each layer has a single responsibility, making tests easy to read, maintain, and extend.

```
json-api/
├── builders/                        # Build request payloads using the Builder pattern
│   ├── shop-payload-builder.ts
│   ├── price-payload-builder.ts
│   ├── create-order-payload-builder.ts
│   └── update-passenger-payload-builder.ts
│
├── clients/                         # Send HTTP requests and attach Allure evidence
│   ├── base-api-client.ts           # Abstract base — handles HTTP + Allure + logging
│   ├── shop-api-client.ts
│   ├── price-api-client.ts
│   └── create-order-api-client.ts
│
└── response-parsers/                # Extract data from API responses
    ├── shop-response-parser.ts
    ├── price-response-parser.ts
    └── create-order-response-parser.ts
```

---

## <span style="color:#10B981">✏️ Critical Rule: One API = One Class Per Layer</span>

**Every API method (Shop, Price, CreateOrder, etc.) must have exactly ONE builder class, ONE client class, and ONE response parser class. Never create multiple builder/client/parser classes for the same API.**

```
✅ Shop API (example):
   json-api/builders/shop-payload-builder.ts           → ONE: ShopPayloadBuilder
   json-api/clients/shop-api-client.ts                 → ONE: ShopApiClient
   json-api/response-parsers/shop-response-parser.ts   → ONE: ShopResponseParser

❌ Do NOT do this:
   json-api/builders/shop-payload-builder.ts          ← OK
   json-api/builders/shop-payload-builder-v2.ts       ← WRONG (multiple classes for same API)
```

**If variations in behavior are needed** (e.g., different optional fields, alternate flows), implement them **within the single class** using parameters and conditional logic — never split into separate classes.

---

## <span style="color:#06B6D4">📦 Layer Responsibilities</span>

### 🏗️ 1. Builders (`json-api/builders/`)
**Purpose:** Construct request payloads using the fluent Builder pattern.

- Each builder file starts with a JSDoc comment block showing usage examples.
- Each builder has `with*()` setter methods that return `this` (fluent interface).
- Sections inside the class are separated with `// ─── SectionName ───` dividers.
- Call `.build()` at the end to produce the final payload object.
- No HTTP logic, no parsing — pure payload construction.
- Logs the built payload via `LoggerFactory` (file-only, not printed to console).

```typescript
/**
 * Builds the shop request payload.
 *
 * Usage:
 *   new ShopPayloadBuilder()
 *     .withRoute('SYD', 'BNE')
 *     .withDepartureDate(10, 6, 2026)
 *     .withCurrency('AUD')
 *     .withPassengers('2A1C')
 *     .build();
 */
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export class ShopPayloadBuilder {
  // ... fields ...

  // ─── Route ───────────────────────────────────────────────────────────────

  withRoute(origin: string, destination: string): this { ... }

  // ─── Build ───────────────────────────────────────────────────────────────

  build(): object {
    const payload = { ... };
    logger.info('Shop payload:', JSON.stringify(payload));
    return payload;
  }
}
```

### 📡 2. Clients (`json-api/clients/`)
**Purpose:** Send HTTP POST requests and attach request/response evidence to the Allure report.

- `BaseApiClient` provides the shared `post()` method used by all clients.
- Each concrete client exposes a single named method (`.shop()`, `.price()`, `.createOrder()`).
- Automatically wraps each call in an Allure step, attaches payload + response as JSON, and logs via `LoggerFactory`.
- Network errors are caught, attached to Allure, and re-thrown.

```typescript
// Example
const response = await new ShopApiClient().shop(`${rmxApiJson}/shop`, headers, shopPayload);
```

### 🔍 3. Response Parsers (`json-api/response-parsers/`)
**Purpose:** Extract structured data from API response JSON.

- No HTTP logic, no payload building — pure response parsing.
- Each parser exposes named methods for each piece of data needed by tests.
- Throws descriptive `Error` if a required field is missing from the response.

```typescript
// Example
const shopParser = new ShopResponseParser();
const paxTypeMap = shopParser.getPaxType('2A1C');
const offerItemsMap = shopParser.getPaxOfferItemIdsMap(paxTypeMap, JSON.stringify(responseJson));
```

---

## <span style="color:#F59E0B">✏️ Writing a New API Test</span>

Follow this step-by-step workflow:

### 🔧 Step 1 — Create the payload builder
Create `json-api/builders/my-api-payload-builder.ts`:

```typescript
/**
 * Builds the my-api request payload.
 *
 * Usage:
 *   new MyApiPayloadBuilder()
 *     .withField1('value')
 *     .withField2(42)
 *     .build();
 */
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export class MyApiPayloadBuilder {
  private field1: string = '';
  private field2: number = 0;

  // ─── Field1 ──────────────────────────────────────────────────────────────

  withField1(value: string): this {
    this.field1 = value;
    return this;
  }

  // ─── Field2 ──────────────────────────────────────────────────────────────

  withField2(value: number): this {
    this.field2 = value;
    return this;
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  build(): object {
    const payload = {
      field1: this.field1,
      field2: this.field2
    };
    logger.info('MyApi payload:', JSON.stringify(payload));
    return payload;
  }
}
```

### 📡 Step 2 — Create the API client
Create `json-api/clients/my-api-client.ts`:

```typescript
import { APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api-client';

export class MyApiClient extends BaseApiClient {
  async myOperation(
    endpoint: string,
    headers: Record<string, string>,
    payload: object
  ): Promise<APIResponse> {
    return this.post(
      'Send My Operation API Request and Log Request/Response',
      endpoint,
      headers,
      payload,
      'My Operation Request Payload',
      'My Operation Response Body'
    );
  }
}
```

### 🔍 Step 3 — Create the response parser
Create `json-api/response-parsers/my-response-parser.ts`:

```typescript
export class MyResponseParser {
  getSomeValue(responseJson: any): string {
    const value = responseJson?.some?.nested?.field;
    if (!value) throw new Error('Value not found in response');
    return value;
  }
}
```

### 📝 Step 4 — Write the test
Create `tests/json-api-tests/mytest.spec.ts`:

> **Rule:** Place shared API setup steps (JWT token, config loading, repeated API calls like Shop) in `test.beforeEach`. Keep test-specific API calls inside individual `test()` blocks. Every step must be a single, flat call — **never** fold multiple API calls into local helper functions, wrapper abstractions, or type aliases within the spec file.
>
> **Rule:** Do not keep business iteration/orchestration in API specs (for example nested loops applying parsed maps). Move that implementation into builder/parser/client/utility methods and call a single descriptive method from the spec.
>
> **Rule:** Declare all variables at the top of each test and class method before any logic or API calls. This applies to builders, clients, parsers, utilities, and specs — not only test bodies.

#### Single-test spec

```typescript
import { test } from '../../utilities/fixtures';
import { activateJwtToken } from '../../api-base/activatejwttoken';
import { MyApiPayloadBuilder } from '../../json-api/builders/my-api-payload-builder';
import { MyApiClient } from '../../json-api/clients/my-api-client';
import { MyResponseParser } from '../../json-api/response-parsers/my-response-parser';

test.describe.configure({ mode: 'parallel' });

test.describe('@allure.label.feature:MY-FEATURE', () => {
  let headers: Record<string, string>;
  let myApiUrl: string;

  test.beforeEach(async ({ testInfo }) => {
    const token = new activateJwtToken();
    headers = await token.getJwtToken(testInfo);
    ({ myApiUrl } = await token.loadConfig());
  });

  test('TC1_Verify_Something', async ({ testData, assert }) => {
    const myInput = testData.get('myInput')?.toString()!;
    const parser = new MyResponseParser();

    // My Operation
    const payload = new MyApiPayloadBuilder()
      .withField1(myInput)
      .withField2(42)
      .build();

    const response = await new MyApiClient().myOperation(`${myApiUrl}/endpoint`, headers, payload);
    await assert.toBe(response.ok(), true, 'Verify response is OK');

    const value = parser.getSomeValue(await response.json());
    await assert.notToBeNull(value, 'Verify value is not null');
  });
});
```

#### Multi-test spec with shared API setup (`beforeEach` pattern)

When multiple tests share the same API setup (e.g., a common Shop call whose response feeds downstream tests), use `test.beforeEach` for the shared calls and individual `test()` blocks for test-specific calls:

```typescript
import { test } from '../../utilities/fixtures';
import { LoggerFactory } from '../../utilities/logger';
import { activateJwtToken } from '../../api-base/activatejwttoken';
import { ShopPayloadBuilder } from '../../json-api/builders/shop-payload-builder';
import { ShopApiClient } from '../../json-api/clients/shop-api-client';
import { ShopResponseParser } from '../../json-api/response-parsers/shop-response-parser';
import { PricePayloadBuilder } from '../../json-api/builders/price-payload-builder';
import { PriceApiClient } from '../../json-api/clients/price-api-client';

const logger = LoggerFactory.getLogger(__filename);

test.describe.configure({ mode: 'parallel' });

test.describe('@allure.label.feature:JSONAPI-Order', () => {
  let headers: Record<string, string>;
  let apiUrl: string;
  let shopResponseJson: any;

  // ── Shared setup — runs before every test ────────────────────────────
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

  // ── Test-specific API calls in each test ───────────────────────
  test('TC1_Verify_Price', async ({ testData, assert }) => {
    logger.info('TC1 — started');
    const offerId = new ShopResponseParser().getFirstOfferId(shopResponseJson);
    const pricePayload = new PricePayloadBuilder().withOfferId(offerId).build();
    const priceResponse = await new PriceApiClient().price(`${apiUrl}/price`, headers, pricePayload);
    await assert.toBe(priceResponse.status(), 200, 'Verify price response status is 200');
    logger.info('TC1 — completed');
  });

  test('TC2_Verify_Create_Order', async ({ testData, assert }) => {
    logger.info('TC2 — started');
    // Price + Create Order — test-specific, direct API calls
    // ... no helper function wrappers
    logger.info('TC2 — completed');
  });
});
```

#### ❌ Anti-patterns — never do this in API spec files

```typescript
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

// ❌ WRONG — type alias or wrapper abstraction inside spec file
type ApiChainConfig = { callShop: boolean; callPrice: boolean };
async function runApiChain(config: ApiChainConfig) { ... }
```

---

## <span style="color:#D97706">📌 Key Conventions</span>

| Convention | Rule |
|---|---|
| Builder file header | JSDoc block with class description and usage example |
| Builder section dividers | `// ─── SectionName ───────────────────────────────────────────────────────────────` |
| Builder methods | Always return `this` for fluent chaining |
| Builder `.build()` | Always returns a plain `object`; logs payload via `logger.info` |
| Client import | `import { BaseApiClient } from './base-api-client'` |
| Client `post()` step name | `'Send <Operation> API Request and Log Request/Response'` |
| Client attachment names | `'<Operation> Request Payload'` and `'<Operation> Response Body'` |
| Parser methods | Named after the data they return; throw `Error` if required field is missing |
| Locator declarations (when generating page objects/helpers) | All stable locators must be declared as `private readonly` in constructor; method-local locators are allowed only for dynamic parameterized selectors or web-table/grid row-cell targeting |
| Test assertions | Use `assert.*` fixture, never raw `expect()` for business assertions |
| Test structure | Group API calls with `// Shop`, `// Price`, `// Create Order` inline comments |
| Variable declaration | Declare all `let`/`const` variables at the top of each test and class method before any logic or API calls |
| Allure feature label | Must start with project prefix and hyphen, for example: `@allure.label.feature:JSONAPI-...` |
| Test parallelism | Add `test.describe.configure({ mode: 'parallel' })` at the top of each spec |
| Test case naming | Test names must be relevant to the feature flow and describe key actions in sequence, for example: `TC1_Create_Paid_Order_Add_Paid_Seats_Payment`; do not include data-variant tokens such as `RT`/`OW`, `2A`/`2A1C`, or route codes |
| Test case numbering | In each spec file, test numbers must be continuous with no gaps or duplicates (`TC1`, `TC2`, `TC3`, ...). Missing numbers must be highlighted and corrected |
| Test case comments | Every `test()` must have a concise `/** ... */` block comment immediately above it (1–2 lines covering testcase intent and expected result) |
| Shared API setup | Place repeated API calls (JWT, config, common Shop) in `test.beforeEach` — never in local helper functions |
| Flat steps only | Every step must be a single API call — never fold steps into helper functions, type aliases, or wrapper abstractions within spec files |
| Single-line invocation format | Keep `test(...)` signatures and API/assert/logger calls in single-line format; avoid folded multiline argument formatting in specs |
| API client transition spacing | Insert one blank line between the last call to one API client and the first call to the next; calls to the same API client are grouped with no blank lines between them |
| Variable declaration | Declare all `let`/`const` variables at the top of each test and class method before any logic or API calls |
| Code simplicity (KISS) | Methods must be short, flat, and obvious — no deeply nested `if/else` chains; prefer early returns, guard clauses, or iterating a candidate list |
| Shallow call depth (≤ 3 levels) | A public method may call a helper, which may call one more helper — but chains deeper than 3 levels (A → B → C → D → …) make debugging extremely difficult; flatten intermediate delegation methods that only forward calls |
| No duplication (DRY) | If a pattern repeats more than twice, extract it into a private helper or base class method |
| Single responsibility (SOLID) | Each method does one thing; split methods that build, send, and parse into focused helpers. SOLID is a guideline — apply where it improves readability |
| Dead code removal | Remove all unused variables, imports, functions, and commented lines — reviewers will reject PRs containing dead code; use git history if you need old code |

---

## <span style="color:#8B5CF6">⚙️ `BaseApiClient` — What it handles automatically</span>

You do NOT need to manually do any of the following in tests or clients:

- Attaching request payload to Allure ✅ (automatic)
- Attaching response body to Allure ✅ (automatic)
- Wrapping the call in an Allure step ✅ (automatic)
- Setting `Content-Type: application/json` header ✅ (automatic)
- Logging request endpoint and response status ✅ (automatic)
- Catching and attaching network errors to Allure ✅ (automatic)

---

## <span style="color:#10B981">📁 Folder Naming Conventions</span>

| Layer | Folder | Naming Pattern | Example |
|---|---|---|---|
| Builder | `json-api/builders/` | `<name>-payload-builder.ts` | `shop-payload-builder.ts` |
| Client | `json-api/clients/` | `<name>-api-client.ts` | `shop-api-client.ts` |
| Parser | `json-api/response-parsers/` | `<name>-response-parser.ts` | `shop-response-parser.ts` |
| Test | `tests/json-api-tests/` | `<feature>test.spec.ts` | `createordertest.spec.ts` |

---

## <span style="color:#EF4444">⏭️ Data-Driven Test Skipping (`skipTest`)</span>

When an API test case is **not applicable** for a specific tenant or environment, use the `skipTest` flag in the test data JSON.

### JSON Format

```json
"TC1_Verify_Create_Order_API": [
    {
        "skipTest": true,
        "skipReason": "Create Order API not supported for VA tenant",
        "origin": "SYD",
        "destination": "BNE"
    }
]
```

| Field | Required | Description |
|---|---|---|
| `skipTest` | Yes | Set to `true` to skip the test for this tenant |
| `skipReason` | No | Human-readable reason shown in reports (defaults to `"Test skipped for tenant: {tenant}"`) |

### Rules

1. **Always keep the test case key** in every tenant's JSON — never remove it. Use `skipTest: true` instead.
2. **Always provide `skipReason`** so reports and CI logs clearly explain why a test was skipped.
3. **Keep the remaining data fields** intact — they serve as documentation of what the test would use if enabled.
4. **Never add skip logic inside spec files** — the `testData` fixture in `utilities/fixtures.ts` handles it centrally.
5. If a test case key is **missing entirely** from a tenant's JSON, the fixture auto-skips with a default reason.
