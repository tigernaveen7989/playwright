import fs from 'fs';
import path from 'path';

type JsonData = {
  [key: string]: any[]; // you can refine the structure based on your JSON shape
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
    const testCaseData = this.jsonData[testCaseName]?.[0] || {};

    // Merge global and test case data (test case overrides global)
    return new Map<string, any>(Object.entries({ ...globalData, ...testCaseData }));
  }
}
