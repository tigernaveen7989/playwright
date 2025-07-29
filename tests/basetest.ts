import { Browser, BrowserContext, Page, chromium, firefox, webkit } from '@playwright/test';
import LoginPage from '../pageobjects/loginpage';
import HomePage from '../pageobjects/homepage';
import * as fs from 'fs';
import * as path from 'path'


export default class BaseTest {
  private browser!: Browser;
  protected context!: BrowserContext;
  protected page!: Page;
  public loginPage!: LoginPage;
  public homePage!: HomePage;


  async setup(browserName: string): Promise<Page> {
    // Launch the selected browser
    switch (browserName) {
      case 'firefox':
        this.browser = await firefox.launch();
        break;
      case 'webkit':
        this.browser = await webkit.launch();
        break;
      case 'chromium':
      default:
        this.browser = await chromium.launch();
        break;
    }

    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    // Navigate to login page
    await this.page.goto('https://callcenter-ju-ut1.sabre.com/Login');

    // Initialize Page Objects
    this.loginPage = new LoginPage(this.page);
    this.homePage = new HomePage(this.page);

    return this.page;
  }

  async teardown(): Promise<void> {
    await this.browser.close();
    //BaseTest.copyEnvToAllureProperties();
  }



  static copyEnvToAllureProperties(envPath = 'environment.env', allureDir = 'allure-results') {
    const envFilePath = path.resolve(envPath);
    const allureResultsPath = path.resolve(allureDir, 'environment.properties');

    // Ensure the source file exists
    if (!fs.existsSync(envFilePath)) {
      throw new Error(`Environment file not found at: ${envFilePath}`);
    }

    // Ensure the allure-results directory exists
    if (!fs.existsSync(allureDir)) {
      fs.mkdirSync(allureDir, { recursive: true });
    }

    // Read and copy the content
    const content = fs.readFileSync(envFilePath, 'utf-8');
    fs.writeFileSync(allureResultsPath, content);

    console.log(`Copied ${envPath} to ${allureResultsPath}`);
  }
}
