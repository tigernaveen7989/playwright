import { request, TestInfo } from '@playwright/test';
import { attachment, step } from 'allure-js-commons';
import { LoggerFactory } from '../../utilities/logger'
import { XmlTemplateProcessor } from '../../api-base/xml-template-processor'; // Adjust path as needed
import { select, useNamespaces } from 'xpath';
import * as xpath from 'xpath';
import { DOMParser } from 'xmldom';

const logger = LoggerFactory.getLogger(__filename);

export class PriceApi {
    private xmlProcessor: XmlTemplateProcessor;
    //private readonly replacements: Record<string, string>
    private readonly selectedOfferItemXmlTemplatePath: string = process.cwd() + '/xml-api/payloads/price/selectedofferitem.txt';
    private readonly priceXmlTemplatePath: string = process.cwd() + '/xml-api/payloads/price/price.txt';

    constructor() {
        this.xmlProcessor = new XmlTemplateProcessor();
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

    /**
     * 
     * @param xmlString 
     * @returns 
     */
    public getOfferID(xmlString: string): string {
        const doc = new DOMParser().parseFromString(xmlString, 'text/xml');

        if (!doc || !doc.documentElement) {
            throw new Error("Invalid XML document");
        }

        const nodes = xpath.select(`//*[local-name()='OfferID']`, doc);

        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
            return "";
        }

        const offerIdNode = nodes[0];
        return offerIdNode?.textContent?.trim() ?? "";
    }


    /**
     * 
     * @param xmlString 
     * @param paxTypeMap 
     * @returns 
     */
    public getPassengerDetailsMap(xmlString: string, paxTypeMap: Map<string, string>): Map<string, Map<string, string>> {
        const doc = new DOMParser().parseFromString(xmlString, 'text/xml');

        if (!doc || !doc.documentElement) {
            throw new Error("Invalid XML document");
        }

        const passengerDetailsMap = new Map<string, Map<string, string>>();

        // Get all OfferItem nodes
        const offerItemNodes = xpath.select(`//*[local-name()='OfferItem']`, doc) as any[];

        offerItemNodes.forEach(offerItemNode => {
            // OfferItemID
            const offerItemIdNodes = xpath.select(`./*[local-name()='OfferItemID']`, offerItemNode);
            const offerItemIdNode = Array.isArray(offerItemIdNodes) && offerItemIdNodes.length > 0 ? offerItemIdNodes[0] : null;
            const offerItemId = offerItemIdNode?.textContent?.trim() ?? "";

            // Price (TotalAmount)
            const priceNodes = xpath.select(`./*[local-name()='Price']/*[local-name()='TotalAmount']`, offerItemNode);
            const priceNode = Array.isArray(priceNodes) && priceNodes.length > 0 ? priceNodes[0] : null;
            const price = priceNode?.textContent?.trim() ?? "";

            // PaxRefID
            const paxRefIdNodes = xpath.select(`./*[local-name()='Service']/*[local-name()='PaxRefID']`, offerItemNode);
            const paxRefIdNode = Array.isArray(paxRefIdNodes) && paxRefIdNodes.length > 0 ? paxRefIdNodes[0] : null;
            const paxRefId = paxRefIdNode?.textContent?.trim() ?? "";

            if (!paxRefId || !paxTypeMap.has(paxRefId)) {
                // Skip if paxRefId not in input map
                return;
            }

            // PassengerJourneyIds (PaxJourneyRefID)
            const journeyNodes = xpath.select(
                `./*[local-name()='Service']/*[local-name()='OfferServiceAssociation']/*[local-name()='PaxJourneyRef']/*[local-name()='PaxJourneyRefID']`,
                offerItemNode
            );
            const journeyNode = Array.isArray(journeyNodes) && journeyNodes.length > 0 ? journeyNodes[0] : null;
            const passengerJourneyIds = journeyNode?.textContent?.trim() ?? "";

            // Create inner Map for pax details
            const paxDetails = new Map<string, string>();
            paxDetails.set("offerItemId", offerItemId);
            paxDetails.set("price", price);
            paxDetails.set("passengerJourneyIds", passengerJourneyIds);
            paxDetails.set("paxTypeCode", paxTypeMap.get(paxRefId)!); // non-null because of check above

            // Add to outer Map
            passengerDetailsMap.set(paxRefId, paxDetails);
        });
        logger.info("Passenger details map: ", JSON.stringify(Object.fromEntries([...passengerDetailsMap].map(([k, v]) => [k, Object.fromEntries(v)])), null, 2));
        return passengerDetailsMap;
    }
}
