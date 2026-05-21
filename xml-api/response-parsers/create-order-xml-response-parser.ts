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
}
