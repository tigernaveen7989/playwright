import { ShopJsonObject } from '../create-payload/shop-json-object';
import { request, TestInfo } from '@playwright/test';
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

  
public async sendRequestAndGetResponse(
    endpoint: string,
    headers: Record<string, string>,
    testInfo: TestInfo
  ): Promise<any> {
    return await step('Send Shop API Request and Log Request/Response', async () => {
      try {
        const payload = JSON.parse(this.shopRequest.getShopPayload());

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
        await attachment('Shop Response Body', responseBody, {
          contentType: 'application/json'
        });

        return response;
      } catch (error) {
        await attachment('Shop API Error', JSON.stringify({ message: error.message }), {
          contentType: 'application/json'
        });
        throw error;
      }
    });
  }

}
