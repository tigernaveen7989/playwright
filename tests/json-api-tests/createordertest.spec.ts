import { test, expect, request } from '../../utilities/fixtures';
import { activateJwtToken } from "../../api-base/create-jwt-token";
import { shop } from '../../json-api/request-and-get-response/shop-api-request';
test.describe.configure({ mode: 'parallel' });
let payload = {
    request: {
        origin_destinations_criteria: [
            {
                origin_departure_criteria: {
                    date: { month: 8, year: 2025, day: 7 },
                    airportCode: 'MEL'
                },
                destination_arrival_criteria: {
                    airportCode: 'SYD'
                }
            },
            {
                origin_departure_criteria: {
                    date: { month: 8, year: 2025, day: 14 },
                    airportCode: 'SYD'
                },
                destination_arrival_criteria: {
                    airportCode: 'MEL'
                }
            }
        ],
        passengers: [
            { passenger_type_code: 'ADT', id: 'PAX1' },
            { passenger_type_code: 'ADT', id: 'PAX2' },
            { passenger_type_code: 'CNN', id: 'PAX3' }
        ],
        requestType: 'ADVCAL30',
        offer_criteria: {
            program: {
                programAccountIds: []
            }
        },
        currency: 'AUD'
    },
    sender: {
        enabled_system: { name: 'POS' },
        marketing_carrier: { airline_designator_code: 'JU' }
    },
    point_of_sale: {
        country: { code: 'CA' },
        city: { code: 'ORD' },
        channel: 'STANDARD'
    }
};


test('API test with JWT', async ({ request }, testInfo) => {
    const headers = await activateJwtToken(testInfo);

    const response = await request.get('https://your-api-endpoint.com', {
        headers,
    });

    expect(response.ok()).toBeTruthy();
});

test.only(
    'TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order' +
    ' @allure.label.feature:JSON-SinglePax-PaidOrder', async ({ testData }, testInfo) => {
        const userName: String = testData.get('userName')?.toString();
        const password: String = testData.get('password')?.toString();
        const seatType: String = testData.get('seatType')?.toString();

        const headers = await activateJwtToken(testInfo);
        console.log("header is ", headers);
        const apiContext = await request.newContext();
        const response = await apiContext.post(
            'https://wolverine-retailing-mixer-wl-ut1-rmx-va.apps.cert-02.us-east4.cert.sabre-gcp.com/shop',
            {
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(payload)
            }
        );

        const responseBody = JSON.stringify(JSON.parse(await response.text()), null, 2)

        console.log(JSON.stringify(JSON.parse(responseBody), null, 2));

        expect(response.ok()).toBeTruthy();

    }
);


test('shop class should send request and return mocked response', async ({ request, testData }, testInfo) => {

    const headers = await activateJwtToken(testInfo);
    // Create a mock response body
    const mockResponseBody = {
        success: true,
        message: 'Mocked response received'
    };

    // Create a proper Response object using Blob
    const mockResponse = new Response(JSON.stringify(mockResponseBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

    // Assign the mock to global.fetch
    global.fetch = async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
        return mockResponse;
    };
    console.log("header is ", headers);

    const requester = new shop(
        'SYD', 'BNE', 10, 8, 2025,
        'https://wolverine-retailing-mixer-wl-ut1-rmx-va.apps.cert-02.us-east4.cert.sabre-gcp.com/shop',
        headers,
        'EUR'
    );
    console.log("========================================");
    console.log(requester);

    const response = await requester.execute();
    console.log("========================================");
    console.log("response is");

    console.log('Response from shop.execute():', response);

    console.log("========================================");

    expect(response.success).toBe(true);
    expect(response.message).toBe('Mocked response received');
});
