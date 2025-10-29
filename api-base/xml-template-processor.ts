import { readFileSync } from 'fs';
import { DOMParser } from 'xmldom';

export class XmlTemplateProcessor {
  private xmlContent?: string;

  constructor() {
  
  }

  /**
   * Replaces placeholders in the XML with actual values.
   * @param replacements A key-value map of placeholders and their replacements.
   */
  replacePlaceholders(replacements: Record<string, string>, filePath: string): string {
    this.xmlContent = readFileSync(filePath, 'utf-8');

    for (const [key, value] of Object.entries(replacements)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedKey, 'g');
      this.xmlContent = this.xmlContent.replace(regex, value);
    }
    return this.xmlContent;
  }


  /**
   * Returns the updated XML as a string.
   */
  getXmlString(): string | undefined{
    return this.xmlContent;
  }

  /**
   * Parses the XML string into a DOM object.
   */
  getXmlDocument(xmlContent: string): Document {
    const parser = new DOMParser();
    return parser.parseFromString(xmlContent, 'application/xml');
  }

  // Static utility method to format XML with indentation
  public formatXml(xml: string): string {
    const PADDING = '  '; // 2 spaces
    const reg = /(>)(<)(\/*)/g;
    let formatted = '';
    let pad = 0;

    xml = xml.replace(reg, '$1\r\n$2$3');
    xml.split('\r\n').forEach((node) => {
      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (node.match(/^<\/\w/)) {
        if (pad !== 0) pad -= 1;
      } else if (node.match(/^<\w([^>]*[^/])?>.*$/)) {
        indent = 1;
      } else {
        indent = 0;
      }

      const padding = PADDING.repeat(pad);
      formatted += padding + node + '\r\n';
      pad += indent;
    });

    return formatted.trim();
  }
}
