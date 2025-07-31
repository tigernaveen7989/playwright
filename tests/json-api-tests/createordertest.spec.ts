import { test, expect, request } from '../../utilities/fixtures';
import { activateJwtToken } from "../../api-base/create-jwt-token";
import { shopApi } from '../../json-api/request-and-get-response/shop-api-request';
import { ShopJsonObject } from '../../json-api/create-payload/shop-json-object';
test.describe.configure({ mode: 'parallel' });


test('API test with JWT', async ({ request }, testInfo) => {
    const headers = await activateJwtToken(testInfo);

    const response = await request.get('https://your-api-endpoint.com', {
        headers,
    });

    expect(response.ok()).toBeTruthy();
});

test(
    'TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order' +
    ' @allure.label.feature:JSON-SinglePax-PaidOrder', async ({ testData }, testInfo) => {
        const userName: String = testData.get('userName')?.toString();
        const password: String = testData.get('password')?.toString();
        const seatType: String = testData.get('seatType')?.toString();

        const headers = await activateJwtToken(testInfo);
        console.log("header is ", headers);
        const apiContext = await request.newContext();
        const shopJsonObject = new ShopJsonObject("SYD", "BNE", 10, 8, 2025, "EUR");
        const payload = await JSON.parse(shopJsonObject.getShopPayload());
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

        const responseBody = JSON.stringify(JSON.parse(await response.text()), null, 2);

        console.log(JSON.stringify(JSON.parse(responseBody), null, 2));

        expect(response.ok()).toBeTruthy();

    }
);


test.only('shop class should send request and return mocked response', async ({ testData }, testInfo) => {

    //const headers = await activateJwtToken(testInfo);

    const shop = new shopApi('SYD', 'BNE', 10, 8, 2025, 'EUR');

    const response = await shop.sendRequestAndGetResponse("https://wolverine-retailing-mixer-wl-ut1-rmx-va.apps.cert-02.us-east4.cert.sabre-gcp.com/shop",
        testInfo
    );

    const responseBody = JSON.stringify(JSON.parse(await response.text()), null, 2);

    //console.log(JSON.stringify(JSON.parse(responseBody), null, 2));
    expect(response.ok()).toBe(true);
});
