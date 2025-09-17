import { readFileSync } from 'fs';
import { DOMParser } from 'xmldom';

export class XmlTemplateProcessor {
  private xmlContent: string;

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
  getXmlString(): string {
    return this.xmlContent;
  }

  /**
   * Parses the XML string into a DOM object.
   */
  getXmlDocument(xmlContent: string): Document {
    const parser = new DOMParser();
    return parser.parseFromString(xmlContent, 'application/xml');
  }
}
