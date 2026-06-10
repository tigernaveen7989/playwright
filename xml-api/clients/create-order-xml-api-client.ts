import { APIResponse } from '@playwright/test';
import { BaseXmlApiClient } from './base-xml-api-client';

export class CreateOrderXmlApiClient extends BaseXmlApiClient {
  async createOrder(
    endpoint: string,
    headers: Record<string, string>,
    xmlPayload: string
  ): Promise<APIResponse> {
    return this.post(
      'CreateOrder',
      'Send CreateOrder XML API Request and Log Request/Response',
      endpoint,
      headers,
      xmlPayload,
      'CreateOrder XML Request Payload',
      'CreateOrder XML Response Body'
    );
  }
}
