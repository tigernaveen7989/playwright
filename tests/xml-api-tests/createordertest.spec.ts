import { test, expect, request } from '../../utilities/fixtures';
import { activateJwtToken } from "../../api-base/activatejwttoken";
import { ShopApi } from '../../xml-api/request-and-get-response/shop-xml-request';
test.describe.configure({ mode: 'parallel' });

test.only(
    'TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order' +
    ' @allure.label.feature:JSON-SinglePax-PaidOrder', async ({ testData }, testInfo) => {

        const activatejwttoken = new activateJwtToken();
        const headers = await activatejwttoken.getJwtToken(testInfo);
        const { rmxNdcXml } = await activatejwttoken.loadConfig();
        const replacements: Record<string, string> = {
            '$DESTINATION': 'MEL',
            '$ARRIVAL': 'SYD',
            '$DATE': '2025-08-16',
            '$PAXID': 'PAX1',
            '$PAXTYPE': 'ADT',
            '$SELLER_ORGID': '',
            '$CARRIER_ORGID': '',
            '$AGENT_DUTY': 'NDC',
            '$CITY_CODE': 'DNN',
            '$COUNTRY_CODE': 'AU',
            '$CURRENCY': 'AUD'
        };

        const shop = new ShopApi(replacements);
        const response = await shop.sendRequestAndGetResponse(rmxNdcXml + "/shop",
            headers,
            testInfo
        );

        expect(response.ok()).toBe(true);
    });
