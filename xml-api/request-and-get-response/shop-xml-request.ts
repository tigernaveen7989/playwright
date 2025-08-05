import { request, TestInfo } from '@playwright/test';
import { attachment, step } from 'allure-js-commons';
import { XmlTemplateProcessor } from '../../api-base/xml-template-processor'; // Adjust path as needed

export class ShopApi {
    private xmlProcessor: XmlTemplateProcessor;
    private readonly xmlTemplatePath: string = process.cwd()+'/xml-api/payloads/shop/shop.txt';

    constructor(
        private readonly replacements: Record<string, string>
    ) {
        this.xmlProcessor = new XmlTemplateProcessor(this.xmlTemplatePath);
        this.xmlProcessor.replacePlaceholders(this.replacements);
    }

    /**
     * Sends the XML payload to the given endpoint and logs request/response.
     * @param endpoint API endpoint URL.
     * @param headers HTTP headers for the request.
     * @param testInfo Playwright test info for Allure reporting.
     * @returns The API response.
     */
    public async sendRequestAndGetResponse(
        endpoint: string,
        headers: Record<string, string>,
        testInfo: TestInfo
    ): Promise<any> {
        return await step('Send Shop API Request and Log Request/Response', async () => {
            try {
                const xmlPayload = this.xmlProcessor.getXmlString();
                await attachment('Shop XML Request Payload', xmlPayload, {
                    contentType: 'application/xml'
                });

                const apiContext = await request.newContext();
                const response = await apiContext.post(endpoint, {
                    headers: {
                        ...headers,
                        'Content-Type': 'application/xml'
                    },
                    data: xmlPayload
                });

                const responseBody = await response.text();
                console.log(response.status());
                console.log("response is ========== ", responseBody);

                await attachment('Shop XML Response Body', responseBody, {
                    contentType: 'application/xml'
                });

                return response;
            } catch (error: any) {
                await attachment('Shop API Error', JSON.stringify({ message: error.message }), {
                    contentType: 'application/json'
                });
                throw error;
            }
        });
    }
}
