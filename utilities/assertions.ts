import { expect, Locator, Page } from '@playwright/test';
import { attachment, step } from 'allure-js-commons';
import { LoggerFactory } from '../utilities/logger';
const logger = LoggerFactory.getLogger(__filename);

export class Assertions {

    private async logStep(
        stepName: string,
        expected: any,
        actual: any,
        message: string | undefined,
        assertionFn: () => Promise<void>
    ) {
        const expectedValue = JSON.stringify(expected, null, 2);
        const actualValue = JSON.stringify(actual, null, 2);

        await step(`${message}`, async () => {
            //perform assertion
            await assertionFn();

            await step(`Actual   : ${actualValue}`, async () => {
                // Do nothing — this step just shows the values
            });

            await step(`Expected : ${expectedValue}`, async () => {
                // Do nothing — this step just shows the values
            });
        });
    }

    async toBe(actual: any, expected: any, message?: string) {
        await this.logStep('toBe', expected, actual, message, async () => {
            expect(actual, message).toBe(expected);
        });
    }

    async notToBe(actual: any, expected: any, message?: string) {
        await this.logStep('notToBe', expected, actual, message, async () => {
            expect(actual, message).not.toBe(expected);
        });
    }

    async toEqual(actual: any, expected: any, message?: string) {
        await this.logStep('toEqual', expected, actual, message, async () => {
            expect(actual, message).toEqual(expected);
        });
    }

    async notToEqual(actual: any, expected: any, message?: string) {
        await this.logStep('notToEqual', expected, actual, message, async () => {
            expect(actual, message).not.toEqual(expected);
        });
    }

    async toContain(actual: string | any[], expected: any, message?: string) {
        await this.logStep('toContain', expected, actual, message, async () => {
            expect(actual, message).toContain(expected);
        });
    }

    async notToContain(actual: string | any[], expected: any, message?: string) {
        await this.logStep('notToContain', expected, actual, message, async () => {
            expect(actual, message).not.toContain(expected);
        });
    }

    async toBeTruthy(actual: any, message?: string) {
        await this.logStep('toBeTruthy', true, actual, message, async () => {
            expect(actual, message).toBeTruthy();
        });
    }

    async toBeFalsy(actual: any, message?: string) {
        await this.logStep('toBeFalsy', false, actual, message, async () => {
            expect(actual, message).toBeFalsy();
        });
    }

    async toBeNull(actual: any, message?: string) {
        await this.logStep('toBeNull', null, actual, message, async () => {
            expect(actual, message).toBeNull();
        });
    }

    async toBeDefined(actual: any, message?: string) {
        await this.logStep('toBeDefined', 'defined', actual, message, async () => {
            expect(actual, message).toBeDefined();
        });
    }

    async toBeUndefined(actual: any, message?: string) {
        await this.logStep('toBeUndefined', 'undefined', actual, message, async () => {
            expect(actual, message).toBeUndefined();
        });
    }

    async toBeGreaterThan(actual: number, expected: number, message?: string) {
        await this.logStep('toBeGreaterThan', `> ${expected}`, actual, message, async () => {
            expect(actual, message).toBeGreaterThan(expected);
        });
    }

    async toBeGreaterThanOrEqual(actual: number, expected: number, message?: string) {
        await this.logStep('toBeGreaterThanOrEqual', `>= ${expected}`, actual, message, async () => {
            expect(actual, message).toBeGreaterThanOrEqual(expected);
        });
    }

    async toBeLessThan(actual: number, expected: number, message?: string) {
        await this.logStep('toBeLessThan', `< ${expected}`, actual, message, async () => {
            expect(actual, message).toBeLessThan(expected);
        });
    }

    async toBeLessThanOrEqual(actual: number, expected: number, message?: string) {
        await this.logStep('toBeLessThanOrEqual', `<= ${expected}`, actual, message, async () => {
            expect(actual, message).toBeLessThanOrEqual(expected);
        });
    }

    async toMatch(actual: string, regex: RegExp | string, message?: string) {
        await this.logStep('toMatch', regex, actual, message, async () => {
            expect(actual, message).toMatch(regex);
        });
    }

    async notToMatch(actual: string, regex: RegExp | string, message?: string) {
        await this.logStep('notToMatch', regex, actual, message, async () => {
            expect(actual, message).not.toMatch(regex);
        });
    }

    async toHaveLength(actual: any[], expectedLength: number, message?: string) {
        await this.logStep('toHaveLength', expectedLength, actual.length, message, async () => {
            expect(actual, message).toHaveLength(expectedLength);
        });
    }

    async toHaveCount(locator: Locator, expectedCount: number, message?: string) {
        const actualCount = await locator.count();
        await this.logStep('toHaveCount', expectedCount, actualCount, message, async () => {
            await expect(locator, message).toHaveCount(expectedCount);
        });
    }

    async toBeVisible(locator: Locator, message?: string) {
        const actual = await locator.isVisible();
        await this.logStep('toBeVisible', true, actual, message, async () => {
            await expect(locator, message).toBeVisible();
        });
    }

    async toBeHidden(locator: Locator, message?: string) {
        const actual = await locator.isHidden();
        await this.logStep('toBeHidden', true, actual, message, async () => {
            await expect(locator, message).toBeHidden();
        });
    }

    async toBeEnabled(locator: Locator, message?: string) {
        const actual = await locator.isEnabled();
        await this.logStep('toBeEnabled', true, actual, message, async () => {
            await expect(locator, message).toBeEnabled();
        });
    }

    async toBeDisabled(locator: Locator, message?: string) {
        const actual = await locator.isDisabled();
        await this.logStep('toBeDisabled', true, actual, message, async () => {
            await expect(locator, message).toBeDisabled();
        });
    }

    async toBeEditable(locator: Locator, message?: string) {
        const actual = await locator.isEditable();
        await this.logStep('toBeEditable', true, actual, message, async () => {
            await expect(locator, message).toBeEditable();
        });
    }

    async toBeEmpty(actual: string, message?: string) {
        const value = actual?.trim() ?? '';
        await this.logStep('toBeEmptyString', '', value, message, async () => {
            expect(value, message).toBe('');
        });
    }

    async toHaveText(locator: Locator, expected: string | RegExp, message?: string) {
        const actual = await locator.textContent();
        await this.logStep('toHaveText', expected, actual, message, async () => {
            await expect(locator, message).toHaveText(expected);
        });
    }

    async toContainText(locator: Locator, expected: string | RegExp, message?: string) {
        const actual = await locator.textContent();
        await this.logStep('toContainText', expected, actual, message, async () => {
            await expect(locator, message).toContainText(expected);
        });
    }

    async toHaveValue(locator: Locator, expected: string | RegExp, message?: string) {
        const actual = await locator.inputValue();
        await this.logStep('toHaveValue', expected, actual, message, async () => {
            await expect(locator, message).toHaveValue(expected);
        });
    }

    async toHaveAttribute(locator: Locator, name: string, value: string | RegExp, message?: string) {
        const actual = await locator.getAttribute(name);
        await this.logStep('toHaveAttribute', value, actual, message, async () => {
            await expect(locator, message).toHaveAttribute(name, value);
        });
    }

    async toHaveClass(locator: Locator, expected: string | RegExp, message?: string) {
        const actual = await locator.getAttribute('class');
        await this.logStep('toHaveClass', expected, actual, message, async () => {
            await expect(locator, message).toHaveClass(expected);
        });
    }

    async toHaveId(locator: Locator, expected: string | RegExp, message?: string) {
        const actual = await locator.getAttribute('id');
        await this.logStep('toHaveId', expected, actual, message, async () => {
            await expect(locator, message).toHaveId(expected);
        });
    }

    async toHaveTitle(page: Page, expected: string | RegExp, message?: string) {
        const actual = await page.title();
        await this.logStep('toHaveTitle', expected, actual, message, async () => {
            await expect(page, message).toHaveTitle(expected);
        });
    }

    async toHaveURL(page: Page, expected: string | RegExp, message?: string) {
        const actual = page.url();
        await this.logStep('toHaveURL', expected, actual, message, async () => {
            await expect(page, message).toHaveURL(expected);
        });
    }

    async toHaveScreenshot(locator: Locator, options?: any) {
        await this.logStep('toHaveScreenshot', 'screenshot', 'captured', 'Validate screenshot', async () => {
            await expect(locator).toHaveScreenshot(options);
        });
    }

    async toHaveJSProperty(locator: Locator, name: string, value: any, message?: string) {
        const actual = await locator.evaluate((el: any) => el[name]);
        await this.logStep('toHaveJSProperty', value, actual, message, async () => {
            await expect(locator, message).toHaveJSProperty(name, value);
        });
    }


    async notToBeNull(actual: any, message?: string) {
        await this.logStep('notToBeNull', null, actual, message, async () => {
            expect(actual, message).not.toBeNull();
        });
    }

    async toStrictEqual(actual: any, expected: any, message?: string) {
        await this.logStep('toStrictEqual', expected, actual, message, async () => {
            expect(actual, message).toStrictEqual(expected);
        });
    }
}

