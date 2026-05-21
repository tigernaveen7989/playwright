import { APIResponse } from '@playwright/test';
import { BaseXmlApiClient } from './base-xml-api-client';

export class PriceXmlApiClient extends BaseXmlApiClient {
  async price(
    endpoint: string,
    headers: Record<string, string>,
    xmlPayload: string
  ): Promise<APIResponse> {
    return this.post(
      'Send Price XML API Request and Log Request/Response',
      endpoint,
      headers,
      xmlPayload,
      'Price XML Request Payload',
      'Price XML Response Body'
    );
  }
}
