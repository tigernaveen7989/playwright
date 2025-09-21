import { test, expect } from '../../utilities/fixtures';
import { activateJwtToken } from "../../api-base/activatejwttoken";
import { ShopApi } from '../../xml-api/request-and-get-response/shop-xml-request';
import { LoggerFactory } from '../../utilities/logger';
import { PriceApi } from '../../xml-api/request-and-get-response/price-xml-request';
import { attachment, step } from 'allure-js-commons';

test.describe.configure({ mode: 'parallel' });

const logger = LoggerFactory.getLogger(__filename);

test.describe('Paid Order Tests'+
  '@allure.label.feature:XML-Multipax-PaidOrder+Seats', () => {
  let activateToken: activateJwtToken;
  let shop: ShopApi;
  let price: PriceApi;
  let headers: any;
  let rmxNdcXml: string;
  let replacements: Record<string, string>;
  let paxTypeMap: Map<string, string>;
  let paxIdOffersItemIdsMap: Map<string, string>;
  let shopResponse: Response;


  test.beforeEach(async ({ testData }, testInfo) => {
    testInfo.annotations.push({ type: 'feature', description: 'XML-Multipax-PaidOrder' });
    await step('Initialize APIs and load config', async () => {
      activateToken = new activateJwtToken();
      shop = new ShopApi();
      price = new PriceApi();
      headers = await activateToken.getJwtToken(testInfo);
      ({ rmxNdcXml } = await activateToken.loadConfig());
    });

    await step('Prepare replacements and get paxTypeMap', async () => {
      replacements = {
        '$DESTINATION': 'MEL',
        '$ARRIVAL': 'SYD',
        '$DATE': '2025-10-16',
        '$SELLER_ORGID': '',
        '$CARRIER_ORGID': '',
        '$AGENT_DUTY': 'NDC',
        '$CITY_CODE': 'DNN',
        '$COUNTRY_CODE': 'AU',
        '$CURRENCY': 'AUD',
        '$LOCATION_CODE': 'SYD',
        '$OWNER_CODE': 'VA'
      };

      const paxType = testData.get('paxType')?.toString()!;
      paxTypeMap = await shop.getPaxType(paxType);
      logger.info('Pax Type Map: ' + JSON.stringify(Object.fromEntries(paxTypeMap), null, 2));
    });

    await step('Send Shop Request and parse response', async () => {
      const shopResponse = await shop.sendRequestAndGetResponse(
        rmxNdcXml + "/shop",
        headers,
        testInfo,
        replacements,
        paxTypeMap
      );

      expect(shopResponse.ok()).toBe(true);
      logger.info('Shop request successful');

      paxIdOffersItemIdsMap = await shop.getPaxOfferItemIdsMap(
        paxTypeMap,
        await shopResponse.text()
      );

      logger.info('Pax ID → Offer Item ID Map: ' +
        JSON.stringify(Object.fromEntries(paxIdOffersItemIdsMap), null, 2));
    });
  });


  test(
    'TC1_Verify_Add_One_Way_Single_Pax_One_Way_Create_Paid_Order',
    async ({ }, testInfo) => {
      const priceResponse = await price.sendRequestAndGetResponse(
        rmxNdcXml + "/price",
        headers,
        testInfo,
        replacements,
        paxIdOffersItemIdsMap
      );

      expect(priceResponse.ok()).toBe(true);
      logger.info('Price request successful');

      const passengerDetailsMap = await price.getPassengerDetailsMap(await priceResponse.text(), paxTypeMap);
      const offerId = await price.getOfferID(await priceResponse.text());
      logger.info('offer id ', offerId);
    }
  );

  test(
    'TC2_Verify_Add_One_Way_Multi_Pax_Create_Paid_Order',
    async ({ }, testInfo) => {
      const priceResponse = await price.sendRequestAndGetResponse(
        rmxNdcXml + "/price",
        headers,
        testInfo,
        replacements,
        paxIdOffersItemIdsMap
      );

      expect(priceResponse.ok()).toBe(true);
      logger.info('Price request successful');

      const passengerDetailsMap = await price.getPassengerDetailsMap(await priceResponse.text(), paxTypeMap);
      const offerId = await price.getOfferID(await priceResponse.text());
      logger.info('offer id ', offerId);
    }
  );
});
