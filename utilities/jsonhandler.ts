import fs from 'fs';
import path from 'path';

type JsonData = {
  [key: string]: any[];
};

export default class jsonhandler {
  private jsonFilePath: string;
  private jsonData: JsonData;

  constructor(jsonFilePath: string) {
    this.jsonFilePath = jsonFilePath;
    this.jsonData = this.loadJson();
  }

  private loadJson(): JsonData {
    const rawData = fs.readFileSync(path.resolve(__dirname, this.jsonFilePath), 'utf-8');
    return JSON.parse(rawData);
  }

  loadTestData(testCaseName: string): Map<string, any> {
    const globalData = this.jsonData.global?.[0] || {};
    const testCaseData = this.jsonData[testCaseName]?.[0];

    if (!testCaseData) {
      throw new Error(`❌ Test data not available for test case: "${testCaseName}" in JSON file.`);
    }

    return new Map<string, any>(Object.entries({ ...globalData, ...testCaseData }));
  }
}