import { request, TestInfo } from '@playwright/test';
import { attachment, step } from 'allure-js-commons';
import { readFileSync } from 'fs';
import { XmlTemplateProcessor } from '../../api-base/xml-template-processor'; // Adjust path as needed

export class ShopApi {
    private xmlProcessor: XmlTemplateProcessor;
    //private readonly replacements: Record<string, string>
    private readonly paxListXmlTemplatePath: string = process.cwd() + '/xml-api/payloads/shop/paxlist.txt';
    private readonly shopXmlTemplatePath: string = process.cwd() + '/xml-api/payloads/shop/shop.txt';

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
        paxTypeMap: Map<string, string>
    ): Promise<any> {
        return await step('Send Shop API Request and Log Request/Response', async () => {
            try {
                const paxListXMLObject = this.getPaxListXMLObject(paxTypeMap, this.paxListXmlTemplatePath);
                replacements['#{@PAXLIST}'] = paxListXMLObject;
                const xmlPayload = this.xmlProcessor.replacePlaceholders(replacements, this.shopXmlTemplatePath);
                const xmlDocument: Document = this.xmlProcessor.getXmlDocument(xmlPayload);

                await attachment('Shop XML Request Payload', this.xmlProcessor.formatXml(xmlPayload), {
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

                await attachment('Shop XML Response Body', this.xmlProcessor.formatXml(responseBody), {
                    contentType: 'text/plain'
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
}
