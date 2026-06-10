import * as xpath from 'xpath';
import { DOMParser } from 'xmldom';
import { LoggerFactory } from '../../utilities/logger';

const logger = LoggerFactory.getLogger(__filename);

export class CreateOrderXmlResponseParser {

  /**
   * Extracts the OrderID from the Create Order XML response.
   * Returns null if no OrderID element is found.
   *
   * @param xmlString Raw Create Order XML response text
   * @returns OrderID string or null
   */
  getOrderId(xmlString: string): string | null {
    const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
    const nodes = xpath.select('//*[local-name()="OrderID"]/text()', doc) as any[];
    const orderId = nodes?.length > 0 ? (nodes[0].nodeValue ?? null) : null;

    logger.info(`Create Order response — OrderId: ${orderId}`);
    return orderId;
  }

  /**
   * Extracts the first Warning DescText value from the Create Order XML response.
   * Returns an empty string if no warning is present (indicating a clean order).
   *
   * @param xmlString Raw Create Order XML response text
   * @returns Warning description text, or empty string if none
   */
  getWarningMessage(xmlString: string): string {
    const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
    const nodes = xpath.select(
      '//*[local-name()="Warning"]/*[local-name()="DescText"]/text()',
      doc
    ) as Node[];

    const message = nodes?.length > 0 ? (nodes[0].nodeValue ?? '').trim() : '';
    if (message) logger.info(`Create Order response — warning: ${message}`);
    return message;
  }

  /**
   * Extracts the account code from FareRule RemarkText elements in the Create Order
   * XML response. Looks for text matching 'ACCOUNT CODE - <code>' pattern.
   * Returns an empty string if no account code remark is found.
   *
   * @param xmlString Raw Create Order XML response text
   * @returns Account code string (e.g. 'EAL74'), or empty string if none
   */
  getAccountCode(xmlString: string): string {
    const doc = new DOMParser().parseFromString(xmlString, 'text/xml');
    const nodes = xpath.select(
      '//*[local-name()="FareRule"]/*[local-name()="Remark"]/*[local-name()="RemarkText"]/text()',
      doc
    ) as Node[];

    for (const node of nodes) {
      const text = (node.nodeValue ?? '').trim();
      const match = text.match(/ACCOUNT CODE\s*-\s*(\S+)/i);
      if (match) {
        logger.info(`Create Order response — account code: ${match[1]}`);
        return match[1];
      }
    }

    logger.info('Create Order response — no account code found in FareRule remarks');
    return '';
  }
}
