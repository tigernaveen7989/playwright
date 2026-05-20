# API Test Case Development Guide

## Architecture Overview

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

## Layer Responsibilities

### 1. Builders (`json-api/builders/`)
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

### 2. Clients (`json-api/clients/`)
**Purpose:** Send HTTP POST requests and attach request/response evidence to the Allure report.

- `BaseApiClient` provides the shared `post()` method used by all clients.
- Each concrete client exposes a single named method (`.shop()`, `.price()`, `.createOrder()`).
- Automatically wraps each call in an Allure step, attaches payload + response as JSON, and logs via `LoggerFactory`.
- Network errors are caught, attached to Allure, and re-thrown.

```typescript
// Example
const response = await new ShopApiClient().shop(`${rmxApiJson}/shop`, headers, shopPayload);
```

### 3. Response Parsers (`json-api/response-parsers/`)
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

## Writing a New API Test

Follow this step-by-step workflow:

### Step 1 — Create the payload builder
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

### Step 2 — Create the API client
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

### Step 3 — Create the response parser
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

### Step 4 — Write the test
Create `tests/json-api-tests/mytest.spec.ts`:

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

---

## Key Conventions

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
| Test assertions | Use `assert.*` fixture, never raw `expect()` for business assertions |
| Test structure | Group API calls with `// Shop`, `// Price`, `// Create Order` inline comments |
| Test parallelism | Add `test.describe.configure({ mode: 'parallel' })` at the top of each spec |

---

## `BaseApiClient` — What it handles automatically

You do NOT need to manually do any of the following in tests or clients:

- Attaching request payload to Allure ✅ (automatic)
- Attaching response body to Allure ✅ (automatic)
- Wrapping the call in an Allure step ✅ (automatic)
- Setting `Content-Type: application/json` header ✅ (automatic)
- Logging request endpoint and response status ✅ (automatic)
- Catching and attaching network errors to Allure ✅ (automatic)

---

## Folder Naming Conventions

| Layer | Folder | Naming Pattern | Example |
|---|---|---|---|
| Builder | `json-api/builders/` | `<name>-payload-builder.ts` | `shop-payload-builder.ts` |
| Client | `json-api/clients/` | `<name>-api-client.ts` | `shop-api-client.ts` |
| Parser | `json-api/response-parsers/` | `<name>-response-parser.ts` | `shop-response-parser.ts` |
| Test | `tests/json-api-tests/` | `<feature>test.spec.ts` | `createordertest.spec.ts` |
