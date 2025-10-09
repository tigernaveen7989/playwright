import { request, TestInfo } from '@playwright/test';
import { attachment, step } from 'allure-js-commons';
import { readFileSync } from 'fs';
import { faker } from '@faker-js/faker';
import { LoggerFactory } from '../../utilities/logger'
import { XmlTemplateProcessor } from '../../api-base/xml-template-processor'; // Adjust path as needed
import { DOMParser } from 'xmldom';
import * as xpath from 'xpath';

const logger = LoggerFactory.getLogger(__filename);

export class CreateOrderApi {
    private xmlProcessor: XmlTemplateProcessor;
    private replacements: Record<string, string>
    private readonly paxXmlTemplatePath: string = process.cwd() + '/xml-api/payloads/create-order/pax.txt';
    private readonly selectedPricedOfferXmlTemplatePath: string = process.cwd() + '/xml-api/payloads/create-order/selectedpricedoffer.txt';
    private readonly createOrderXmlTemplatePath: string = process.cwd() + '/xml-api/payloads/create-order/createorder.txt';
    private readonly offerAssociationXmlTemplatePath: string = process.cwd() + '/xml-api/payloads/create-order/offerassociation.txt';

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
        passengerDetailsMap: Map<string, Map<string, string>>,
        offerId: string
    ): Promise<any> {
        return await step('Send CreateOrder API Request and Log Request/Response', async () => {
            try {
                this.replacements = replacements;
                this.xmlProcessor = new XmlTemplateProcessor();
                const paxXMLObject = this.getPaxXMLObject(passengerDetailsMap);
                replacements['#{@PAX}'] = paxXMLObject;
                const offerAssociationXMLObject = this.getOfferAssociationXMLObject(passengerDetailsMap, offerId);
                replacements['#{@OFFER_ASSOCIATION}'] = offerAssociationXMLObject;
                const selectedPricedOffersXMLObject = this.getSelectedPricedOffersXMLObject(passengerDetailsMap, offerId);
                replacements['#{@SELECTED_PRICED_OFFER}'] = selectedPricedOffersXMLObject;
                const totalPrice: string = Array.from(passengerDetailsMap.values())
                    .map(paxDetails => parseFloat(paxDetails.get("price") || "0"))
                    .reduce((sum, price) => sum + price, 0)
                    .toFixed(2);


                replacements['$TOTAL_AMOUNT'] = totalPrice;

                const xmlPayload = this.xmlProcessor.replacePlaceholders(replacements, this.createOrderXmlTemplatePath);
                const xmlDocument: Document = this.xmlProcessor.getXmlDocument(xmlPayload);

                await attachment('CreateOrder XML Request Payload', this.xmlProcessor.formatXml(xmlPayload), {
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

                await attachment('CreateOrder XML Response Body', this.xmlProcessor.formatXml(responseBody), {
                    contentType: 'text/plain'
                });

                return response;
            } catch (error: any) {
                await attachment('CreateOrder API Error', JSON.stringify({ message: error.message }), {
                    contentType: 'application/json'
                });
                throw error;
            }
        });
    }


    /**
     * 
     * @param passengerDetailsMap 
     */
    private getOfferAssociationXMLObject(passengerDetailsMap: Map<string, Map<string, string>>, offerId: string): string {
        const offerAssociationList: string[] = [];

        for (const [paxKey, paxDetails] of passengerDetailsMap.entries()) {
            const offerItemRefId: string = paxDetails.get("offerItemId")!;
            this.replacements['$OFFER_ITEM_REF_ID'] = offerItemRefId;
            this.replacements['$OFFER_REF_ID'] = offerId;

            const paxXMLObject = this.xmlProcessor.replacePlaceholders(this.replacements, this.offerAssociationXmlTemplatePath);
            offerAssociationList.push(paxXMLObject);
        }

        logger.info('offer association object', offerAssociationList.join('\n'));
        return offerAssociationList.join('\n');
    }

    /**
     * 
     * @param passengerDetailsMap 
     */
    private getSelectedPricedOffersXMLObject(passengerDetailsMap: Map<string, Map<string, string>>, offerId: string): string {
        const selectedPricedOffersList: string[] = [];

        for (const [paxKey, paxDetails] of passengerDetailsMap.entries()) {
            const offerItemRefId: string = paxDetails.get("offerItemId")!;
            const replacements: Record<string, string> = {};
            replacements['$OFFER_ITEM_REF_ID'] = offerItemRefId;
            replacements['$OFFER_REF_ID'] = offerId;
            replacements['$OWNER_CODE'] = this.replacements['$OWNER_CODE'];
            replacements['$PAXID'] = paxKey;

            const paxXMLObject = this.xmlProcessor.replacePlaceholders(replacements, this.selectedPricedOfferXmlTemplatePath);
            selectedPricedOffersList.push(paxXMLObject);
        }

        logger.info('selected priced offers object', selectedPricedOffersList.join('\n'));
        return selectedPricedOffersList.join('\n');
    }

    /**
     * 
     * @param passengerDetailsMap 
     * @param paxXmlTemplatePath 
     * @returns 
     */
    private getPaxXMLObject(passengerDetailsMap: Map<string, Map<string, string>>) {
        const paxList: string[] = [];

        for (const [paxKey, paxDetails] of passengerDetailsMap.entries()) {
            const replacements: Record<string, string> = {};
            const paxTypeCode: string = paxDetails.get("paxTypeCode")!;
            replacements['$PAXID'] = paxKey;
            replacements['$PAXTYPE'] = paxTypeCode;
            replacements['$FIRST_NAME'] = faker.person.firstName();
            replacements['$LAST_NAME'] = faker.person.lastName();
            replacements['$MIDDLE_NAME'] = faker.person.middleName();
            replacements['$TITLE'] = faker.person.prefix().replace(".", "");
            replacements['$DATE_OF_BIRTH'] = faker.date.birthdate({ min: 18, max: 65, mode: 'age' }).toISOString().split('T')[0];
            if (paxTypeCode.match('CNN')) {
                replacements['$DATE_OF_BIRTH'] = "2018-07-09";
            }
            const sex = faker.person.sex(); // returns 'male' or 'female'
            replacements['$GENDER_CODE'] = sex === 'male' ? 'M' : 'F';
            const paxXMLObject = this.xmlProcessor.replacePlaceholders(replacements, this.paxXmlTemplatePath);
            paxList.push(paxXMLObject);
        }

        logger.info('pax object', paxList.join('\n'));
        return paxList.join('\n');
    }


    /**
     * 
     * @param paxType 
     * @returns 
     */
    public getPaxType(paxType: string): Map<string, string> {
        const paxMap = new Map<string, string>();
        let paxIndex = 1;

        // Match all occurrences of number + type (A, C, I, INS)
        const regex = /(\d+)(INS|A|C|I)/g;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(paxType)) !== null) {
            const count = parseInt(match[1], 10);
            const typeCode = match[2];

            let paxTypeLabel: string;
            switch (typeCode) {
                case "A":
                    paxTypeLabel = "ADT";
                    break;
                case "C":
                    paxTypeLabel = "CNN";
                    break;
                case "I":
                    paxTypeLabel = "INF";
                    break;
                case "INS":
                    paxTypeLabel = "INS";
                    break;
                default:
                    throw new Error(`Unknown pax type: ${typeCode}`);
            }

            for (let i = 0; i < count; i++) {
                paxMap.set(`PAX${paxIndex++}`, paxTypeLabel);
            }
        }

        if (paxMap.size === 0) {
            throw new Error("Invalid paxType format.");
        }

        return paxMap;
    }



    private getPaxListXMLObject(paxTypeMap: Map<string, string>, paxItemTemplatePath: string): string {
        const paxItemTemplate = readFileSync(paxItemTemplatePath, 'utf-8');

        const entries = [...paxTypeMap.entries()].sort(([a], [b]) => {
            const ax = this.extractIndex(a);
            const bx = this.extractIndex(b);
            return ax - bx || a.localeCompare(b);
        });

        let paxBlocks = '';

        for (const [paxId, ptc] of entries) {
            if (!ptc) throw new Error(`Missing PTC for ${paxId}`);

            const block = paxItemTemplate
                .replace(/\$PAXID/g, paxId)
                .replace(/\$PAXTYPE/g, ptc);

            paxBlocks += block + '\n';
        }

        return `${paxBlocks}`;
    }

    private extractIndex(id: string): number {
        const m = /(\d+)$/.exec(id);
        return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
    }

    /**
  * Extracts OfferId and all matching PaxRefID → OfferItemID pairs from XML response
  * @param paxMap Map of requested Pax IDs
  * @param responseBody XML response string
  * @returns Map with OfferId and PaxRefID → OfferItemID pairs
  */
    public getPaxOfferItemIdsMap(
        paxMap: Map<string, string>,
        responseBody: string
    ): Map<string, string> {
        const result = new Map<string, string>();

        // Decode HTML entities if needed
        const xml = responseBody
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

        // Extract OfferId
        const offerIdMatch = xml.match(/<cns:OfferID>([^<]+)<\/cns:OfferID>/);
        if (!offerIdMatch) throw new Error('OfferID not found');
        const offerId = offerIdMatch[1].trim();
        result.set('OfferId', offerId);

        // Extract all OfferItem blocks
        const offerItemBlocks = xml.match(/<cns:OfferItem\b[\s\S]*?<\/cns:OfferItem>/g) || [];

        // Track which PAX IDs have been matched
        const matchedPaxIds = new Set<string>();

        // Loop through all OfferItem blocks and collect matches
        for (const block of offerItemBlocks) {
            const itemIdMatch = block.match(/<cns:OfferItemID>([^<]+)<\/cns:OfferItemID>/);
            const paxMatch = block.match(/<cns:PaxRefID>([^<]+)<\/cns:PaxRefID>/);

            if (itemIdMatch && paxMatch) {
                const paxId = paxMatch[1].trim();
                const offerItemId = itemIdMatch[1].trim();

                if (paxMap.has(paxId) && !matchedPaxIds.has(paxId)) {
                    result.set(paxId, offerItemId);
                    matchedPaxIds.add(paxId);
                }
            }

            // Optional: break early if all PAX IDs are matched
            if (matchedPaxIds.size === paxMap.size) {
                break;
            }
        }

        // Validate all PAX IDs were matched
        for (const paxId of paxMap.keys()) {
            if (!result.has(paxId)) {
                throw new Error(`No OfferItemID found for ${paxId}`);
            }
        }

        return result;
    }

    public getOrderId(createOrderResponse: string): string | null {
        const doc = new DOMParser().parseFromString(createOrderResponse, 'text/xml');
        const nodes: any = xpath.select(
            '//*[local-name()="OrderID"]/text()',
            doc
        ) as xpath.SelectedValue[] | null;

        return nodes && nodes.length > 0 ? nodes[0]?.nodeValue ?? null : null;
    }

    public getWarningMessage(createOrderResponse: string): string {
        const doc = new DOMParser().parseFromString(createOrderResponse, 'text/xml');

        // Select DescText nodes
        const nodes = xpath.select(
            '//*[local-name()="Warning"]/*[local-name()="DescText"]/text()',
            doc
        ) as Node[]; // <-- Type assertion to Node[]

        // Return the first nodeValue or empty string
        return nodes && nodes.length > 0 ? (nodes[0].nodeValue ?? '').trim() : '';
    }
}
