import { PriceJsonObject } from '../create-payload/price-json-object';
import { request, TestInfo } from '@playwright/test';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);
import {
  attachment,
  step
} from 'allure-js-commons';


export class priceApi {
  private priceRequest: PriceJsonObject;

  constructor() {
    this.priceRequest = new PriceJsonObject();
  }


  /***
   * 
   */
  public async sendRequestAndGetResponse(
    endpoint: string,
    headers: Record<string, string>,
    testInfo: TestInfo,
    paxIdOffersItemIdsMap: Map<string, string>
  ): Promise<any> {
    return await step('Send Price API Request and Log Request/Response', async () => {
      try {
        const payload = JSON.parse(this.priceRequest.getPricePayload(paxIdOffersItemIdsMap));

        // Attach request payload
        await attachment('Price Request Payload', JSON.stringify(payload, null, 2), {
          contentType: 'application/json'
        });

        const apiContext = await request.newContext();
        const response = await apiContext.post(endpoint, {
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          data: JSON.stringify(payload)
        });

        let responseBody: any = await response.text();

        // Attach response body
        await attachment('Price Response Body', JSON.stringify(await response.json(), null, 2), {
          contentType: 'application/json'
        });

        return response;
      } catch (error) {
        await attachment('Price API Error', JSON.stringify({ message: error.message }), {
          contentType: 'application/json'
        });
        throw error;
      }
    });
  }

  public getPassengerDetailsMap(
    responseJson: any,
    passengerTypeMap: Map<string, string>
  ): Map<string, Map<string, string>> {
    const result = new Map<string, Map<string, string>>();

    const offerItems = responseJson?.pricedOffer?.offerItems ?? [];

    for (const offerItem of offerItems) {
      const offerItemId = offerItem.id;
      const price = offerItem.price?.totalAmount?.amount || "";
      const services = offerItem.services ?? [];

      for (const service of services) {
        const paxIds = service.passengerIds ?? [];
        const journeyIds = service.offerServiceAssociation?.journey?.passengerJourneyIds ?? [];

        for (const paxId of paxIds) {
          if (!passengerTypeMap.has(paxId)) continue;

          const infoMap = result.get(paxId) ?? new Map<string, string>();

          if (!infoMap.has("offerItemId")) {
            infoMap.set("offerItemId", offerItemId);
          }

          if (!infoMap.has("price")) {
            infoMap.set("price", price);
          }

          if (journeyIds.length > 0 && !infoMap.has("passengerJourneyIds")) {
            infoMap.set("passengerJourneyIds", journeyIds.join(","));
          }
          result.set(paxId, infoMap);
        }
      }
    }
    logger.info('Passenger details map: ' ,JSON.stringify(Object.fromEntries([...result].map(([k, v]) => [k, Object.fromEntries(v)])), null, 2));
    return result;
  }

}
