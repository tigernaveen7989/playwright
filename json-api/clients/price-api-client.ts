import { APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api-client';

export class PriceApiClient extends BaseApiClient {
  async price(
    endpoint: string,
    headers: Record<string, string>,
    payload: object
  ): Promise<APIResponse> {
    return this.post(
      'Price',
      'Send Price API Request and Log Request/Response',
      endpoint,
      headers,
      payload,
      'Price Request Payload',
      'Price Response Body'
    );
  }
}
