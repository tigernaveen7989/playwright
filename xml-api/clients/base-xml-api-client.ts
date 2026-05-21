import { request, APIResponse } from '@playwright/test';
import { attachment, step } from 'allure-js-commons';
import { XmlTemplateProcessor } from '../../api-base/xml-template-processor';
import { LoggerFactory } from '../../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);
const xmlFormatter = new XmlTemplateProcessor();

export abstract class BaseXmlApiClient {
  /**
   * Sends an HTTP POST with an XML payload, attaches formatted request/response
   * to Allure, and returns the raw APIResponse. Content-Type is set automatically.
   * Network errors are caught, attached to Allure, and re-thrown.
   */
  protected async post(
    stepName: string,
    endpoint: string,
    headers: Record<string, string>,
    xmlPayload: string,
    requestAttachmentName: string,
    responseAttachmentName: string
  ): Promise<APIResponse> {
    return await step(stepName, async () => {
      let response: APIResponse;

      try {
        logger.info(`Sending XML request to: ${endpoint}`);
        await attachment(requestAttachmentName, xmlFormatter.formatXml(xmlPayload), {
          contentType: 'text/plain'
        });

        const apiContext = await request.newContext();
        response = await apiContext.post(endpoint, {
          headers: { ...headers, 'Content-Type': 'application/xml' },
          data: xmlPayload
        });

        logger.info(`Response status: ${response.status()} for ${endpoint}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.info(`XML request failed for ${endpoint}: ${message}`);
        await attachment(`${stepName} - Network Error`, JSON.stringify({ message }), {
          contentType: 'application/json'
        });
        throw error;
      }

      // Attach formatted XML response (Playwright buffers body — safe to re-read in tests)
      const responseText = await response.text();
      await attachment(responseAttachmentName, xmlFormatter.formatXml(responseText), {
        contentType: 'text/plain'
      });

      return response;
    });
  }
}
