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

        let responseBody:any = await response.text();

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

}
