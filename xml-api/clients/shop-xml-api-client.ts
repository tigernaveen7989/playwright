import { APIResponse } from '@playwright/test';
import { BaseXmlApiClient } from './base-xml-api-client';

export class ShopXmlApiClient extends BaseXmlApiClient {
  async shop(
    endpoint: string,
    headers: Record<string, string>,
    xmlPayload: string
  ): Promise<APIResponse> {
    return this.post(
      'Shop',
      'Send Shop XML API Request and Log Request/Response',
      endpoint,
      headers,
      xmlPayload,
      'Shop XML Request Payload',
      'Shop XML Response Body'
    );
  }
}
