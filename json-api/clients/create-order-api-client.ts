import { APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api-client';

export class CreateOrderApiClient extends BaseApiClient {
  async createOrder(
    endpoint: string,
    headers: Record<string, string>,
    payload: object
  ): Promise<APIResponse> {
    return this.post(
      'CreateOrder',
      'Send Create Order API Request and Log Request/Response',
      endpoint,
      headers,
      payload,
      'Create Order Request Payload',
      'Create Order Response Body'
    );
  }
}
