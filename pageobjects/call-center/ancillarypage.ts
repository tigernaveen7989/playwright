import { Page, Locator, request, APIResponse } from '@playwright/test';
import { BlackPanther } from '../../utilities/blackpanther';
import { LoggerFactory } from '../../utilities/logger';
import { faker } from '@faker-js/faker';
import fs from 'fs';
import path from 'path';
import jsonhandler from '../../utilities/jsonhandler';
import { PassengerDetail, FlightDetail } from './passengerdetailspage';

const logger = LoggerFactory.getLogger(__filename);
const TIMEOUT = 3000;

type AncillaryCodeConfig = {
  standardAncillaryCode: string;
  nonStandardAncillaryCode: string;
  nonBaggageAncillaryCode: string;
  baggageAncillaryCode: string;
  bundleAncillaryCode: string;
  baggageGroupDescription: string;
  nonStandardServiceInvGroup: string;
  excludedNonBaggageGroups: string[];
};

export default class AncillaryPage extends BlackPanther {
  private readonly addServButton: Locator;
  private readonly passengerDropdown: Locator;
  private readonly routeDropdown: Locator;
  private readonly routeDropdownFallback: Locator;
  private readonly serviceSearchInput: Locator;
  private readonly serviceSearchButton: Locator;
  private readonly serviceSuggestions: Locator;
  private readonly retrievedOfferRows: Locator;
  private readonly ancillaryCommentTextArea: Locator;
  private readonly ancillaryDetailsSaveButton: Locator;
  private readonly addAncillaryToCartButton: Locator;
  private readonly acceptButton: Locator;
  private readonly continueButton: Locator;
  private readonly ancillaryPanel: Locator;
  private readonly saveAndContinueButton: Locator;
  private readonly selectedAncillaryItems: Locator;
  private readonly ancillarySummaryText: Locator;
  private readonly assignedServiceRows: Locator;
  private readonly totalNewCharges: Locator;
  private readonly plusIcon: Locator;
  private ancillaryCodeConfig: AncillaryCodeConfig;

  constructor(page: Page) {
    super(page);
    this.page = page;

    this.plusIcon = page.locator("xpath=//i[@aria-label='Settings']");
    this.addServButton = page.locator(
      "xpath=(//button[contains(.,'Add Serv') or contains(.,'Add Service') or contains(@id,'AddServ') or contains(@id,'AddService')] | //a[contains(.,'Add Serv') or contains(.,'Add Service') or contains(@id,'AddServ') or contains(@id,'AddService')])[1]"
    );
    this.passengerDropdown = page.locator('#ddlResNewSsrPassenger');
    this.routeDropdown = page.locator('#ddlResNewSsrSegment');
    this.routeDropdownFallback = page.locator(
      "xpath=(//select[contains(@id,'Route') or contains(@id,'Segment') or contains(@data-bind,'route') or contains(@data-bind,'segment')])[1]"
    );
    this.serviceSearchInput = page.locator('#tbxService');
    this.serviceSearchButton = page.locator('#btnService');
    this.serviceSuggestions = page.locator('ul.ui-autocomplete li.ui-menu-item, #autosuggest1-listbox li');
    this.retrievedOfferRows = page.locator("tbody[role='rowgroup'] tr");
    this.ancillaryCommentTextArea = page.locator('#mainAdditionalInfoForm textarea.spark-input__field');
    this.ancillaryDetailsSaveButton = page.locator('#btnSaveMainAdditionalInfo');
    this.addAncillaryToCartButton = page.locator('#btnAcceptAddSsrtoCart');
    this.acceptButton = page.locator('#btnAcceptAddSsrtoApiCart');
    this.continueButton = page.locator('#btnResAddSsrModalContinue');
    this.ancillaryPanel = page.locator(
      "xpath=(//*[contains(@class,'ancillary') or contains(@id,'Ancillary') or contains(@data-bind,'ancillary')])[1]"
    );
    this.saveAndContinueButton = page.locator(
      "xpath=(//button[contains(.,'Save') or contains(.,'Continue') or contains(@data-bind,'save') or contains(@data-bind,'continue')])[1]"
    );
    this.selectedAncillaryItems = page.locator("tbody[role='rowgroup'] tr");
    this.ancillarySummaryText = page.locator(
      "xpath=(//*[contains(@class,'summary') and (contains(@class,'ancillary') or contains(@class,'service'))])[1]"
    );
    this.assignedServiceRows = page.locator('#kendoGridAssignedSsrs .k-grid-content tbody[role="rowgroup"] tr');
    this.totalNewCharges = page.locator('#spanTotalAssigned');
    this.ancillaryCodeConfig = this.getAncillaryCodeConfig();
  }

  // Loads tenant/environment specific ancillary codes from testdata/{tenant}/ancillary-code.json
  private getAncillaryCodeConfig(): AncillaryCodeConfig {
    const tenant = String(process.env.TENANT ?? '').trim().toLowerCase();
    const environment = String(process.env.SUBENVIRONMENT ?? process.env.ENVIRONMENT ?? 'TC1').trim().toUpperCase();
    const ancillaryCodeFilePath = path.resolve(__dirname, '../../testdata', tenant, 'ancillary-code.json');
    let parsedData: Record<string, Partial<AncillaryCodeConfig>> = {};
    let environmentConfig: Partial<AncillaryCodeConfig> = {};
    let missingKeys: string[] = [];

    if (!tenant) {
      throw new Error('TENANT is not set; ancillary-code.json resolution requires TENANT');
    }

    if (!fs.existsSync(ancillaryCodeFilePath)) {
      throw new Error(`Ancillary code config file not found at '${ancillaryCodeFilePath}'`);
    }

    try {
      parsedData = JSON.parse(fs.readFileSync(ancillaryCodeFilePath, 'utf-8')) as Record<string, Partial<AncillaryCodeConfig>>;
      environmentConfig = parsedData[environment] ?? {};
      if (!parsedData[environment]) {
        throw new Error(`Environment '${environment}' not found in '${ancillaryCodeFilePath}'`);
      }

      missingKeys = [
        'standardAncillaryCode',
        'nonStandardAncillaryCode',
        'nonBaggageAncillaryCode',
        'baggageAncillaryCode',
        'bundleAncillaryCode',
        'baggageGroupDescription',
        'nonStandardServiceInvGroup',
        'excludedNonBaggageGroups'
      ].filter((key) => {
        const value = environmentConfig[key as keyof AncillaryCodeConfig];
        return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
      });

      if (missingKeys.length > 0) {
        throw new Error(`Missing required ancillary config keys for ${tenant.toUpperCase()}/${environment}: ${missingKeys.join(', ')}`);
      }

      if (!Array.isArray(environmentConfig.excludedNonBaggageGroups)) {
        throw new Error(`'excludedNonBaggageGroups' must be an array in ${tenant.toUpperCase()}/${environment}`);
      }

      return environmentConfig as AncillaryCodeConfig;
    } catch (error) {
      throw new Error(`Failed to load ancillary code config from '${ancillaryCodeFilePath}': ${error}`);
    }
  }

  /**
   * Selects all initial ancillaries from parsed test data.
   * Iterates each ancillary type and route, resolves the service name, and calls selectAncillary.
   * @param parsedInitialAncillaries - Map of ancillary type -> route key -> passenger entries.
   * @returns Total expected ancillary quantity added from entries with quantity > 0.
   */
  async selectAncillaries(
    parsedInitialAncillaries: Map<
      string,
      Map<string, Array<{ paxIndex: number; quantity: number; ancillaryCode: string }>>
    >
  ): Promise<number> {
    logger.info('Selecting initial ancillaries from parsed test data');
    let expectedAncillaryCount = 0;
    for (const [ancillaryType, routeMap] of parsedInitialAncillaries.entries()) {
      expectedAncillaryCount += await this.selectAncillariesByType(ancillaryType, routeMap);
    }
    logger.info(`Completed selecting initial ancillaries. Expected count=${expectedAncillaryCount}`);
    return expectedAncillaryCount;
  }

  /**
   * Fetches ancillary lists from API by EMD type and selects ancillaries in UI using passenger and flight details.
   * Selects passenger by name, route by flight details, and ancillary by initialAncillaryType mapping.
   * @param flightDetails - Flight details captured from itinerary grid.
   * @param passengerDetails - Passenger details captured from passenger details page.
   * @param initialAncillaryType - Ancillary assignment object from test data.
   * @returns Total expected ancillary quantity added from initial ancillary assignments.
   */
  async selectAncillariesFromAPI(
    flightDetails: FlightDetail[],
    passengerDetails: PassengerDetail[],
    initialAncillaryType: Record<string, Record<string, string>>
  ): Promise<number> {
    logger.info('Starting ancillary selection from API using passenger and flight details');
    const parsedAncillaries = jsonhandler.parseInitialAncillaryType(initialAncillaryType);
    let expectedAncillaryCount = 0;

    for (const [ancillaryType, routeMap] of parsedAncillaries.entries()) {
      const normalizedAncillaryType = ancillaryType.trim().toLowerCase();
      const emdType = normalizedAncillaryType === 'standalone' ? '0' : '1';
      const apiResponse = await this.getAncillariesFromAPI(emdType);
      logger.info(`API response received for ancillaryType='${ancillaryType}', emdType='${emdType}', keys=${Object.keys(apiResponse).length}`);
      expectedAncillaryCount += await this.addAncillaryByRouteMapUsingDetails(
        ancillaryType,
        routeMap,
        passengerDetails,
        flightDetails,
        apiResponse
      );
    }

    logger.info(`Completed selecting ancillaries from API flow. Expected count=${expectedAncillaryCount}`);
    return expectedAncillaryCount;
  }

  /**
   * Transforms the API response into the expected ancillary map structure.
   * @param apiResponse - Raw JSON response from RetrieveSsrListView API.
   * @returns Map of ancillary type -> route key -> passenger entries array.
   */
  private transformAPIResponseToAncillaryMap(
    apiResponse: Record<string, unknown>
  ): Map<string, Map<string, Array<{ paxIndex: number; quantity: number; ancillaryCode: string }>>> {
    const ancillaryMap = new Map<string, Map<string, Array<{ paxIndex: number; quantity: number; ancillaryCode: string }>>>();
    logger.info('Transforming API response to ancillary map structure');

    // Parse API response and build the map structure
    // Adjust parsing logic based on actual API response format
    try {
      if (apiResponse && typeof apiResponse === 'object') {
        for (const [key, value] of Object.entries(apiResponse)) {
          if (value && typeof value === 'object') {
            const routeMap = new Map<string, Array<{ paxIndex: number; quantity: number; ancillaryCode: string }>>();
            ancillaryMap.set(key, routeMap);
          }
        }
      }
      logger.info(`Ancillary map transformed with ${ancillaryMap.size} ancillary type(s)`);
    } catch (e) {
      logger.error(`Failed to transform API response: ${e instanceof Error ? e.message : e}`);
    }

    return ancillaryMap;
  }

  /**
   * Retrieves browser cookies and converts them into a key-value map.
   * @returns Map of cookie name to cookie value.
   */
  private async getCookiesMap(): Promise<Record<string, string>> {
    logger.info('Retrieving browser cookies');
    const cookies = await this.page.context().cookies();
    const cookieMap: Record<string, string> = {};

    for (const cookie of cookies) {
      cookieMap[cookie.name] = cookie.value;
    }
    logger.info(`Cookies retrieved: ${Object.keys(cookieMap).length} cookie(s)`);
    return cookieMap;
  }

  /**
   * Sends POST request to RetrieveSsrListView API endpoint.
   * @param cookieMap - Browser cookies as key-value map.
   * @param payload - JSON payload to send in the request.
   * @returns API response object.
   */
  private async postGetAncillariesAPIAndResponse(
    cookieMap: Record<string, string>,
    payload: string
  ): Promise<APIResponse> {
    logger.info('Sending POST request to RetrieveSsrListView API');
    const currentUrl = this.page.url();
    const baseURI = currentUrl.split('#')[0];

    const response = await this.page.request.post(
      `${baseURI}ApiReservations/Service/RetrieveSsrListView/`,
      {
        headers: {
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept-Language': 'en-US,en;q=0.9',
          Connection: 'keep-alive',
          'Content-Type': 'application/json; charset=UTF-8',
          Origin: baseURI,
          Referer: baseURI,
          'X-Requested-With': 'XMLHttpRequest',
          Cookie: Object.entries(cookieMap)
            .map(([key, value]) => `${key}=${value}`)
            .join('; ')
        },
        data: payload
      }
    );

    if (response.status() !== 200) {
      throw new Error(`RetrieveSsrListView API returned status ${response.status()}`);
    }

    logger.info(`API request completed with status ${response.status()}`);
    return response;
  }

  /**
   * Fetches ancillaries from the RetrieveSsrListView API for the specified EMD type.
   * @param emdType - EMD type for ancillary retrieval.
   * @returns Parsed JSON response from the API.
   */
  async getAncillariesFromAPI(emdType: string): Promise<Record<string, unknown>> {
    logger.info(`Fetching ancillaries from API for emdType='${emdType}'`);
    const cookiesMap = await this.getCookiesMap();

    const payloadMap = {
      displayOnly: true,
      serviceType: 1,
      journeyID: '',
      isconnectingFligt: false,
      emdType: emdType
    };

    const payload = JSON.stringify(payloadMap);
    logger.info(`API payload: ${payload}`);

    const response = await this.postGetAncillariesAPIAndResponse(cookiesMap, payload);
    const responseData = (await response.json()) as Record<string, unknown>;
    logger.info(`API response parsed successfully: ${JSON.stringify(responseData, null, 2)}`);
    return responseData;
  }

  /**
   * Routes ancillary selection by type to the dedicated handler method.
   * @param ancillaryType - Ancillary category: Baggage, Standalone, NonBaggage, or SSR.
   * @param routeMap - Route key -> passenger entries map for this type.
   * @returns Total ancillary count processed for this type.
   */
  private async selectAncillariesByType(
    ancillaryType: string,
    routeMap: Map<string, Array<{ paxIndex: number; quantity: number; ancillaryCode: string }>>
  ): Promise<number> {
    const normalized = ancillaryType.trim().toLowerCase();
    const emdType = normalized === 'standalone' ? '0' : '1';
    const apiResponse = await this.getAncillariesFromAPI(emdType);
    if (normalized === 'baggage') {
      return await this.addBaggageAncillary(routeMap, apiResponse);
    } else if (normalized === 'standalone') {
      return await this.addStandaloneAncillary(routeMap, apiResponse);
    } else if (normalized === 'nonbaggage') {
      return await this.addNonBaggageAncillary(routeMap, apiResponse);
    } else {
      logger.info(`Processing SSR/other ancillaries for type='${ancillaryType}'`);
      return await this.addAncillaryByRouteMap(ancillaryType, routeMap, apiResponse);
    }
  }

  /**
   * Adds Baggage ancillaries by iterating the route map for Baggage type.
   * @param routeMap - Route key -> passenger entries for Baggage.
   * @returns Total ancillary count added.
   */
  private async addBaggageAncillary(
    routeMap: Map<string, Array<{ paxIndex: number; quantity: number; ancillaryCode: string }>>,
    apiResponse?: Record<string, unknown>
  ): Promise<number> {
    logger.info('Processing Baggage ancillaries');
    return await this.addAncillaryByRouteMap('Baggage', routeMap, apiResponse);
  }

  /**
   * Adds Standalone ancillaries by iterating the route map for Standalone type.
   * @param routeMap - Route key -> passenger entries for Standalone.
   * @returns Total ancillary count added.
   */
  private async addStandaloneAncillary(
    routeMap: Map<string, Array<{ paxIndex: number; quantity: number; ancillaryCode: string }>>,
    apiResponse?: Record<string, unknown>
  ): Promise<number> {
    logger.info('Processing Standalone ancillaries');
    return await this.addAncillaryByRouteMap('Standalone', routeMap, apiResponse);
  }

  /**
   * Adds NonBaggage ancillaries by iterating the route map for NonBaggage type.
   * @param routeMap - Route key -> passenger entries for NonBaggage.
   * @returns Total ancillary count added.
   */
  private async addNonBaggageAncillary(
    routeMap: Map<string, Array<{ paxIndex: number; quantity: number; ancillaryCode: string }>>,
    apiResponse?: Record<string, unknown>
  ): Promise<number> {
    logger.info('Processing NonBaggage ancillaries');
    return await this.addAncillaryByRouteMap('NonBaggage', routeMap, apiResponse);
  }

  // Iterates a route map and selects each ancillary entry by passenger, route, and resolved name
  private async addAncillaryByRouteMap(
    ancillaryType: string,
    routeMap: Map<string, Array<{ paxIndex: number; quantity: number; ancillaryCode: string }>>,
    apiResponse?: Record<string, unknown>
  ): Promise<number> {
    let ancillaryNameToSelect = '';
    let resolvedAncillaryName: string | string[] = '';
    let resolvedAncillaryNameList: string[] = [];
    let count = 0;
    for (const [routeKey, paxEntries] of routeMap.entries()) {
      for (const paxEntry of paxEntries) {
        if (paxEntry.quantity > 0) {
          count += paxEntry.quantity;
        }
        resolvedAncillaryName = this.resolveAncillaryName(ancillaryType, paxEntry.ancillaryCode, apiResponse);
        resolvedAncillaryNameList = Array.isArray(resolvedAncillaryName) ? resolvedAncillaryName : [resolvedAncillaryName];
        ancillaryNameToSelect = resolvedAncillaryNameList[0] ?? paxEntry.ancillaryCode;
        await this.selectAncillaryFromUI(paxEntry.paxIndex, routeKey, ancillaryNameToSelect, paxEntry.quantity);
      }
    }
    return count;
  }

  // Iterates a route map and selects each ancillary by passenger name and flight route details
  private async addAncillaryByRouteMapUsingDetails(
    ancillaryType: string,
    routeMap: Map<string, Array<{ paxIndex: number; quantity: number; ancillaryCode: string }>>,
    passengerDetails: PassengerDetail[],
    flightDetails: FlightDetail[],
    apiResponse?: Record<string, unknown>
  ): Promise<number> {
    let ancillaryNameToSelect = '';
    let resolvedAncillaryName: string | string[] = '';
    let resolvedAncillaryNameList: string[] = [];
    let count = 0;

    for (const [routeKey, paxEntries] of routeMap.entries()) {
      const routeLabelFromFlight = this.resolveRouteLabelFromFlightDetails(routeKey, flightDetails);

      for (const paxEntry of paxEntries) {
        const passengerDetail = passengerDetails[paxEntry.paxIndex];
        resolvedAncillaryName = this.resolveAncillaryName(ancillaryType, paxEntry.ancillaryCode, apiResponse);
        resolvedAncillaryNameList = Array.isArray(resolvedAncillaryName) ? resolvedAncillaryName : [resolvedAncillaryName];
        ancillaryNameToSelect = resolvedAncillaryNameList[0] ?? paxEntry.ancillaryCode;

        if (paxEntry.quantity > 0) {
          count += paxEntry.quantity;
        }

        await this.selectAncillaryFromUIUsingDetails(
          passengerDetail,
          paxEntry.paxIndex,
          routeKey,
          routeLabelFromFlight,
          ancillaryNameToSelect,
          paxEntry.quantity
        );
      }
    }

    return count;
  }

  // Resolves route label from captured flight details using segment key, then falls back to existing route key format
  private resolveRouteLabelFromFlightDetails(routeKey: string, flightDetails: FlightDetail[]): string {
    const normalizedRouteKey = routeKey.replace(/[_\s]/g, '').toLowerCase();
    const segmentMatch = normalizedRouteKey.match(/segment(\d+)/);
    let segmentIndex = 0;

    if (normalizedRouteKey === 'nosegment') {
      return 'No segment (Use for EMD - Standalone)';
    }

    if (!segmentMatch) {
      return '';
    }

    segmentIndex = parseInt(segmentMatch[1], 10) - 1;
    if (segmentIndex < 0 || segmentIndex >= flightDetails.length) {
      return '';
    }

    return flightDetails[segmentIndex]?.route?.trim() ?? '';
  }

  // Selects passenger by name from dropdown when available; falls back to pax index selection
  private async selectPassengerByDetails(passengerDetail: PassengerDetail | undefined, paxIndex: number): Promise<void> {
    const firstName = passengerDetail?.firstName?.trim() ?? '';
    const lastName = passengerDetail?.lastName?.trim() ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    let selectedByName = false;

    if (!fullName) {
      await this.selectPassengerFromDropdown(paxIndex);
      return;
    }

    await this.waitForElement(this.passengerDropdown, 'visible');
    const optionElements = this.passengerDropdown.locator('option');
    const optionCount = await optionElements.count();

    for (let i = 0; i < optionCount; i++) {
      const optionText = ((await optionElements.nth(i).innerText().catch(() => '')) || '').trim().toLowerCase();
      if (optionText.includes(firstName.toLowerCase()) && optionText.includes(lastName.toLowerCase())) {
        await this.passengerDropdown.selectOption({ index: i });
        selectedByName = true;
        logger.info(`Passenger selected by name '${fullName}' at dropdown index ${i}`);
        break;
      }
    }

    if (!selectedByName) {
      logger.warn(`Passenger '${fullName}' not found in dropdown; falling back to paxIndex=${paxIndex}`);
      await this.selectPassengerFromDropdown(paxIndex);
    }
  }

  // Selects ancillary by passenger details and route details, then adds to cart
  private async selectAncillaryFromUIUsingDetails(
    passengerDetail: PassengerDetail | undefined,
    paxIndex: number,
    routeKey: string,
    routeLabelFromFlight: string,
    ancillaryName: string,
    quantity: number
  ): Promise<void> {
    logger.info(`Selecting ancillary by details: ancillary='${ancillaryName}', routeKey='${routeKey}', routeLabel='${routeLabelFromFlight}', paxId=${paxIndex+1}, quantity=${quantity}`);

    if (quantity <= 0) {
      logger.info('Quantity is 0; skipping ancillary selection action');
      return;
    }

    for (let i = 0; i < quantity; i++) {
      await this.selectPassengerByDetails(passengerDetail, paxIndex);

      if (routeLabelFromFlight.trim() !== '') {
        try {
          await this.selectRoute(routeLabelFromFlight);
        } catch (error) {
          logger.warn(`Route selection by flight label failed ('${routeLabelFromFlight}'), falling back to route key '${routeKey}': ${error}`);
          await this.selectRouteFromKey(routeKey);
        }
      } else {
        await this.selectRouteFromKey(routeKey);
      }

      await this.selectAncillaryName(ancillaryName);
      await this.addCommentByPencilIcon(ancillaryName);
      await this.click(this.addAncillaryToCartButton);
      await this.sleep(TIMEOUT);
      logger.info(`Ancillary selection ${i + 1}/${quantity} completed`);
    }

    logger.info('Ancillary selection by details completed');
  }

  /**
   * Resolves the UI ancillary service name from the ancillary type and code.
    * API mappings: Baggage/Stand → standard list, Baggage/NonStand → non-standard list,
    * NonBaggage → filtered list, Standalone → standalone list, SSR/other → generic fallback.
   * @param ancillaryType - Ancillary category: Baggage, NonBaggage, Standalone, or SSR.
   * @param ancillaryCode - Code from test data entry, e.g. Stand, NonStand, P.
   * @param apiResponse - Optional ancillary API response object containing serviceList data.
   * @returns Resolved UI display name for the ancillary service, or a list for non-baggage ancillary type.
   */
  private resolveAncillaryName(
    ancillaryType: string,
    ancillaryCode: string,
    apiResponse?: Record<string, unknown>
  ): string | string[] {
    const type = ancillaryType.trim().toLowerCase();
    const code = ancillaryCode.trim().toLowerCase();
    const configuredBaggageType = this.ancillaryCodeConfig.baggageAncillaryCode.trim().toLowerCase();
    const configuredBundleType = this.ancillaryCodeConfig.bundleAncillaryCode.trim().toLowerCase();
    const configuredStandardCode = this.ancillaryCodeConfig.standardAncillaryCode.trim().toLowerCase();
    const configuredNonStandardCode = this.ancillaryCodeConfig.nonStandardAncillaryCode.trim().toLowerCase();
    const configuredNonBaggageCode = this.ancillaryCodeConfig.nonBaggageAncillaryCode.trim().toLowerCase();
    const configuredBaggageGroupDescription = this.ancillaryCodeConfig.baggageGroupDescription.trim().toLowerCase();
    const configuredNonStandardServiceInvGroup = this.ancillaryCodeConfig.nonStandardServiceInvGroup.trim().toLowerCase();
    const excludedNonBaggageGroups = this.ancillaryCodeConfig.excludedNonBaggageGroups;
    const excludedNonBaggageGroupsSet = new Set(excludedNonBaggageGroups.map((group) => group.trim().toLowerCase()));
    const serviceList = (apiResponse?.serviceList as Array<Record<string, unknown>> | undefined) ?? [];
    const standaloneAncillaryList: string[] = serviceList
      .filter((item) => item.EmdTypeStandAlone === true && item.IsInventoryControlled === true)
      .map((item) => String(item.DescriptionWithPrice ?? '').trim())
      .filter((item) => item !== '');
    logger.info(`standalone ancillary list=${JSON.stringify(standaloneAncillaryList)}`);
    const nonStandardAncillaryList: string[] = serviceList
      .filter((item) =>
        String(item.GroupDescription ?? '').trim().toLowerCase() === configuredBaggageGroupDescription &&
        item.IsInventoryControlled === false &&
        String(item.ServiceInvGroup ?? '').trim().toLowerCase() === configuredNonStandardServiceInvGroup
      )
      .map((item) => String(item.Description ?? '').trim())
      .filter((item) => item !== '');
    logger.info(`non-standard ancillary list=${JSON.stringify(nonStandardAncillaryList)}`);
    const standardAncillaryList: string[] = serviceList
      .filter((item) =>
        String(item.GroupDescription ?? '').trim().toLowerCase() === configuredBaggageGroupDescription &&
        item.IsInventoryControlled === false &&
        String(item.ServiceInvGroup ?? '').trim().toLowerCase() !== configuredNonStandardServiceInvGroup
      )
      .map((item) => String(item.Description ?? '').trim())
      .filter((item) => item !== '');
    logger.info(`standard ancillary list=${JSON.stringify(standardAncillaryList)}`);
    const nonBaggageAncillaryList: string[] = serviceList
      .filter((item) =>
        !excludedNonBaggageGroupsSet.has(String(item.GroupDescription ?? '').trim().toLowerCase()) &&
        item.IsInventoryControlled === false &&
        String(item.AncillaryUnitPrice ?? '') !== '0.00'
      )
      .map((item) => String(item.DescriptionWithPrice ?? '').trim())
      .filter((item) => item !== '');
    logger.info(`non-baggage ancillary list=${JSON.stringify(nonBaggageAncillaryList)}`);

    if (type === 'baggage' || type === configuredBaggageType) {
      if (code === configuredStandardCode) {
        return standardAncillaryList[0] ?? ancillaryCode;
      }
      if (code === configuredNonStandardCode) {
        return nonStandardAncillaryList[0] ?? ancillaryCode;
      }
    } else if (type === 'nonbaggage') {
      if (configuredNonBaggageCode !== '' && code !== configuredNonBaggageCode) {
        logger.warn(`Ancillary code '${ancillaryCode}' is not configured non-baggage code '${this.ancillaryCodeConfig.nonBaggageAncillaryCode}'`);
      }
      logger.info(`Resolved non-baggage ancillary list count=${nonBaggageAncillaryList.length}`);
      return nonBaggageAncillaryList;
    } else if (type === 'standalone' || type === configuredBundleType) {
      logger.info(`Resolved standalone ancillary list count=${standaloneAncillaryList.length}`);
      return standaloneAncillaryList[0] ?? ancillaryCode;
    }
    logger.warn(`No hardcoded mapping for type='${ancillaryType}' code='${ancillaryCode}'; using code as name`);
    return ancillaryCode;
  }

  /**
   * Opens ancillary selection from the reservation flow using the Add Serv control.
   */
  async clickAddServButton(): Promise<void> {
    logger.info('Clicking Add Serv button');
    await this.click(this.addServButton);
    await this.sleep(TIMEOUT);
    logger.info('Add Serv button clicked');
  }

  /**
   * Selects a route value in the ancillary route dropdown.
   * Uses flexible matching so both "BEG-IST" and "BEG - IST" style labels are handled.
   * @param routeLabel - Dropdown label, for example 'Segment 1' or 'No Segment'.
   */
  async selectRoute(routeLabel: string): Promise<void> {
    const normalizedRouteLabel = routeLabel.trim();
    const compactRouteLabel = normalizedRouteLabel.replace(/\s*-\s*/g, '-');
    const spacedRouteLabel = compactRouteLabel.replace('-', ' - ');
    const dropdownLocator = await this.getActiveRouteDropdown();
    const optionElements = dropdownLocator.locator('option');
    const optionCount = await optionElements.count();
    let selected = false;

    logger.info(`Selecting ancillary route: ${normalizedRouteLabel}`);

    if (optionCount > 0) {
      for (let i = 0; i < optionCount; i++) {
        const optionText = ((await optionElements.nth(i).innerText().catch(() => '')) || '').trim();
        const optionCompact = optionText.replace(/\s*-\s*/g, '-').toLowerCase();
        const targetCompact = compactRouteLabel.toLowerCase();

        if (
          optionCompact === targetCompact ||
          optionCompact.includes(targetCompact) ||
          targetCompact.includes(optionCompact)
        ) {
          await dropdownLocator.selectOption({ index: i });
          logger.info(`Ancillary route selected by option match: '${optionText}'`);
          selected = true;
          break;
        }
      }
    }

    if (!selected) {
      await this.selectValueFromDropdown(dropdownLocator, spacedRouteLabel);
      logger.info(`Ancillary route selected by label fallback: '${spacedRouteLabel}'`);
    }

    await this.sleep(TIMEOUT);
  }

  /**
   * Maps route keys from test data and selects the matching route option.
   * @param routeKey - Route key from test data, for example 'Segment_1' or 'No_Segment'.
   */
  async selectRouteFromKey(routeKey: string): Promise<void> {
    logger.info(`Selecting route from key: ${routeKey}`);
    const routeLabel = await this.resolveRouteLabelFromKey(routeKey);
    await this.selectRoute(routeLabel);
  }

  // Returns the visible route dropdown (primary or fallback)
  private async getActiveRouteDropdown(): Promise<Locator> {
    const primaryVisible = await this.routeDropdown.isVisible().catch(() => false);
    if (primaryVisible) {
      return this.routeDropdown;
    }

    const fallbackVisible = await this.routeDropdownFallback.isVisible().catch(() => false);
    if (fallbackVisible) {
      return this.routeDropdownFallback;
    }

    if (await this.routeDropdown.count()) {
      return this.routeDropdown;
    }

    return this.routeDropdownFallback;
  }

  /**
   * Selects the target passenger in ancillary section by passenger index.
   * @param paxIndex - Passenger index (0-based) where PAX1 = 0.
   */
  async selectPassengerFromDropdown(paxIndex: number): Promise<void> {
    logger.info(`Selecting ancillary passenger index: ${paxIndex}`);
    await this.waitForElement(this.passengerDropdown, 'visible');
    const optionCount = await this.passengerDropdown.locator('option').count();
    if (optionCount <= paxIndex + 1) {
      throw new Error(`Passenger dropdown has ${optionCount} options but paxIndex ${paxIndex} requested (index ${paxIndex + 1})`);
    }
    await this.passengerDropdown.selectOption({ index: paxIndex + 1 });
    logger.info(`Ancillary passenger selected: ${paxIndex}`);
  }

  /**
   * Selects ancillary by passenger and route, adds comment in details modal, and adds to cart.
   * @param paxIndex - Passenger index (0-based).
   * @param routeKey - Route key from test data, for example 'Segment_1' or 'No_Segment'.
   * @param ancillaryName - Ancillary display name, for example 'PRIORITY BOARDING'.
   * @param quantity - Number of ancillary additions.
   */
  private async selectAncillaryFromUI(
    paxIndex: number,
    routeKey: string,
    ancillaryName: string,
    quantity: number
  ): Promise<void> {
    logger.info(`Selecting ancillary='${ancillaryName}', routeKey='${routeKey}', paxIndex=${paxIndex}, quantity=${quantity}`);

    if (quantity <= 0) {
      logger.info('Quantity is 0; skipping ancillary selection action');
      return;
    }

    for (let i = 0; i < quantity; i++) {
      await this.selectPassengerFromDropdown(paxIndex);
      await this.selectRouteFromKey(routeKey);
      await this.selectAncillaryName(ancillaryName);
      await this.addCommentByPencilIcon(ancillaryName);
      await this.click(this.addAncillaryToCartButton);
      await this.sleep(TIMEOUT);
      logger.info(`Ancillary selection ${i + 1}/${quantity} completed`);
    }

    logger.info('Ancillary selection action completed');
  }

  /**
   * Selects ancillary service from the service autosuggest control.
   * Fills the search field, clicks the search button, and selects the matching suggestion.
   * @param ancillaryName - Ancillary display name to search and select.
   */
  async selectAncillaryName(ancillaryName: string): Promise<void> {
    logger.info(`Selecting ancillary name from service search: ${ancillaryName}`);
    if (!await this.serviceSearchInput.count()) {
      throw new Error(`Service search input (#tbxService) not found on page`);
    }
    await this.fill(this.serviceSearchInput, ancillaryName);
    if (await this.serviceSearchButton.count()) {
      await this.click(this.serviceSearchButton);
    }
    await this.sleep(1500);

    const suggestionCount = await this.serviceSuggestions.count();
    if (suggestionCount === 0) {
      logger.warn(`No suggestion list found for '${ancillaryName}', proceeding with typed value`);
      return;
    }

    const matchingSuggestion = this.serviceSuggestions.filter({ hasText: ancillaryName }).first();
    if (await matchingSuggestion.count()) {
      await this.click(matchingSuggestion);
      logger.info(`Selected ancillary suggestion: ${ancillaryName}`);
      return;
    }

    logger.warn(`No matching suggestion for '${ancillaryName}'; selecting first suggestion`);
    await this.click(this.serviceSuggestions.first());
    logger.info(`Ancillary name selection completed: ${ancillaryName}`);
  }

  /**
   * Opens the details modal for an ancillary row, adds a comment, and saves.
   * @param ancillaryName - Ancillary display name used to locate the correct row.
   */
  async addCommentByPencilIcon(ancillaryName: string): Promise<void> {
    try {
      logger.info(`Adding comment for ancillary '${ancillaryName}'`);
      await this.clickOnPencilIcon(ancillaryName);
      await this.fillCommentAndSave();
      logger.info(`Comment added for ancillary '${ancillaryName}'`);
    } catch (e) {
      logger.error(`Failed to add comment for ancillary '${ancillaryName}': ${e instanceof Error ? e.message : e}`);
    }

  }

  // Clicks the pencil/add icon on the ancillary row if visible; skips silently if no icon is present
  private async clickOnPencilIcon(ancillaryName: string): Promise<void> {
    await this.sleep(TIMEOUT);
    await this.click(this.plusIcon.filter({ visible: true }).first());
    logger.info(`Clicked On pencil/add icon for ancillary '${ancillaryName}'`);
  }

  // Fills comment textarea with sanitized text and clicks save
  private async fillCommentAndSave(): Promise<void> {
    await this.sleep(TIMEOUT);
    const commentText = `${faker.lorem.sentence()}`.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    logger.info(`Entering comment: '${commentText}'`);
    await this.fill(this.ancillaryCommentTextArea, commentText);
    await this.click(this.ancillaryDetailsSaveButton);
    await this.sleep(TIMEOUT);
  }

  /**
   * Resolves route option label from route key using current dropdown options.
   * @param routeKey - Route key from test data.
   * @returns Resolved dropdown label.
   */
  async resolveRouteLabelFromKey(routeKey: string): Promise<string> {
    const normalized = routeKey.trim().toLowerCase();

    if (normalized === 'nosegment') {
      return 'No segment (Use for EMD - Standalone)';
    }

    const match = normalized.match(/segment(\d+)/);
    if (match) {
      const segmentIndex = parseInt(match[1], 10);
      await this.waitForElement(this.routeDropdown, 'visible');
      // Wait for KnockoutJS to populate segment options after dropdown becomes visible
      await this.sleep(2000);
      const optionCount = await this.routeDropdown.locator('option').count();
      if (optionCount <= segmentIndex + 1) {
        logger.warn(`Route dropdown has ${optionCount} options but segment ${segmentIndex} requested`);
        return routeKey.replace(/([a-z])([A-Z])/g, '$1 $2');
      }

      const options = await this.routeDropdown.locator('option').allInnerTexts().catch(() => []);
      const filteredOptions = options.map((value) => value.trim()).filter((value) =>
        value !== '' &&
        !value.toLowerCase().includes('all segments') &&
        !value.toLowerCase().includes('no segment')
      );

      if (segmentIndex > 0 && segmentIndex <= filteredOptions.length) {
        return filteredOptions[segmentIndex - 1];
      }
    }

    return routeKey.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  /**
   * Reads all rows from the Assigned Services grid and returns ancillary details with total.
   * Captures ancillary name, price, passenger, and segment from each assigned service row.
   * @returns Map with 'services' (array of {ancillaryName, price, passenger, segment}) and 'totalNewCharges' (string).
   */
  async getAssignedServiceDetails(): Promise<Map<string, unknown>> {
    logger.info('Reading assigned service details from grid');
    const result = new Map<string, unknown>();
    const services: Array<{ ancillaryName: string; price: string; passenger: string; segment: string }> = [];

    const rowCount = await this.assignedServiceRows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = this.assignedServiceRows.nth(i);
      const passenger = (await row.locator('td:nth-child(3)').innerText()).trim();
      const segment = (await row.locator('td:nth-child(4)').innerText()).trim();
      const ancillaryName = (await row.locator('td:nth-child(7)').innerText()).trim();
      const price = (await row.locator('td:nth-child(10)').innerText()).trim();
      services.push({ ancillaryName, price, passenger, segment });
      logger.info(`Row ${i + 1}: ancillary='${ancillaryName}', price='${price}', passenger='${passenger}', segment='${segment}'`);
    }

    const totalText = await this.totalNewCharges.innerText();
    result.set('services', services);
    result.set('totalNewCharges', totalText.trim());
    logger.info(`Assigned services count=${services.length}, totalNewCharges='${totalText.trim()}'`);
    return result;
  }

  /**
   * Saves ancillary selections and continues to the next flow step.
   * Clicks Accept (#btnAcceptAddSsrtoApiCart) then Continue (#btnResAddSsrModalContinue).
   */
  async clickOnAcceptAndContinue(): Promise<void> {
    logger.info('Clicking Accept button to confirm ancillary selections');
    await this.click(this.acceptButton);
    await this.sleep(TIMEOUT);
    logger.info('Clicking Continue button');
    await this.click(this.continueButton);
    await this.sleep(TIMEOUT);
    logger.info('Ancillary selections confirmed and continued');
  }

  /**
   * Returns selected ancillary count from selected rows or summary fallback.
   * @returns Selected ancillary count value.
   */
  async getSelectedAncillaryCount(): Promise<number> {
    logger.info('Reading selected ancillary count');

    const selectedCount = await this.selectedAncillaryItems.count();
    if (selectedCount > 0) {
      logger.info(`Selected ancillary count from selected rows: ${selectedCount}`);
      return selectedCount;
    }

    const summary = await this.getSelectedAncillarySummaryText();
    const summaryCountMatch = summary.match(/(\d+)/);
    const parsedCount = summaryCountMatch ? parseInt(summaryCountMatch[1], 10) : 0;
    logger.info(`Selected ancillary count from summary: ${parsedCount}`);
    return parsedCount;
  }

  /**
   * Reads selected ancillary summary text from the ancillary section.
   * Falls back to panel text or row count summary if dedicated summary element is absent.
   * @returns Summary text value used for ancillary validation.
   */
  async getSelectedAncillarySummaryText(): Promise<string> {
    logger.info('Reading ancillary summary text');

    if (await this.ancillarySummaryText.count()) {
      const summaryText = (await this.ancillarySummaryText.innerText()).trim();
      logger.info(`Ancillary summary text: ${summaryText}`);
      return summaryText;
    }

    try {
      if (await this.ancillaryPanel.count()) {
        const panelText = (await this.ancillaryPanel.innerText()).trim();
        if (panelText) {
          logger.info('Using ancillary panel text as summary fallback');
          return panelText;
        }
      }
    } catch (e) {
      logger.warn('Ancillary panel text read failed; falling back to row count summary');
    }

    const rowCount = await this.retrievedOfferRows.count();
    const fallbackSummary = rowCount > 0 ? `${rowCount} ancillary row(s) present` : '';
    logger.info(`Ancillary summary from row count fallback: '${fallbackSummary}'`);
    return fallbackSummary;
  }
}
