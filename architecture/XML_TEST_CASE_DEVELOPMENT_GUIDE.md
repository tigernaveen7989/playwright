# XML API Test Case Development Guide

## Architecture Overview

All XML API tests follow a strict three-layer architecture. Each layer has a single responsibility, making tests easy to read, maintain, and extend.

```
xml-api/
├── builders/                            # Build XML request payloads from templates
│   ├── shop-xml-payload-builder.ts
│   ├── price-xml-payload-builder.ts
│   └── create-order-xml-payload-builder.ts
│
├── clients/                             # Send HTTP XML requests and attach Allure evidence
│   ├── base-xml-api-client.ts           # Abstract base — handles XML HTTP + Allure + logging
│   ├── shop-xml-api-client.ts
│   ├── price-xml-api-client.ts
│   └── create-order-xml-api-client.ts
│
├── response-parsers/                    # Extract data from XML API responses using XPath
│   ├── shop-xml-response-parser.ts
│   ├── price-xml-response-parser.ts
│   └── create-order-xml-response-parser.ts
│
└── payloads/                            # XML template files (.txt) with $PLACEHOLDER tokens
    ├── shop/
    │   ├── shop.txt
    │   └── paxlist.txt
    ├── price/
    │   ├── price.txt
    │   └── selectedofferitem.txt
    └── create-order/
        ├── createorder.txt
        ├── pax.txt
        ├── offerassociation.txt
        └── selectedpricedoffer.txt
```

Tests live in `tests/xml-api-tests/`. The support infrastructure is in `api-base/`:
- `api-base/activatejwttoken.ts` — JWT token generation and config loader
- `api-base/xml-template-processor.ts` — Reads `.txt` templates and replaces `$PLACEHOLDER` tokens

---

## The Data Flow

Every XML API test follows the same sequential chain — each step's output feeds the next:

```
testData.paxType (string)
    │
    ▼
ShopXmlResponseParser.getPaxType()           → paxTypeMap
    │
    ▼
ShopXmlPayloadBuilder.withPassengers(paxTypeMap) → shop XML payload
    │
    ▼
ShopXmlApiClient.shop()                       → shopResponse
    │
    ▼
ShopXmlResponseParser.getPaxOfferItemIdsMap(paxTypeMap, responseText) → paxIdOffersItemIdsMap
    │
    ▼
PriceXmlPayloadBuilder.withPaxIdOffersItemIdsMap(paxIdOffersItemIdsMap) → price XML payload
    │
    ▼
PriceXmlApiClient.price()                     → priceResponse
    │
    ▼
PriceXmlResponseParser.getPassengerDetailsMap(responseText, paxTypeMap) → passengerDetailsMap
PriceXmlResponseParser.getOfferId(passengerDetailsMap)                  → offerId
    │
    ▼
CreateOrderXmlPayloadBuilder
    .withPassengerDetailsMap(passengerDetailsMap)
    .withOfferId(offerId)                     → createOrder XML payload
    │
    ▼
CreateOrderXmlApiClient.createOrder()         → createOrderResponse
    │
    ▼
CreateOrderXmlResponseParser.getOrderId()     → orderId
```

---

## Layer Responsibilities

### Layer 1 — Builders (`xml-api/builders/`)

**Purpose:** Construct XML request payloads by filling `$PLACEHOLDER` tokens in `.txt` template files using `XmlTemplateProcessor`.

- File naming: `<name>-xml-payload-builder.ts`
- Every builder starts with a JSDoc block showing usage
- All `with*()` setter methods return `this` (fluent chaining)
- Sections separated with `// ─── SectionName ───` dividers
- `.build()` returns a `string` (the complete XML), not an object
- Throws a descriptive `Error` if required inputs are missing
- Logs key parameters via `logger.info` at the end of `.build()`
- No HTTP logic, no response parsing — pure payload construction

```typescript
/**
 * Builds the Shop XML request payload from the IATA AirShoppingRQ template.
 *
 * Usage:
 *   new ShopXmlPayloadBuilder()
 *     .withOrigin('SYD')
 *     .withDestination('MEL')
 *     .withDepartureDate('2026-06-20')
 *     .withPassengers(paxTypeMap)        // from ShopXmlResponseParser.getPaxType()
 *     .withCurrency('AUD')
 *     .withAgentDuty('NDC')
 *     .withCityCode('DNN')
 *     .withCountryCode('AU')
 *     .withSellerOrgId('')
 *     .withCarrierOrgId('')
 *     .build();
 */
import { XmlTemplateProcessor } from '../../api-base/xml-template-processor';
import { LoggerFactory } from '../../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

export class ShopXmlPayloadBuilder {
  private readonly xmlProcessor = new XmlTemplateProcessor();
  private readonly shopTemplatePath = `${process.cwd()}/xml-api/payloads/shop/shop.txt`;
  private readonly paxListTemplatePath = `${process.cwd()}/xml-api/payloads/shop/paxlist.txt`;

  private origin: string = '';
  private destination: string = '';
  // ... other fields ...

  // ─── Route ───────────────────────────────────────────────────────────────

  withOrigin(code: string): this {
    this.origin = code;
    return this;
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  build(): string {
    if (!this.origin || !this.destination)
      throw new Error('ShopXmlPayloadBuilder: origin and destination are required');

    const replacements: Record<string, string> = {
      '$ARRIVAL': this.origin,         // NOTE: $ARRIVAL maps to origin (legacy template name)
      '$DESTINATION': this.destination,
      '#{@PAXLIST}': this.buildPaxListXml(),
      // ... other replacements ...
    };

    const xmlPayload = this.xmlProcessor.replacePlaceholders(replacements, this.shopTemplatePath);
    logger.info(`Shop XML payload built — origin: ${this.origin}, dest: ${this.destination}`);
    return xmlPayload;
  }
}
```

> **⚠️ Template naming gotcha:** In `shop.txt`, the origin departure airport maps to `$ARRIVAL` — a confusing legacy name. The `withOrigin()` method maps to `$ARRIVAL` internally. Do not rename the template variable.

---

### Layer 2 — Clients (`xml-api/clients/`)

**Purpose:** Send HTTP POST requests with XML payloads and attach formatted XML to the Allure report.

- File naming: `<name>-xml-api-client.ts`
- All clients extend `BaseXmlApiClient` — never write HTTP logic directly in a client or test
- Each client exposes **one named method** (`.shop()`, `.price()`, `.createOrder()`)
- `BaseXmlApiClient` automatically handles: Allure step wrapping, XML formatting and attachment, `Content-Type: application/xml`, logging, and network error catching

```typescript
// base-xml-api-client.ts — DO NOT modify; all clients inherit this
export abstract class BaseXmlApiClient {
  protected async post(
    stepName: string,
    endpoint: string,
    headers: Record<string, string>,
    xmlPayload: string,
    requestAttachmentName: string,
    responseAttachmentName: string
  ): Promise<APIResponse> { /* handles everything automatically */ }
}

// shop-xml-api-client.ts — typical concrete client
import { APIResponse } from '@playwright/test';
import { BaseXmlApiClient } from './base-xml-api-client';

export class ShopXmlApiClient extends BaseXmlApiClient {
  async shop(
    endpoint: string,
    headers: Record<string, string>,
    xmlPayload: string
  ): Promise<APIResponse> {
    return this.post(
      'Send Shop XML API Request and Log Request/Response',
      endpoint,
      headers,
      xmlPayload,
      'Shop XML Request Payload',
      'Shop XML Response Body'
    );
  }
}
```

Usage in a test:
```typescript
shopResponse = await new ShopXmlApiClient().shop(`${rmxNdcXml}/shop`, headers, shopPayload);
```

---

### Layer 3 — Response Parsers (`xml-api/response-parsers/`)

**Purpose:** Extract structured data from XML API responses using XPath + `xmldom`.

- File naming: `<name>-xml-response-parser.ts`
- Uses `xpath` and `DOMParser` from `xmldom` — never raw string matching
- Methods named after the data they return
- **Must throw a descriptive `Error`** if a required field is missing
- **No inline data extraction in tests** — every extraction must be a named parser method

#### `ShopXmlResponseParser`

```typescript
// getPaxType — MUST be called first; result is reused by builders and parsers downstream
const shopParser = new ShopXmlResponseParser();
paxTypeMap = shopParser.getPaxType('2A1C');
// Returns: Map { PAX1 → 'ADT', PAX2 → 'ADT', PAX3 → 'CNN' }

// getPaxOfferItemIdsMap — call after shop response
paxIdOffersItemIdsMap = shopParser.getPaxOfferItemIdsMap(paxTypeMap, shopResponseText);
// Returns: Map { 'OfferId' → 'abc123', 'PAX1' → 'abc123-0', 'PAX2' → 'abc123-1' }
```

#### `PriceXmlResponseParser`

```typescript
const priceParser = new PriceXmlResponseParser();

// getPassengerDetailsMap — call after price response
passengerDetailsMap = priceParser.getPassengerDetailsMap(priceResponseText, paxTypeMap);
// Returns: Map {
//   'PAX1' → Map { 'offerId' → 'xyz', 'offerItemId' → 'xyz-0', 'price' → '623.00', 'paxTypeCode' → 'ADT', ... }
// }

// getOfferId — extracts OfferID from the map (always consistent with OfferItemIDs)
offerId = priceParser.getOfferId(passengerDetailsMap);
// Returns: 'xyz'
```

> **⚠️ Critical:** Always call `getOfferId(passengerDetailsMap)` — NOT `getOfferID(xmlString)`. The former is always consistent with the OfferItemIDs stored in the map. The XML response may contain multiple priced offers; using `getOfferID(xmlString)` can return a different offer's ID, causing a mismatch.

#### `CreateOrderXmlResponseParser`

```typescript
const createOrderParser = new CreateOrderXmlResponseParser();

orderId = createOrderParser.getOrderId(createOrderResponseText);
// Returns: 'VA795J8N1RXYY' or null if not present

warningMessage = createOrderParser.getWarningMessage(createOrderResponseText);
// Returns: warning text string, or '' if no warning
```

---

## Writing a New XML API Test — Step by Step

### Step 1 — Create the payload builder

Create `xml-api/builders/my-xml-payload-builder.ts`:

```typescript
/**
 * Builds the My Operation XML request payload from the template.
 *
 * Usage:
 *   new MyXmlPayloadBuilder()
 *     .withField1('value')
 *     .withOwnerCode('VA')
 *     .withCountryCode('AU')
 *     .build();
 */
import { readFileSync } from 'fs';
import { XmlTemplateProcessor } from '../../api-base/xml-template-processor';
import { LoggerFactory } from '../../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

export class MyXmlPayloadBuilder {
  private readonly xmlProcessor = new XmlTemplateProcessor();
  private readonly templatePath = `${process.cwd()}/xml-api/payloads/my-operation/myoperation.txt`;

  private field1: string = '';
  private ownerCode: string = '';
  private countryCode: string = '';

  // ─── Field1 ──────────────────────────────────────────────────────────────

  withField1(value: string): this {
    this.field1 = value;
    return this;
  }

  // ─── Owner ───────────────────────────────────────────────────────────────

  withOwnerCode(code: string): this {
    this.ownerCode = code;
    return this;
  }

  // ─── POS Config ──────────────────────────────────────────────────────────

  withCountryCode(code: string): this {
    this.countryCode = code;
    return this;
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  build(): string {
    if (!this.field1) throw new Error('MyXmlPayloadBuilder: field1 is required');

    const replacements: Record<string, string> = {
      '$FIELD1': this.field1,
      '$OWNER_CODE': this.ownerCode,
      '$COUNTRY_CODE': this.countryCode,
    };

    const xmlPayload = this.xmlProcessor.replacePlaceholders(replacements, this.templatePath);
    logger.info(`My Operation XML payload built — field1: ${this.field1}`);
    return xmlPayload;
  }
}
```

### Step 2 — Create the API client

Create `xml-api/clients/my-xml-api-client.ts`:

```typescript
import { APIResponse } from '@playwright/test';
import { BaseXmlApiClient } from './base-xml-api-client';

export class MyXmlApiClient extends BaseXmlApiClient {
  async myOperation(
    endpoint: string,
    headers: Record<string, string>,
    xmlPayload: string
  ): Promise<APIResponse> {
    return this.post(
      'Send My Operation XML API Request and Log Request/Response',
      endpoint,
      headers,
      xmlPayload,
      'My Operation XML Request Payload',
      'My Operation XML Response Body'
    );
  }
}
```

### Step 3 — Create the response parser

Create `xml-api/response-parsers/my-xml-response-parser.ts`:

```typescript
import * as xpath from 'xpath';
import { DOMParser } from 'xmldom';
import { LoggerFactory } from '../../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

export class MyXmlResponseParser {

  getSomeValue(xmlString: string): string {
    const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
    if (!doc?.documentElement) throw new Error('MyXmlResponseParser: invalid XML document');

    const nodes = xpath.select(`//*[local-name()='SomeElement']/text()`, doc) as any[];
    if (!nodes || nodes.length === 0) throw new Error('MyXmlResponseParser: SomeElement not found');

    const value = nodes[0].nodeValue?.trim() ?? '';
    logger.info(`My Operation response — value: ${value}`);
    return value;
  }
}
```

### Step 4 — Write the test

Create `tests/xml-api-tests/mytest.spec.ts`:

```typescript
import { test } from '../../utilities/fixtures';
import { LoggerFactory } from '../../utilities/logger';
import { activateJwtToken } from '../../api-base/activatejwttoken';
import { ShopXmlPayloadBuilder } from '../../xml-api/builders/shop-xml-payload-builder';
import { MyXmlPayloadBuilder } from '../../xml-api/builders/my-xml-payload-builder';
import { ShopXmlApiClient } from '../../xml-api/clients/shop-xml-api-client';
import { MyXmlApiClient } from '../../xml-api/clients/my-xml-api-client';
import { ShopXmlResponseParser } from '../../xml-api/response-parsers/shop-xml-response-parser';
import { MyXmlResponseParser } from '../../xml-api/response-parsers/my-xml-response-parser';
import { APIResponse } from '@playwright/test';

const logger = LoggerFactory.getLogger(__filename);

test.describe.configure({ mode: 'parallel' });

test.describe('@allure.label.feature:XML-MY-FEATURE', () => {

  let headers: Record<string, string>;
  let rmxNdcXml: string;

  test.beforeEach(async ({ testInfo }) => {
    const token = new activateJwtToken();
    headers = await token.getJwtToken(testInfo);
    ({ rmxNdcXml } = await token.loadConfig());
  });

  test('TC1_Verify_My_Operation', async ({ testData, assert }) => {
    // ── Declare all variables at the top ─────────────────────────────────
    const paxType = testData.get('paxType')?.toString()!;
    const shopParser = new ShopXmlResponseParser();
    const myParser = new MyXmlResponseParser();
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;
    let shopResponse: APIResponse;
    let myResponse: APIResponse;
    let shopResponseText: string;
    let myResponseText: string;
    let result: string;

    logger.info('TC1_Verify_My_Operation — started');

    // Shop
    paxTypeMap = shopParser.getPaxType(paxType);
    const shopPayload = new ShopXmlPayloadBuilder()
      .withOrigin('SYD')
      .withDestination('MEL')
      .withDepartureDate('2026-06-20')
      .withPassengers(paxTypeMap)
      .withCurrency('AUD')
      .withAgentDuty('NDC')
      .withCityCode('DNN')
      .withCountryCode('AU')
      .withSellerOrgId('')
      .withCarrierOrgId('')
      .build();

    shopResponse = await new ShopXmlApiClient().shop(`${rmxNdcXml}/shop`, headers, shopPayload);
    await assert.toBe(shopResponse.status(), 200, 'Verify shop response status is 200');
    shopResponseText = await shopResponse.text();
    paxIdOffersItemIdsMap = shopParser.getPaxOfferItemIdsMap(paxTypeMap, shopResponseText);

    // My Operation
    const myPayload = new MyXmlPayloadBuilder()
      .withField1('someValue')
      .withOwnerCode('VA')
      .withCountryCode('AU')
      .build();

    myResponse = await new MyXmlApiClient().myOperation(`${rmxNdcXml}/my-endpoint`, headers, myPayload);
    await assert.toBe(myResponse.status(), 200, 'Verify my operation response status is 200');
    myResponseText = await myResponse.text();
    result = myParser.getSomeValue(myResponseText);
    await assert.notToBeNull(result, 'Verify result is not null');

    logger.info('TC1_Verify_My_Operation — completed');
  });
});
```

---

## Full Working Example — Shop → Price → Create Order

This is the exact pattern used in `tests/xml-api-tests/createordertest.spec.ts`:

```typescript
import { test } from '../../utilities/fixtures';
import { LoggerFactory } from '../../utilities/logger';
import { activateJwtToken } from '../../api-base/activatejwttoken';
import { ShopXmlPayloadBuilder } from '../../xml-api/builders/shop-xml-payload-builder';
import { PriceXmlPayloadBuilder } from '../../xml-api/builders/price-xml-payload-builder';
import { CreateOrderXmlPayloadBuilder } from '../../xml-api/builders/create-order-xml-payload-builder';
import { ShopXmlApiClient } from '../../xml-api/clients/shop-xml-api-client';
import { PriceXmlApiClient } from '../../xml-api/clients/price-xml-api-client';
import { CreateOrderXmlApiClient } from '../../xml-api/clients/create-order-xml-api-client';
import { ShopXmlResponseParser } from '../../xml-api/response-parsers/shop-xml-response-parser';
import { PriceXmlResponseParser } from '../../xml-api/response-parsers/price-xml-response-parser';
import { CreateOrderXmlResponseParser } from '../../xml-api/response-parsers/create-order-xml-response-parser';
import { APIResponse } from '@playwright/test';

const logger = LoggerFactory.getLogger(__filename);

test.describe.configure({ mode: 'parallel' });

test.describe('@allure.label.feature:XML-PaidOrder', () => {

  let headers: Record<string, string>;
  let rmxNdcXml: string;
  let omsNdcXml: string;

  test.beforeEach(async ({ testInfo }) => {
    const token = new activateJwtToken();
    headers = await token.getJwtToken(testInfo);
    ({ rmxNdcXml, omsNdcXml } = await token.loadConfig());
  });

  test('TC1_Verify_Create_Paid_Order', async ({ testData, assert }) => {
    // ── Declare all variables at the top ─────────────────────────────────
    const paxType = testData.get('paxType')?.toString()!;
    const shopParser = new ShopXmlResponseParser();
    const priceParser = new PriceXmlResponseParser();
    const createOrderParser = new CreateOrderXmlResponseParser();
    let paxTypeMap: Map<string, string>;
    let paxIdOffersItemIdsMap: Map<string, string>;
    let passengerDetailsMap: Map<string, Map<string, string>>;
    let offerId: string;
    let shopResponse: APIResponse;
    let priceResponse: APIResponse;
    let createOrderResponse: APIResponse;
    let shopResponseText: string;
    let priceResponseText: string;
    let createOrderResponseText: string;
    let warningMessage: string;
    let orderId: string | null;

    logger.info('TC1_Verify_Create_Paid_Order — started');

    // Shop
    paxTypeMap = shopParser.getPaxType(paxType);
    const shopPayload = new ShopXmlPayloadBuilder()
      .withOrigin('SYD')
      .withDestination('MEL')
      .withDepartureDate('2026-06-20')
      .withPassengers(paxTypeMap)
      .withCurrency('AUD')
      .withAgentDuty('NDC')
      .withCityCode('DNN')
      .withCountryCode('AU')
      .withSellerOrgId('')
      .withCarrierOrgId('')
      .build();

    shopResponse = await new ShopXmlApiClient().shop(`${rmxNdcXml}/shop`, headers, shopPayload);
    await assert.toBe(shopResponse.status(), 200, 'Verify shop response status is 200');
    shopResponseText = await shopResponse.text();
    paxIdOffersItemIdsMap = shopParser.getPaxOfferItemIdsMap(paxTypeMap, shopResponseText);

    // Price
    const pricePayload = new PriceXmlPayloadBuilder()
      .withPaxIdOffersItemIdsMap(paxIdOffersItemIdsMap)
      .withOwnerCode('VA')
      .withCurrency('AUD')
      .withLocationCode('SYD')
      .withCountryCode('AU')
      .withSellerOrgId('')
      .withCarrierOrgId('')
      .build();

    priceResponse = await new PriceXmlApiClient().price(`${rmxNdcXml}/price`, headers, pricePayload);
    await assert.toBe(priceResponse.status(), 200, 'Verify price response status is 200');
    priceResponseText = await priceResponse.text();
    passengerDetailsMap = priceParser.getPassengerDetailsMap(priceResponseText, paxTypeMap);
    offerId = priceParser.getOfferId(passengerDetailsMap);

    // Create Order
    const createOrderPayload = new CreateOrderXmlPayloadBuilder()
      .withPassengerDetailsMap(passengerDetailsMap)
      .withOfferId(offerId)
      .withOwnerCode('VA')
      .withCountryCode('AU')
      .build();

    createOrderResponse = await new CreateOrderXmlApiClient().createOrder(`${omsNdcXml}/v21_3/orders/create`, headers, createOrderPayload);
    await assert.toBe(createOrderResponse.status(), 200, 'Verify create order response status is 200');
    createOrderResponseText = await createOrderResponse.text();
    warningMessage = createOrderParser.getWarningMessage(createOrderResponseText);
    orderId = createOrderParser.getOrderId(createOrderResponseText);
    await assert.toBeEmpty(warningMessage, 'Verify Warning Message is Empty');
    await assert.notToBeNull(orderId, 'Verify Order Id is Not Null');

    logger.info('TC1_Verify_Create_Paid_Order — completed');
  });
});
```

---

## Template Placeholder Reference

### `shop.txt`

| Placeholder | Builder method | Notes |
|---|---|---|
| `$ARRIVAL` | `withOrigin(code)` | Maps to origin airport — legacy name, do not rename |
| `$DESTINATION` | `withDestination(code)` | Arrival airport |
| `$DATE` | `withDepartureDate(date)` | Format: `YYYY-MM-DD` |
| `$CURRENCY` | `withCurrency(currency)` | e.g. `'AUD'` |
| `$AGENT_DUTY` | `withAgentDuty(duty)` | e.g. `'NDC'` or `'STANDARD'` |
| `$CITY_CODE` | `withCityCode(code)` | IATA city code, e.g. `'DNN'` |
| `$COUNTRY_CODE` | `withCountryCode(code)` | e.g. `'AU'` |
| `$SELLER_ORGID` | `withSellerOrgId(id)` | Can be empty string |
| `$CARRIER_ORGID` | `withCarrierOrgId(id)` | Can be empty string |
| `#{@PAXLIST}` | auto-generated by `.build()` | Expands from `paxlist.txt` per PAX |

### `price.txt`

| Placeholder | Builder method | Notes |
|---|---|---|
| `$OFFERID` | auto from `paxIdOffersItemIdsMap` | Extracted from map key `'OfferId'` |
| `$OWNER_CODE` | `withOwnerCode(code)` | e.g. `'VA'` |
| `$CURRENCY` | `withCurrency(currency)` | e.g. `'AUD'` |
| `$LOCATION_CODE` | `withLocationCode(code)` | IATA location, e.g. `'SYD'` |
| `$COUNTRY_CODE` | `withCountryCode(code)` | e.g. `'AU'` |
| `$SELLER_ORGID` | `withSellerOrgId(id)` | Can be empty string |
| `$CARRIER_ORGID` | `withCarrierOrgId(id)` | Can be empty string |
| `#{@SELECTEDOFFERITEM}` | auto-generated by `.build()` | Expands from `selectedofferitem.txt` per PAX |

### `createorder.txt`

| Placeholder | Builder method | Notes |
|---|---|---|
| `$COUNTRY_CODE` | `withCountryCode(code)` | e.g. `'AU'` |
| `$TOTAL_AMOUNT` | auto-calculated by `.build()` | Sum of all PAX prices from `passengerDetailsMap` |
| `#{@PAX}` | auto-generated by `.build()` | Expands from `pax.txt` per PAX; Faker generates names/DOB/gender |
| `#{@OFFER_ASSOCIATION}` | auto-generated by `.build()` | Expands from `offerassociation.txt` per PAX |
| `#{@SELECTED_PRICED_OFFER}` | auto-generated by `.build()` | Expands from `selectedpricedoffer.txt` per PAX |

---

## Key Conventions

| Convention | Rule |
|---|---|
| Builder file header | JSDoc block with class description and usage example |
| Builder section dividers | `// ─── SectionName ───────────────────────────────────────────────────────────────` |
| Builder methods | Always return `this` for fluent chaining |
| Builder `.build()` | Always returns a `string` (XML); throws if required inputs missing; logs via `logger.info` |
| Client naming | `<operation>-xml-api-client.ts` |
| Client step name | `'Send <Operation> XML API Request and Log Request/Response'` |
| Client attachment names | `'<Operation> XML Request Payload'` and `'<Operation> XML Response Body'` |
| Parser naming | `<name>-xml-response-parser.ts`; methods named after the data returned |
| Parser XPath | Always use `local-name()` to handle namespace prefixes: `//*[local-name()='ElementName']` |
| Parser error handling | Throw descriptive `Error` if required field is missing — never return null for required data |
| `paxTypeMap` | Obtained **once** from `ShopXmlResponseParser.getPaxType()` and passed to all builders/parsers |
| `offerId` | Always use `priceParser.getOfferId(passengerDetailsMap)` — never `getOfferID(xmlString)` |
| Variable declaration | All `let`/`const` variables declared at the **top** of the test body before any logic |
| Status assertion | Assert `response.status() === 200` **immediately** after every API call |
| No inline logic in tests | Tests call parser/builder methods only — never write data extraction logic inline in a test |
| Logger | Declare `const logger = LoggerFactory.getLogger(__filename)` at the top of every file |
| Test entry/exit logging | `logger.info('TC1_... — started')` and `logger.info('TC1_... — completed')` |
| Assertions | Use `assert` fixture only — never raw `expect()` for business assertions |
| Parallelism | Add `test.describe.configure({ mode: 'parallel' })` at the top of every spec file |
| JWT + config | Load in `beforeEach` via `activateJwtToken` — never inline in test bodies |

---

## Common Mistakes to Avoid

| ❌ Wrong | ✅ Correct |
|---|---|
| `offerId = priceParser.getOfferID(priceResponseText)` | `offerId = priceParser.getOfferId(passengerDetailsMap)` |
| `Array.from(map.values())[0].get('key')` in test | Add a named method to the parser and call that |
| Declaring variables mid-test: `const x = parser.get(...)` after an API call | Declare `let x: string` at the top, then assign after the API call |
| `assert.toBe(response.ok(), true, ...)` | `assert.toBe(response.status(), 200, ...)` |
| Writing XML string manipulation directly in a test | Add a private method to the relevant builder |
| Skipping the `paxTypeMap` and passing `paxType` string directly to a builder | Always call `getPaxType()` first and pass the resulting `Map` |
| `for...of map.entries()` or `[...map.entries()]` | `Array.from(map.entries())` — required for TypeScript pre-ES2015 target |

---

## Adding a New Template

1. Create the `.txt` file in `xml-api/payloads/<operation>/` using `$PLACEHOLDER` tokens
2. Add a path constant to the builder: `private readonly myTemplatePath = \`${process.cwd()}/xml-api/payloads/<operation>/mytemplate.txt\``
3. Call `this.xmlProcessor.replacePlaceholders(replacements, this.myTemplatePath)` in `.build()`
4. For repeating blocks (one per PAX), use a `private build*Xml()` method that reads the template once with `readFileSync` and maps over the data using `Array.from()`

---

## TypeScript Compatibility Note

The project targets pre-ES2015. **Never use spread or `for...of` on `Map` iterators directly** — it causes `TS2802` errors.

```typescript
// ❌ Causes TS2802
for (const [key, value] of myMap.entries()) { ... }
const arr = [...myMap.entries()];

// ✅ Safe
for (const [key, value] of Array.from(myMap.entries())) { ... }
const arr = Array.from(myMap.entries());
```
