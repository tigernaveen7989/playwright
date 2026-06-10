import { APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api-client';

export class ShopApiClient extends BaseApiClient {
  async shop(
    endpoint: string,
    headers: Record<string, string>,
    payload: object
  ): Promise<APIResponse> {
    return this.post(
      'Shop',
      'Send Shop API Request and Log Request/Response',
      endpoint,
      headers,
      payload,
      'Shop Request Payload',
      'Shop Response Body'
    );
  }
}
