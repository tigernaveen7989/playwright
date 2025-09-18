import { request, TestInfo } from '@playwright/test';
import { attachment, step } from 'allure-js-commons';
import { LoggerFactory } from '../../utilities/logger'
import { XmlTemplateProcessor } from '../../api-base/xml-template-processor'; // Adjust path as needed
import { select, useNamespaces } from 'xpath';
import { DOMParser } from 'xmldom';

const logger = LoggerFactory.getLogger(__filename);

export class PriceApi {
    private xmlProcessor: XmlTemplateProcessor;
    //private readonly replacements: Record<string, string>
    private readonly selectedOfferItemXmlTemplatePath: string = process.cwd() + '/xml-api/payloads/price/selectedofferitem.txt';
    private readonly priceXmlTemplatePath: string = process.cwd() + '/xml-api/payloads/price/price.txt';

    constructor() {

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
        testInfo: TestInfo,
        replacements: Record<string, string>,
        paxIdOffersItemIdsMap: Map<string, string>
    ): Promise<any> {
        return await step('Send Price API Request and Log Request/Response', async () => {
            try {
                this.xmlProcessor = new XmlTemplateProcessor();
                const selectedOfferItemList = this.getSelectedOfferItemXMLObject(paxIdOffersItemIdsMap);

                replacements['$OFFERID'] = paxIdOffersItemIdsMap.get('OfferId')!;
                replacements['#{@SELECTEDOFFERITEM}'] = selectedOfferItemList;
                const xmlPayload = this.xmlProcessor.replacePlaceholders(replacements, this.priceXmlTemplatePath);
                const xmlDocument: Document = this.xmlProcessor.getXmlDocument(xmlPayload);

                await attachment('Price XML Request Payload', this.xmlProcessor.formatXml(xmlPayload), {
                    contentType: 'text/plain'
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

                await attachment('Price XML Response Body', this.xmlProcessor.formatXml(responseBody), {
                    contentType: 'text/plain'
                });

                return response;
            } catch (error: any) {
                await attachment('Price API Error', JSON.stringify({ message: error.message }), {
                    contentType: 'application/json'
                });
                throw error;
            }
        });
    }

    /**
     * Get selected offer item xml object
     */
    private getSelectedOfferItemXMLObject(paxIdOffersItemIdsMap: Map<string, string>): string {
        const selectedOfferItemList: string[] = [];

        for (const [key, value] of paxIdOffersItemIdsMap.entries()) {
            const replacements: Record<string, string> = {};
            if (key.startsWith("PAX")) {
                replacements['$PAXID'] = key;
                replacements['$OFFER_ITEM_REF_ID'] = value;
                const selectedOfferItemXMLObject = this.xmlProcessor.replacePlaceholders(replacements, this.selectedOfferItemXmlTemplatePath);
                selectedOfferItemList.push(selectedOfferItemXMLObject);
            }
        }
        return selectedOfferItemList.join('\n');
    }

}
