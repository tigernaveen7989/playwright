import { test, expect, request } from '../../utilities/fixtures';
import { activateJwtToken } from "../../api-base/activatejwttoken";
import { ShopApi } from '../../xml-api/request-and-get-response/shop-xml-request';
test.describe.configure({ mode: 'parallel' });
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

test(
    'TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order' +
    ' @allure.label.feature:XML-SinglePax-PaidOrder', async ({ testData }, testInfo) => {
        const paxType = testData.get('paxType')?.toString()!;
        let paxTypeMap: Map<string, string>;
        let paxIdOffersItemIdsMap: Map<string, string>;

        const activatejwttoken = new activateJwtToken();
        const headers = await activatejwttoken.getJwtToken(testInfo);
        const { rmxNdcXml } = await activatejwttoken.loadConfig();
        const replacements: Record<string, string> = {
            '$DESTINATION': 'MEL',
            '$ARRIVAL': 'SYD',
            '$DATE': '2025-10-16',
            '$SELLER_ORGID': '',
            '$CARRIER_ORGID': '',
            '$AGENT_DUTY': 'NDC',
            '$CITY_CODE': 'DNN',
            '$COUNTRY_CODE': 'AU',
            '$CURRENCY': 'AUD'
        };

        const shop = new ShopApi();
        paxTypeMap = await shop.getPaxType(paxType);
        logger.info('pax map is', JSON.stringify(Object.fromEntries(paxTypeMap), null, 2));
        const response = await shop.sendRequestAndGetResponse(rmxNdcXml + "/shop",
            headers,
            testInfo,
            replacements,
            paxTypeMap
        );

        expect(response.ok()).toBe(true);
        paxIdOffersItemIdsMap = await shop.getPaxOfferItemIdsMap(paxTypeMap, await response.text());
        logger.info('paxid offers items ids map ', JSON.stringify(Object.fromEntries(paxIdOffersItemIdsMap), null, 2));
    });


test(
    'TC2_Verify_Add_One_Way_Multi_Pax_Create_Paid_Order' +
    ' @allure.label.feature:XML-Multipax-PaidOrder', async ({ testData }, testInfo) => {
        const paxType = testData.get('paxType')?.toString()!;
        let paxTypeMap: Map<string, string>;
        let paxIdOffersItemIdsMap: Map<string, string>;

        const activatejwttoken = new activateJwtToken();
        const headers = await activatejwttoken.getJwtToken(testInfo);
        const { rmxNdcXml } = await activatejwttoken.loadConfig();
        const replacements: Record<string, string> = {
            '$DESTINATION': 'MEL',
            '$ARRIVAL': 'SYD',
            '$DATE': '2025-10-16',
            '$SELLER_ORGID': '',
            '$CARRIER_ORGID': '',
            '$AGENT_DUTY': 'NDC',
            '$CITY_CODE': 'DNN',
            '$COUNTRY_CODE': 'AU',
            '$CURRENCY': 'AUD'
        };

        const shop = new ShopApi();
        paxTypeMap = await shop.getPaxType(paxType);
        logger.info('pax map is', JSON.stringify(Object.fromEntries(paxTypeMap), null, 2));
        const response = await shop.sendRequestAndGetResponse(rmxNdcXml + "/shop",
            headers,
            testInfo,
            replacements,
            paxTypeMap
        );

        expect(response.ok()).toBe(true);

        paxIdOffersItemIdsMap = await shop.getPaxOfferItemIdsMap(paxTypeMap, await response.text());
        logger.info('paxid offers items ids map ', JSON.stringify(Object.fromEntries(paxIdOffersItemIdsMap), null, 2));
    });
