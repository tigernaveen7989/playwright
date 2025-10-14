import { CreateOrderJsonObject } from '../create-payload/create-order-json-object';
import { request, TestInfo } from '@playwright/test';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);
import {
  attachment,
  step
} from 'allure-js-commons';


export class createOrderApi {
  private readonly createOrderRequest: CreateOrderJsonObject;

  constructor() {
    this.createOrderRequest = new CreateOrderJsonObject();
  }


  /***
   * 
   */
  public async sendRequestAndGetResponse(
    endpoint: string,
    headers: Record<string, string>,
    testInfo: TestInfo,
    passengerDetailsMap: Map<string, Map<string, string>>,
    offerId: string
  ): Promise<any> {
    return await step('Send Create Order API Request and Log Request/Response', async () => {
      try {
        const payload = JSON.parse(this.createOrderRequest.getCreateOrderPayload(passengerDetailsMap, offerId));

        // Attach request payload
        await attachment('Create Order Request Payload', JSON.stringify(payload, null, 2), {
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
        await attachment('Create Order Response Body', JSON.stringify(await response.json(), null, 2), {
          contentType: 'application/json'
        });

        return response;
      } catch (error) {
        await attachment('Create Order API Error', JSON.stringify({ message: error.message }), {
          contentType: 'application/json'
        });
        throw error;
      }
    });
  }

  public getOrderIdAndWarningMessage(jsonString: string) {
  try {
    const json = JSON.parse(jsonString);
    return {
      orderId: json?.order?.id ?? "Order ID not found",
      warningMessage: json?.warnings?.[0]?.description ?? "Warning message not found"
    };
  } catch (error) {
    return {
      orderId: "Invalid JSON",
      warningMessage: "Invalid JSON"
    };
  }
}
}
