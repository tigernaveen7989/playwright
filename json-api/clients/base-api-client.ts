import { request, APIResponse } from '@playwright/test';
import { attachment, step } from 'allure-js-commons';
import { LoggerFactory } from '../../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export abstract class BaseApiClient {
  protected async post(
    apiName: string,
    stepName: string,
    endpoint: string,
    headers: Record<string, string>,
    payload: object,
    requestAttachmentName: string,
    responseAttachmentName: string
  ): Promise<APIResponse> {
    return await step(stepName, async () => {
      let response: APIResponse;

      try {
        logger.info(`Sending request to: ${endpoint}`);
        await attachment(`${apiName} - URI`, endpoint, { contentType: 'text/plain' });
        await attachment(`${apiName} - Headers`, JSON.stringify(headers, null, 2), {
          contentType: 'application/json'
        });
        await attachment(requestAttachmentName, JSON.stringify(payload, null, 2), {
          contentType: 'application/json'
        });

        const apiContext = await request.newContext();
        response = await apiContext.post(endpoint, {
          headers: { ...headers, 'Content-Type': 'application/json' },
          data: JSON.stringify(payload)
        });
        logger.info(`Response status: ${response.status()} for ${endpoint}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.info(`Request failed for ${endpoint}: ${message}`);
        await attachment(`${stepName} - Network Error`, JSON.stringify({ message }), {
          contentType: 'application/json'
        });
        throw error;
      }

      // Attach response body (best effort - handles both JSON and non-JSON responses)
      try {
        const responseJson = await response.json();
        await attachment(responseAttachmentName, JSON.stringify(responseJson, null, 2), {
          contentType: 'application/json'
        });
      } catch {
        const responseText = await response.text();
        await attachment(responseAttachmentName, responseText, { contentType: 'text/plain' });
      }

      return response;
    });
  }
}
