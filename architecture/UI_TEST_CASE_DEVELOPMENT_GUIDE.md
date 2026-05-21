# <span style="color:#6366F1">🖥️ Call Center UI — Automated Test Cases</span>

> **Framework:** Playwright + TypeScript  
> **Reporting:** Allure  
> **Application:** Sabre Wolverine Call Center (Airline Reservation System)  
> **Last Updated:** 2026-05-14

---

## <span style="color:#6366F1">📑 Table of Contents</span>

1. [Framework Overview](#framework-overview)
2. [Page Object Summary](#page-object-summary)
3. [Test Data Structure](#test-data-structure)
4. [Test Suite: Create Order](#test-suite-create-order)
5. [Test Suite: Seats](#test-suite-seats)
6. [Test Case Details](#test-case-details)
7. [Assertions Reference](#assertions-reference)
8. [Future Test Cases to Develop](#future-test-cases-to-develop)

---

## <span style="color:#3B82F6">🏗️ Framework Overview</span>

```
PlaywrightTypescript/
├── tests/
│   ├── basetest.ts                    # Base class with setup/teardown hooks
│   └── call-center-tests/
│       ├── createordertest.spec.ts    # Order creation test suite
│       └── seatstest.spec.ts          # Seat selection test suite
├── pageobjects/
│   ├── pageobjectmanager.ts           # Central POM factory
│   ├── loginpage.ts
│   ├── homepage.ts
│   ├── passengerdetailspage.ts
│   ├── addpaymenttonewreservationpage.ts
│   ├── paybycreditcardpage.ts
│   └── bookingconfirmationpage.ts
├── utilities/
│   └── blackpanther.ts                # Base utility class (click, fill, dates, pax parsing)
└── testdata/
    └── {env}/{subenv}/{tenant}/
        ├── url-and-accounts.json
        └── call-center-ui.json
```

**Execution flow per test:**
1. `BaseTest.setup()` — launches browser, creates context/page, loads config URL, navigates to Call Center
2. Test body — interacts through Page Objects via proxy-wrapped static references
3. `BaseTest.teardown()` — closes browser

**Parallel execution:** `test.describe.configure({ mode: 'parallel' })` is applied across both spec files.

---

## <span style="color:#06B6D4">📄 Page Object Summary</span>

| Page Object | File | Responsibilities |
|---|---|---|
| **LoginPage** | `loginpage.ts` | Click Login link → fill username → Next → fill password → Verify |
| **HomePage** | `homepage.ts` | Select trip type (OW/RT), city pairs, travel dates, passengers, shop, select offer brand, book |
| **PassengerDetailsPage** | `passengerdetailspage.ts` | Fill passenger info (auto-generated via Faker), handle multi-pax flow, Save, Yes/No popup |
| **AddPaymentToNewReservationPage** | `addpaymenttonewreservationpage.ts` | Select card type or Other payment type (cash etc.), fill payer address details, Continue |
| **PayByCreditCardPage** | `paybycreditcardpage.ts` | Enter card number, name, CVV, expiry date, Complete Payment |
| **BookingConfirmationPage** | `bookingconfirmationpage.ts` | Extract PNR & Order Number, verify itinerary (origin/dest, departure/arrival times), price/payment limit text |

---

## <span style="color:#06B6D4">🗃️ Test Data Structure</span>

Test data is resolved at runtime via environment variables:

```
ENVIRONMENT   = cert
SUBENVIRONMENT = ut1 | tc1
TENANT        = ju | va
```

**File:** `testdata/{env}/{subenv}/{tenant}/call-center-ui.json`

Each test case key maps to an array of parameter objects. A `global` key provides shared credentials when individual TCs don't override them.

### 🔑 Key Parameters

| Parameter | Description | Example |
|---|---|---|
| `userName` | Agent login email | `ut1agency2.admin1.ju.functional.e2e@sabre.com` |
| `password` | Agent login password | `Pa$$word@2k25` |
| `tripType` | `OW` (One-Way) or `RT` (Round-Trip) | `RT` |
| `origin` | IATA departure airport code | `DFW` |
| `destination` | IATA arrival airport code | `LAX` |
| `todayPlusDate` | Comma-separated day offsets from today | `7` (OW) or `7,14` (RT) |
| `paxType` | Passenger composition string | `1A`, `2A1C`, `1A1INF`, `1A1INS` |
| `cabinType` | Cabin class | `ECONOMY` |
| `brandType` | Offer brand name shown in the flight grid | `BASIC` |
| `cardType` | Credit card label in dropdown | `MasterCard`, `Visa` |
| `cardNumber` | Credit card number | `7563828462827483` |
| `cardName` | Name on card | `John Doe` |
| `cvv` | Card CVV | `123` |
| `expirationDate` | Card expiry MM/YY | `12/27` |
| `paymentType` | Other payment method | `CASH` |
| `seatType` | Map of pax to seat type | `{ "PAX1": "PAID" \| "FREE" }` |

---

## <span style="color:#F59E0B">🛋️ Test Suite: Create Order</span>

**File:** `tests/call-center-tests/createordertest.spec.ts`  
**Allure Feature Tag:** `@allure.label.feature:Call-Center-PaidOrder`  
**Suite Tag:** `@PaidOrder @WLV_CC_REGRESSION`

### 💳 TC1 — Create Paid Order (Credit Card)

| Field | Value |
|---|---|
| **Test ID** | TC1_Verify_Login_Into_Call_Center_And_Create_Paid_Order |
| **Priority** | P1 — Critical |
| **Type** | E2E |
| **Status** | `test.only` (currently isolated run) |

**Preconditions:**
- Valid agent credentials exist in test data
- Application URL is reachable (loaded from `url-and-accounts.json`)

**Test Data Required:**
`userName`, `password`, `tripType`, `origin`, `destination`, `todayPlusDate`, `paxType`, `cabinType`, `brandType`, `cardType`, `cardNumber`, `cardName`, `cvv`, `expirationDate`

**Steps:**

| # | Step | Page Object Method |
|---|---|---|
| 1 | Navigate to Call Center URL | `BaseTest.setup()` → `page.goto(ccUrl)` |
| 2 | Login with agent credentials | `loginPage.login(userName, password)` |
| 3 | Verify welcome message is displayed | `homePage.getWelcomeText()` |
| 4 | Click Reservations in navigation | `homePage.clickReservationsLink()` |
| 5 | Click New Reservation | `homePage.clickNewReservationLink()` |
| 6 | Select trip type (OW or RT) | `homePage.selectTripType(tripType)` |
| 7 | Enter origin and destination | `homePage.selectCityPair(tripType, origin, destination)` |
| 8 | Enter travel date(s) | `homePage.selectTravelDates(tripType, todayPlusDate)` |
| 9 | Enter passenger counts | `homePage.selectPassengers(paxType)` |
| 10 | Click Shop button | `homePage.clickOnShopButton()` |
| 11 | Select offer/brand radio button | `homePage.clickOnOfferRadioButton(brandType)` |
| 12 | Capture itinerary details for later validation | `homePage.getOriginAndDestinations()` / `getDepartureDateAndTimes()` / `getArrivalDateAndTimes()` |
| 13 | Click Book button | `homePage.clickOnBookButton()` |
| 14 | Dismiss GDPR/cookie agreement if shown | `homePage.clickOnAgreeButton()` |
| 15 | Enter all passenger details (auto-generated) | `passengerDetailsPage.enterPassengerDetails(paxType)` |
| 16 | Save passenger details | `passengerDetailsPage.clickOnSaveButton()` |
| 17 | Confirm proceed to payment (Yes) | `passengerDetailsPage.clickOnYesButton()` |
| 18 | Fill payer address details | `addPaymentToNewReservationPage.fillPayerDetails()` |
| 19 | Select credit card type | `addPaymentToNewReservationPage.selectCardType(cardType)` |
| 20 | Click Continue on payment selection | `addPaymentToNewReservationPage.clickOnContinueButton()` |
| 21 | Enter credit card details | `payByCreditCardPage.enterCardDetails(cardNumber, cardName, cvv, expirationDate)` |
| 22 | Complete payment | `payByCreditCardPage.clickOnCompletePaymentButton()` |
| 23 | Extract PNR and Order Number | `bookingConfirmationPage.getPNRAndOrderNumber()` |

**Assertions:**

| # | Assertion | Expected |
|---|---|---|
| A1 | Welcome text starts with | `"Welcome, "` |
| A2 | PNR Number is not null | PNR is generated |
| A3 | Order Number is not null | Order is created |
| A4 | Origin & Destinations match selected itinerary | Strict equality |
| A5 | Departure dates/times match selected itinerary | Strict equality |
| A6 | Arrival dates/times match selected itinerary | Strict equality |

---

### 💵 TC2 — Create Paid Order (Cash Payment)

| Field | Value |
|---|---|
| **Test ID** | TC2_Verify_Login_Into_Call_Center_And_Create_Paid_Order_Using_Cash |
| **Priority** | P1 — Critical |
| **Type** | E2E |

**Test Data Required:**
`userName`, `password`, `tripType`, `origin`, `destination`, `todayPlusDate`, `paxType`, `cabinType`, `brandType`, `paymentType`

**Steps:**

Steps 1–14 are identical to TC1. Diverges at payment:

| # | Step | Page Object Method |
|---|---|---|
| 15 | Enter all passenger details | `passengerDetailsPage.enterPassengerDetails(paxType)` |
| 16 | Save passenger details | `passengerDetailsPage.clickOnSaveButton()` |
| 17 | Confirm proceed to payment (Yes) | `passengerDetailsPage.clickOnYesButton()` |
| 18 | Click "Other" payment tab | `addPaymentToNewReservationPage.selectPaymentType(paymentType)` (clicks Other tab internally) |
| 19 | Select payment type (e.g., CASH) | (handled inside `selectPaymentType`) |
| 20 | Click Continue | `addPaymentToNewReservationPage.clickOnContinueButton()` |
| 21 | Extract PNR and Order Number | `bookingConfirmationPage.getPNRAndOrderNumber()` |

**Assertions:** Same as TC1 (A1–A6).

---

### 👥 TC3 — Multi-Pax One-Way Unpaid Order

| Field | Value |
|---|---|
| **Test ID** | TC3_Verify_Multipax_OW_And_Create_Unpaid_Order |
| **Priority** | P2 — High |
| **Type** | E2E |

**Test Data Required:**
`userName`, `password`, `tripType` (OW), `origin`, `destination`, `todayPlusDate`, `paxType` (multi-pax, e.g., `2A1C`), `cabinType`, `brandType`

**Steps:**

Steps 1–14 identical to TC1. Diverges after passenger details:

| # | Step | Page Object Method |
|---|---|---|
| 15 | Enter passenger details for all pax | `passengerDetailsPage.enterPassengerDetails(paxType)` |
| 16 | Save passenger details | `passengerDetailsPage.clickOnSaveButton()` |
| 17 | Decline payment now (No — unpaid flow) | `passengerDetailsPage.clickOnNoButton()` |
| 18 | Extract PNR and Order Number | `bookingConfirmationPage.getPNRAndOrderNumber()` |

**Assertions:**

| # | Assertion | Expected |
|---|---|---|
| A1–A6 | Same as TC1 | — |
| A7 | Price Guarantee Time Limit text visible | Contains `"Price Guarantee Time Limit"` |
| A8 | Payment Time Limit text visible | Contains `"Payment Time Limit"` |

> **Note:** TC3 contains `assert.toBe(orderNumber, "ABCD1234")` — this is a placeholder assertion and should be updated with a dynamic expected value.

---

## <span style="color:#8B5CF6">💺 Test Suite: Seats</span>

**File:** `tests/call-center-tests/seatstest.spec.ts`  
**Allure Feature Tags:** `@allure.label.feature:Call-Center-Paid-Seats` / `@allure.label.feature:Call-Center-Free-Seats`

> **Current Status:** Seat test cases are partially implemented. Steps are scaffolded but seat selection page object is not yet built.

---

### 💺 TC1 — Create Paid Order + Add Paid Seat

| Field | Value |
|---|---|
| **Test ID** | TC1_Verify_Login_Into_Call_Center_And_Create_Paid_Order_And_Add_Paid_Seats |
| **Priority** | P2 — High |
| **Type** | E2E |
| **Status** | Skeleton — needs implementation |

**Test Data Required:**
`userName`, `password`, `seatType` (e.g., `{ "PAX1": "PAID" }`)

**Steps to Develop:**

| # | Step | Notes |
|---|---|---|
| 1–22 | Full paid order flow (same as TC1 in Create Order suite) | Reuse existing steps |
| 23 | Navigate to seat map page | New page object required |
| 24 | Select a paid seat for each passenger | Use `seatType` map to drive selection |
| 25 | Confirm seat selection | — |
| 26 | Verify seat charge added to order | Validate on confirmation page |

**Assertions to Add:**

| # | Assertion | Expected |
|---|---|---|
| A1 | Seat type matches selected type | `PAID` |
| A2 | Seat charge appears in order total | Not null / greater than 0 |
| A3 | Seat assignment visible on confirmation | Seat number/row not empty |

---

### 🄓 TC2 — Create Unpaid Order + Add Free Seat

| Field | Value |
|---|---|
| **Test ID** | TC2_Verify_Login_Into_Call_Center_And_Create_Unpaid_Order_And_Add_Free_Seat |
| **Priority** | P2 — High |
| **Type** | E2E |
| **Status** | Skeleton — partially implemented (only validates tenant env var) |

**Test Data Required:**
`userName`, `password`, `seatType` (e.g., `{ "PAX1": "FREE" }`)

**Steps to Develop:**

| # | Step | Notes |
|---|---|---|
| 1–17 | Full unpaid order flow (same as TC3 in Create Order suite) | Reuse existing steps |
| 18 | Navigate to seat map page | New page object required |
| 19 | Select a free seat for each passenger | Filter by `FREE` in `seatType` map |
| 20 | Confirm seat selection | — |
| 21 | Verify no additional seat charge | Total unchanged |

**Assertions to Add:**

| # | Assertion | Expected |
|---|---|---|
| A1 | Seat assigned at no extra cost | Seat charge = `$0.00` or absent |
| A2 | Seat assignment visible on confirmation | Seat number/row not empty |

---

### 🎫 TC3 — Create Paid Order + Add Free Seat

| Field | Value |
|---|---|
| **Test ID** | TC3_Verify_Login_Into_Call_Center_And_Create_Paid_Order_And_Add_Free_Seat |
| **Priority** | P3 — Medium |
| **Type** | E2E |
| **Status** | Skeleton — needs implementation |

**Test Data Required:**
`userName`, `password`, `seatType` (e.g., `{ "PAX1": "FREE" }`)

**Steps to Develop:**

| # | Step | Notes |
|---|---|---|
| 1–22 | Full paid order flow (same as TC1 in Create Order suite) | Reuse existing steps |
| 23 | Navigate to seat map page | New page object required |
| 24 | Select a free seat for paid booking | — |
| 25 | Confirm seat selection | — |
| 26 | Verify order total unchanged (no seat surcharge) | — |

---

## <span style="color:#D97706">📋 Test Case Details</span>

### 👤 Passenger Type Parser (`paxType` string)

The `paxType` string is parsed in `BlackPanther.getPaxType()`:

| Pattern | Meaning | Maps To |
|---|---|---|
| `1A` | 1 Adult | `ADT` |
| `2C` | 2 Children | `CNN` |
| `1INF` | 1 Infant (lap) | `INF` |
| `1INS` | 1 Infant with seat | `INF` |

**Examples:**
- `1A` → 1 adult
- `2A1C` → 2 adults, 1 child
- `1A1INF` → 1 adult, 1 lap infant
- `2A1C1INS` → 2 adults, 1 child, 1 infant with seat

### 📅 Date Offset Logic

`todayPlusDate` is a comma-separated offset from today's date (midnight-normalized):

- **OW:** Single value → `"7"` means departure = today + 7 days
- **RT:** Two values → `"7,14"` means depart today+7, return today+14

Formatted as `MM/DD/YYYY` for the UI date inputs.

### 🗺️ Trip Type Routing (Homepage)

| `tripType` | Radio Button | From/To Locators | Date Inputs |
|---|---|---|---|
| `RT` | Round-Trip | `.first()` | `rtDepartureDateEditbox` + `arrivalDateEditbox` |
| `OW` | One-Way | `.last()` | `owDepartureDateEditbox` only |

---

## <span style="color:#22C55E">✅ Assertions Reference</span>

Custom `assert` fixture wraps Playwright's `expect`:

| Method | Usage |
|---|---|
| `assert.toEqual(expected, actual, message)` | Loose equality (e.g., welcome text) |
| `assert.toStrictEqual(expected, actual, message)` | Deep strict equality (arrays) |
| `assert.notToBeNull(value, message)` | Value is not null/undefined |
| `assert.toBe(actual, expected, message)` | `===` equality |
| `assert.toContain(actual, substring, message)` | String contains substring |

---

## <span style="color:#EC4899">🔮 Future Test Cases to Develop</span>

The following test cases are identified as gaps based on the current page objects and test data structure:

| TC ID | Description | Priority | Suite |
|---|---|---|---|
| TC_Login_InvalidCredentials | Verify login fails with wrong password | P1 | Login |
| TC_Login_EmptyFields | Verify validation messages when fields are empty | P2 | Login |
| TC_RT_Booking_CreditCard | Round-trip booking with credit card payment | P1 | Create Order |
| TC_OW_Booking_MultiPax_CreditCard | One-way multi-pax (ADT+CNN+INF) with credit card | P1 | Create Order |
| TC_OW_Booking_INS | One-way booking with infant-in-seat (INS) passenger | P2 | Create Order |
| TC_RT_Booking_Cash | Round-trip booking with cash payment | P2 | Create Order |
| TC_Flight_ListValidation_OW | Verify flight list details (O&D, times) in shop results | P2 | Create Order |
| TC_Flight_ListValidation_RT | Verify round-trip flight list details | P2 | Create Order |
| TC_Seat_PaidOrder_MultiplePax | Add paid seats for all pax on a multi-pax order | P2 | Seats |
| TC_Seat_UpgradeFromFreeToCharged | Select free seat then change to charged seat | P3 | Seats |
| TC_BookingConf_PriceBreakdown | Validate price breakdown on confirmation page | P2 | Booking Confirmation |
| TC_BookingConf_PassengerDetails | Validate passenger names/DOB on confirmation page | P2 | Booking Confirmation |
| TC_Session_Timeout | Verify session expiry and redirect to login | P3 | Login |
| TC_GDPR_Agreement_Dismissed | Verify flow continues when GDPR modal is absent | P3 | Home |

---

## <span style="color:#64748B">🌐 Environment Matrix</span>

| Environment | Sub-Env | Tenant | Notes |
|---|---|---|---|
| `cert` | `ut1` | `ju` | Primary test environment (JU tenant) |
| `cert` | `ut1` | `va` | VA tenant — used in seat tests |
| `cert` | `tc1` | *(tbd)* | TC1 sub-environment |

Call Center URLs follow the pattern:  
`https://callcenter-{subenv}-{tenant}.sm.dev.sabre-gcp.com/Login`
