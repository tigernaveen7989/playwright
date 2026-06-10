import fs from 'fs';
import path from 'path';
import { LoggerFactory } from './logger';

const logger = LoggerFactory.getLogger(__filename);

// ─── Type Declarations ────────────────────────────────────────────────────────

type JsonData = {
  [key: string]: any[];
};

type ScenarioCatalog = Record<string, Record<string, Record<string, Record<string, any>>>>;

// ─── Class ────────────────────────────────────────────────────────────────────

export default class jsonhandler { // eslint-disable-line @typescript-eslint/naming-convention — kept lowercase to match fixtures.ts import convention
  private jsonFilePath: string;
  private jsonData: JsonData;

  constructor(jsonFilePath: string) {
    this.jsonFilePath = jsonFilePath;
    this.jsonData = this.loadJson();
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /** Reads and parses the JSON test data file at construction time. */
  private loadJson(): JsonData {
    const rawData = fs.readFileSync(path.resolve(__dirname, this.jsonFilePath), 'utf-8');
    return JSON.parse(rawData);
  }

  /** Derives the environment key (e.g. TC1) from the sub-environment folder in the JSON file path. */
  private getScenarioEnvironment(): string {
    const jsonAbsolutePath = path.resolve(__dirname, this.jsonFilePath);
    const subEnvironmentFolder = path.basename(path.dirname(jsonAbsolutePath));
    return subEnvironmentFolder.toUpperCase();
  }

  /** Returns the absolute path to route-catalog.json co-located with the tenant data folder. */
  private getRouteCatalogPath(): string {
    const jsonAbsolutePath = path.resolve(__dirname, this.jsonFilePath);
    return path.resolve(path.dirname(jsonAbsolutePath), '..', 'route-catalog.json');
  }

  /**
   * Resolves origin, destination, todayPlusDate, and brandType from the route catalog
   * entry that matches the test case's cityPair + tripType combination.
   *
   * @param testCaseData - The raw test case data record from the JSON file
   * @returns A normalized flat record containing route-derived fields
   */
  private resolveCityPairData(testCaseData: Record<string, any>): Record<string, any> {
    const tripType = String(testCaseData.tripType ?? '').trim().toUpperCase();
    const cityPair = String(testCaseData.cityPair ?? '').trim();
    if (!tripType || !cityPair) {
      return {};
    }

    const catalogPath = this.getRouteCatalogPath();
    if (!fs.existsSync(catalogPath)) {
      throw new Error(`City-pair catalog file not found: '${catalogPath}'.`);
    }

    const catalogRawData = fs.readFileSync(catalogPath, 'utf-8');
    const catalogData: ScenarioCatalog = JSON.parse(catalogRawData);
    const environment = this.getScenarioEnvironment();

    const environmentBlock = catalogData[environment];
    if (!environmentBlock) {
      throw new Error(`Environment '${environment}' not found in route catalog.`);
    }

    const tripTypeBlock = environmentBlock[tripType];
    if (!tripTypeBlock) {
      throw new Error(`Trip type '${tripType}' not found under environment '${environment}' in route catalog.`);
    }

    const scenario = tripTypeBlock[cityPair];
    if (!scenario) {
      throw new Error(`City pair '${cityPair}' not found for '${environment}.${tripType}' in route catalog.`);
    }

    const normalizedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(scenario)) {
      if (key === 'Route') {
        const route = String(value).trim();
        normalizedData.route = route;

        if (tripType !== 'MS') {
          const [origin, destination] = route.split('-').map(item => item.trim());
          if (origin && destination) {
            normalizedData.origin = origin;
            normalizedData.destination = destination;
          }
        }
        continue;
      }

      if (key === 'TodayPlusDate') {
        normalizedData.todayPlusDate = value;
        continue;
      }

      if (key === 'BrandType') {
        normalizedData.brandType = value;
        continue;
      }

      const camelCaseKey = key.charAt(0).toLowerCase() + key.slice(1);
      normalizedData[camelCaseKey] = value;
    }

    return normalizedData;
  }

  // ─── Public Methods ───────────────────────────────────────────────────────────

  /**
   * Loads and merges all test data for the given test case name.
   * Merges in priority order: global config → route catalog data → test-case-specific data.
   * The result is a flat Map consumed by the `testData` fixture in spec files.
   *
   * @param testCaseName - The test case key, e.g. `TC1_Create_Paid_Order_perform_Even_AirExchange`
   * @returns A flat `Map<string, any>` containing all resolved test data fields
   */
  loadTestData(testCaseName: string): Map<string, any> {
    logger.info(`Loading test data for: ${testCaseName}`);
    const globalData = this.jsonData.global?.[0] || {};
    const testCaseData = this.jsonData[testCaseName]?.[0];

    if (!testCaseData) {
      throw new Error(`❌ Test data not available for test case: "${testCaseName}" in JSON file.`);
    }

    const cityPairData = this.resolveCityPairData(testCaseData);
    const merged = new Map<string, any>(Object.entries({ ...globalData, ...cityPairData, ...testCaseData }));
    logger.info(`Test data loaded: ${merged.size} keys resolved for ${testCaseName}`);
    return merged;
  }

  // ─── Static Parsers ───────────────────────────────────────────────────────────

  /**
   * Parses the seatType object from test data into a segment-indexed map.
   * Each segment contains an array of `{ paxIndex, seatCount, seatType }` entries.
   *
   * Input:  `{ "SEGMENT_1": "PAX1:1P,PAX2:1F", "SEGMENT_2": "PAX1:1E" }`
   * Output: `Map<segmentIndex(0-based), Array<{ paxIndex, seatCount, seatType }>>`
   *   - `paxIndex` is 0-based (PAX1 = 0)
   *   - `seatType` is `'PAID'` (P), `'FREE'` (F), or `'EMERGENCY_EXIT'` (E)
   *
   * @param seatType - The seatType object from test data JSON
   * @returns Map where key = segment index (0-based), value = array of pax seat assignments
   */
  static parseSeatType(
    seatType: Record<string, string>
  ): Map<number, Array<{ paxIndex: number; seatCount: number; seatType: string }>> {
    const result = new Map<number, Array<{ paxIndex: number; seatCount: number; seatType: string }>>();

    for (const [segmentKey, paxString] of Object.entries(seatType)) {
      const segmentMatch = segmentKey.match(/SEGMENT_(\d+)/);
      if (!segmentMatch) {
        throw new Error(`Invalid segment key format: "${segmentKey}". Expected "SEGMENT_N".`);
      }
      const segmentIndex = parseInt(segmentMatch[1], 10) - 1;

      const entries = paxString.split(',').map(entry => entry.trim());
      const paxEntries: Array<{ paxIndex: number; seatCount: number; seatType: string }> = [];

      for (const entry of entries) {
        const paxMatch = entry.match(/PAX(\d+):(\d+)(P|F|E)/);
        if (!paxMatch) {
          throw new Error(`Invalid seat entry format: "${entry}". Expected "PAXn:countP", "PAXn:countF", or "PAXn:countE".`);
        }

        let parsedSeatType = 'FREE';
        if (paxMatch[3] === 'P') {
          parsedSeatType = 'PAID';
        } else if (paxMatch[3] === 'E') {
          parsedSeatType = 'EMERGENCY_EXIT';
        }

        paxEntries.push({
          paxIndex: parseInt(paxMatch[1], 10) - 1, // PAX1 → 0
          seatCount: parseInt(paxMatch[2], 10),
          seatType: parsedSeatType,
        });
      }

      result.set(segmentIndex, paxEntries);
    }

    return result;
  }

  /**
   * Parses the `initialAncillaryType` object from test data into a typed map.
   * Maps ancillary type → route key → array of `{ paxIndex, quantity, ancillaryCode }`.
   *
   * @param initialAncillaryType - The ancillary data object from JSON test data
   * @returns Parsed ancillary map for use in ancillary test iteration
   */
  static parseInitialAncillaryType(
    initialAncillaryType: Record<string, Record<string, string>>
  ): Map<string, Map<string, Array<{ paxIndex: number; quantity: number; ancillaryCode: string }>>> {
    const parsedMap = new Map<string, Map<string, Array<{ paxIndex: number; quantity: number; ancillaryCode: string }>>>();

    for (const [ancillaryType, routeMap] of Object.entries(initialAncillaryType)) {
      const parsedRouteMap = new Map<string, Array<{ paxIndex: number; quantity: number; ancillaryCode: string }>>();

      for (const [routeKey, paxAncillaryString] of Object.entries(routeMap)) {
        const entries = paxAncillaryString.split(',').map((entry) => entry.trim());
        const parsedEntries: Array<{ paxIndex: number; quantity: number; ancillaryCode: string }> = [];

        for (const entry of entries) {
          const match = entry.match(/PAX(\d+):(\d+)([A-Za-z]+)/);
          if (!match) {
            throw new Error(`Invalid ancillary entry format: "${entry}". Expected "PAXn:countCode".`);
          }

          parsedEntries.push({
            paxIndex: parseInt(match[1], 10) - 1, // PAX1 → 0
            quantity: parseInt(match[2], 10),
            ancillaryCode: match[3],
          });
        }

        parsedRouteMap.set(routeKey, parsedEntries);
      }

      parsedMap.set(ancillaryType, parsedRouteMap);
    }

    return parsedMap;
  }
}