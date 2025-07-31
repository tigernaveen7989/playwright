import { ShopJsonObject } from '../create-payload/shop-json-object';

export class shop {
  private shopRequest: ShopJsonObject;
  private endpoint: string;
  private headers: Record<string, string>;

  constructor(
    origin: string,
    destination: string,
    day: number,
    month: number,
    year: number,
    endpoint: string,
    headers: Record<string, string>,
    currency: string = 'EUR'
  ) {
    this.shopRequest = new ShopJsonObject(origin, destination, day, month, year, currency);
    this.endpoint = endpoint;
    this.headers = headers;
  }

  async execute(): Promise<any> {
    const payload = this.shopRequest.getShopPayload();
    return await this.sendRequestAndGetResponse(this.endpoint, payload, this.headers);
  }

  private async sendRequestAndGetResponse(
    endpoint: string,
    payload: any,
    headers: Record<string, string>
  ): Promise<any> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        // headers: {
        //   'Content-Type': 'application/json',
        //   ...headers
        // },
        headers,
        body: JSON.stringify(payload)
      });

      console.log("response is ======== ",response.text);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in sendSabreRequest:', error);
      throw error;
    }
  }
}
