# API Test Case Development Guide

## Architecture Overview

This project follows a three-layer architecture for all JSON API tests. Each layer has a single responsibility, making tests easy to read, maintain, and extend.

```
json-api/
├── builders/                   # Build request payloads using the Builder pattern
│   ├── shop-payload-builder.ts
│   ├── price-payload-builder.ts
│   └── create-order-payload-builder.ts
│
├── clients/                    # Send HTTP requests and attach Allure evidence
│   ├── base-api-client.ts      # Abstract base — handles HTTP + Allure attachments
│   ├── shop-api-client.ts
│   ├── price-api-client.ts
│   └── create-order-api-client.ts
│
└── parsers/                    # Extract data from API responses
    ├── shop-response-parser.ts
    ├── price-response-parser.ts
    └── create-order-response-parser.ts
```

---

## Layer Responsibilities

### 1. Builders (`json-api/builders/`)
**Purpose:** Construct request payloads using the fluent Builder pattern.

- Each builder has `with*()` setter methods that return `this` (fluent interface).
- Call `.build()` at the end to produce the final payload object.
- No HTTP logic, no parsing — pure payload construction.

```typescript
// Example
const payload = new ShopPayloadBuilder()
  .withRoute('SYD', 'BNE')
  .withDepartureDate(10, 6, 2026)
  .withCurrency('AUD')
  .withPassengers('2A1C')
  .build();
```

### 2. Clients (`json-api/clients/`)
**Purpose:** Send HTTP POST requests and attach request/response evidence to the Allure report.

- `BaseApiClient` provides the shared `post()` method used by all clients.
- Each concrete client (`ShopApiClient`, etc.) exposes a named method (`.shop()`, `.price()`, `.createOrder()`).
- Automatically wraps each call in an Allure step and attaches payload + response.
- Network errors are caught, attached to Allure, and re-thrown.

```typescript
// Example
const response = await new ShopApiClient().shop(`${baseUrl}/shop`, headers, shopPayload);
```

### 3. Parsers (`json-api/response-parsers/`)
**Purpose:** Extract structured data from API response JSON.

- No HTTP logic, no payload building — pure response parsing.
- Each parser exposes named methods for each piece of data needed by tests.

```typescript
// Example
const parser = new ShopResponseParser();
const paxTypeMap = parser.getPaxType('2A1C');
const offerItemsMap = parser.getPaxOfferItemIdsMap(paxTypeMap, JSON.stringify(responseJson));
```

---

## Writing a New API Test

Follow this step-by-step workflow:

### Step 1 — Create the payload builder
Create `json-api/builders/my-api-payload-builder.ts`:

```typescript
export class MyApiPayloadBuilder {
  private field1: string = '';
  private field2: number = 0;

  withField1(value: string): this {
    this.field1 = value;
    return this;
  }

  withField2(value: number): this {
    this.field2 = value;
    return this;
  }

  build(): object {
    return {
      // construct payload
      field1: this.field1,
      field2: this.field2
    };
  }
}
```

### Step 2 — Create the API client
Create `json-api/clients/my-api-client.ts`:

```typescript
import { APIResponse } from '@playwright/test';
import { BaseApiClient } from './BaseApiClient';

export class MyApiClient extends BaseApiClient {
  async myOperation(
    endpoint: string,
    headers: Record<string, string>,
    payload: object
  ): Promise<APIResponse> {
    return this.post(
      'Send My API Request',       // Allure step name
      endpoint,
      headers,
      payload,
      'My Request Payload',        // Allure attachment name for request
      'My Response Body'           // Allure attachment name for response
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

test.describe('@allure.label.feature:MY-FEATURE', () => {
  let headers: Record<string, string>;
  let baseUrl: string;

  test.beforeEach(async ({ testInfo }) => {
    const token = new activateJwtToken();
    headers = await token.getJwtToken(testInfo);
    ({ rmxApiJson: baseUrl } = await token.loadConfig());
  });

  test('TC1_Verify_Something', async ({ testData, assert }) => {
    // Build
    const payload = new MyApiPayloadBuilder()
      .withField1('value')
      .withField2(42)
      .build();

    // Send
    const response = await new MyApiClient().myOperation(`${baseUrl}/endpoint`, headers, payload);
    await assert.toBe(response.ok(), true, 'Verify response is OK');

    // Parse & Assert
    const parser = new MyResponseParser();
    const value = parser.getSomeValue(await response.json());
    await assert.notToBeNull(value, 'Verify value is not null');
  });
});
```

---

## Key Conventions

| Convention | Rule |
|---|---|
| Builder methods | Always return `this` for fluent chaining |
| Builder `.build()` | Always returns a plain `object` |
| Client methods | One method per API operation, returns `Promise<APIResponse>` |
| Client `post()` step name | `'Send <Operation> API Request'` |
| Parser methods | Named after the data they return, throw `Error` if required field is missing |
| Test assertions | Use `assert.*` fixture, never raw `expect()` for business assertions |
| Test structure | Group API calls with `// Shop`, `// Price`, `// Create Order` comments |

---

## `BaseApiClient` — What it handles automatically

You do NOT need to manually do any of the following in tests or clients:

- Attaching request payload to Allure ✅ (automatic)
- Attaching response body to Allure ✅ (automatic)
- Wrapping the call in an Allure step ✅ (automatic)
- Setting `Content-Type: application/json` header ✅ (automatic)
- Catching and attaching network errors ✅ (automatic)

---

## Folder Naming Conventions

| Layer | Folder | Naming Pattern | Example |
|---|---|---|---|
| Builder | `json-api/builders/` | `<name>-payload-builder.ts` | `shop-payload-builder.ts` |
| Client | `json-api/clients/` | `<name>-api-client.ts` | `shop-api-client.ts` |
| Parser | `json-api/response-parsers/` | `<name>-response-parser.ts` | `shop-response-parser.ts` |
| Test | `tests/json-api-tests/` | `<feature>test.spec.ts` | `createordertest.spec.ts` |
