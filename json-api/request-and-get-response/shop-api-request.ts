import { ShopJsonObject } from '../create-payload/shop-json-object';
import { request, TestInfo } from '@playwright/test';
import { activateJwtToken } from "../../api-base/create-jwt-token";

export class shopApi {
  private shopRequest: ShopJsonObject;
  private endpoint: string;
  private headers: Record<string, string>;

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
    testInfo: TestInfo
  ): Promise<any> {
    try {
        const payload = await JSON.parse(this.shopRequest.getShopPayload());
        const apiContext = await request.newContext();
        const headers = await activateJwtToken(testInfo);
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
      return response;
    } catch (error) {
      console.error('Error in sendSabreRequest:', error);
      throw error;
    }
  }
}
