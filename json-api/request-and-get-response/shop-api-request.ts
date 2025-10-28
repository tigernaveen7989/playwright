import { ShopJsonObject } from '../create-payload/shop-json-object';
import { request, TestInfo } from '@playwright/test';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);
import {
  attachment,
  step
} from 'allure-js-commons';


export class shopApi {
  private shopRequest: ShopJsonObject;

  constructor(
    origin: string,
    destination: string,
    day: number,
    month: number,
    year: number,
    currency: string = 'EUR'
  ) {
    this.shopRequest = new ShopJsonObject(origin, destination, day, month, year, currency);
  }


  /***
   * 
   */
  public async sendRequestAndGetResponse(
    endpoint: string,
    headers: Record<string, string>,
    testInfo: TestInfo,
    paxtype: string
  ): Promise<any> {
    return await step('Send Shop API Request and Log Request/Response', async () => {
      try {
        const payload = JSON.parse(this.shopRequest.getShopPayload(paxtype));

        // Attach request payload
        await attachment('Shop Request Payload', JSON.stringify(payload, null, 2), {
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

        const responseBody = await response.text();

        // Attach response body
        await attachment('Shop Response Body', JSON.stringify(responseBody, null, 2), {
          contentType: 'application/json'
        });

        return response;
      } catch (error) {
        let message = 'Unknown error';

        if (error instanceof Error) {
          message = error.message;
        }

        await attachment('Shop API Error', JSON.stringify({ message }), {
          contentType: 'application/json'
        });

        throw error;
      }

    });
  }

  public getPaxOfferItemIdsMap(
    paxMap: Map<string, string>,
    responseBody: string
  ): Map<string, string> {
    const paxIdOfferItemIdsMap = new Map<string, string>();
    const assignedOfferItemIds = new Set<string>();

    // Parse the JSON string
    let offerResponse: {
      offers: Array<{
        definition: { id: string };
        offerItems: Array<{
          id: string;
          services: Array<{ passengerIds: string[] }>;
        }>;
      }>;
    };

    try {
      offerResponse = JSON.parse(responseBody);
    } catch (e) {
      throw new Error("Invalid JSON string passed as responseBody");
    }

    for (const offer of offerResponse.offers) {
      const offerId = offer.definition.id;

      const allOfferItems = offer.offerItems;

      for (const [paxId] of paxMap) {
        const offerItem = allOfferItems.find(oi => {
          const allPassengerIds = oi.services.flatMap(service => service.passengerIds);
          return allPassengerIds.includes(paxId) && !assignedOfferItemIds.has(oi.id);
        });

        if (offerItem) {
          paxIdOfferItemIdsMap.set(paxId, offerItem.id);
          assignedOfferItemIds.add(offerItem.id);
        }
      }

      // Add the offerId once after processing all paxIds
      paxIdOfferItemIdsMap.set("OfferId", offerId);
    }

    return paxIdOfferItemIdsMap;
  }



  getPaxType(paxType: string): Map<string, string> {
    const paxMap = new Map<string, string>();
    let paxIndex = 1;

    // Match all occurrences of number + type (A, C, I, INS)
    const regex = /(\d+)(INS|A|C|I)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(paxType)) !== null) {
      const count = parseInt(match[1], 10);
      const typeCode = match[2];

      let paxTypeLabel: string;
      switch (typeCode) {
        case "A":
          paxTypeLabel = "ADT";
          break;
        case "C":
          paxTypeLabel = "CNN";
          break;
        case "I":
          paxTypeLabel = "INF";
          break;
        case "INS":
          paxTypeLabel = "INS";
          break;
        default:
          throw new Error(`Unknown pax type: ${typeCode}`);
      }

      for (let i = 0; i < count; i++) {
        paxMap.set(`PAX${paxIndex++}`, paxTypeLabel);
      }
    }

    if (paxMap.size === 0) {
      throw new Error("Invalid paxType format.");
    }

    return paxMap;
  }
}
