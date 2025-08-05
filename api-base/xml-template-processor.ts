import { readFileSync } from 'fs';
import { DOMParser } from 'xmldom';

export class XmlTemplateProcessor {
  private xmlContent: string;

  constructor(private filePath: string) {
    this.xmlContent = readFileSync(this.filePath, 'utf-8');
  }

  /**
   * Replaces placeholders in the XML with actual values.
   * @param replacements A key-value map of placeholders and their replacements.
   */
  replacePlaceholders(replacements: Record<string, string>): void {
    for (const [key, value] of Object.entries(replacements)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedKey, 'g');
      this.xmlContent = this.xmlContent.replace(regex, value);
    }
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
  getXmlDocument(): Document {
    const parser = new DOMParser();
    return parser.parseFromString(this.xmlContent, 'application/xml');
  }
}
