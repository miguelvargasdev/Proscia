// To run the script 
// node index.js [sheets id] [qualio username] [qualio password]

// Pulls training data from Qualio and drops it into a google sheets page
// Requires google service account credentials

const puppeteer = require('puppeteer');
const {
  authenticate,
  getSheet,
  getCellValues,
  updateCellValues,
  addSheet
} = require('./googleSheetsService.js');

const spreadsheetId = process.argv[2];

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  let groups = {};

  await page.goto('https://app.qualio.com/');

  await page.setViewport({ width: 1080, height: 1024 });

  await login(page);
  console.log("Moving to Overall Training");

  await gatherTrainingData(page);
})();

async function login(page) {
  // input email address
  const EMAILADDRESS = process.argv[3];
  const PASS = process.argv[4];
  await page.waitForSelector("#input-email");
  await page.type('#input-email', EMAILADDRESS);
  await page.type('#input-password', PASS);

  await page.click('#login-btn');
  ///wait browser.close();
}

async function gatherTrainingData(page) {
  const overallTrainingSelector = "#header > navigation-menu-container > nav > div > div.navbar-collapse.collapse > ul:nth-child(1) > li.nav-training.dropdown.open > ul > li:nth-child(1) > a";
  const navTrainingSelector = "#navigation-menu-training";
  const currentSheets = [];

  await moveToOverallTraining();

  const groupData = await extractGroupData();

  for (const group of groupData) {
    const groupName = group.groupName;
    const memberData = group.memberData;

    if (!currentSheets.includes(groupName)) {
      await createGroupSheet(groupName);
      currentSheets.push(groupName);
    }
    await updateGroupDataToSheet(groupName, memberData);
  }

  async function moveToOverallTraining() {
    await page.waitForSelector(navTrainingSelector);
    await page.click(navTrainingSelector);
    await page.waitForSelector(overallTrainingSelector);
    await page.click(overallTrainingSelector);
  }

  async function extractGroupData() {
    const groupBtnSelector = "body > div.noSideNavBodyContainer.ng-scope > span > div > div > div:nth-child(2) > div > div.colored-tab-container.ng-isolate-scope > ul > li:nth-child(2) > a";
    const groupNameSelector = 'td:nth-of-type(1)';
    const groupBodySelector = 'body > div.noSideNavBodyContainer.ng-scope > span > div > div > div:nth-child(2) > div > div.colored-tab-container.ng-isolate-scope > div > div.tab-pane.ng-scope.active > training-dashboard-groups-tab-container > div > div:nth-child(2) > div > div > div > div > table > tbody:nth-child(2) tr';
    const memberBodySelector = "body > div.noSideNavBodyContainer.ng-scope > span > div > div > div:nth-child(2) > div > group-training-dashboard > div > div.colored-box-outer > div > div > div > div:nth-child(2) > div > div > div > div > table > tbody:nth-child(2)";
    const groupData = [];

    await page.waitForSelector(groupBtnSelector);
    await page.click(groupBtnSelector);

    await page.waitForSelector('text/RAQA', { visible: true });

    let rows = await page.$$(groupBodySelector);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      await row.click();
      await page.waitForSelector(memberBodySelector, { visible: true });

      const groupName = await row.$eval(groupNameSelector, element => element.textContent);
      const individualGroupData = await extractTableData(memberBodySelector);
      individualGroupData.unshift(["Name", "Overdue", "Assigned"]);

      groupData.push({ groupName: groupName, memberData: individualGroupData });
      await page.waitForSelector('body > div.noSideNavBodyContainer.ng-scope > span > div > div > div:nth-child(2) > div > group-training-dashboard > div > ul > li:nth-child(1) > a');
      await page.click('body > div.noSideNavBodyContainer.ng-scope > span > div > div > div:nth-child(2) > div > group-training-dashboard > div > ul > li:nth-child(1) > a');
      await page.waitForSelector('text/RAQA', { visible: true });
      rows = await page.$$(groupBodySelector);
    }
    return groupData;
  }

  async function extractTableData(bodySelector) {
    const rows = await page.$$(bodySelector);
    const data = [];

    for (const row of rows) {
      const columns = await row.$$("td");
      const rowData = [];


      for (const column of columns) {
        const columnTextContent = await column.evaluate((element) => element.textContent.trim());
        rowData.push(columnTextContent);
      }



      for (let i = 0; i < rowData.length; i += 4) {
        data.push(rowData.slice(i, i + 4));
      }

    }
    for (let i = 0; i < data.length; i++) {
      data[i][1] = parseInt(data[i][1]);
      data[i][2] = parseInt(data[i][2]);
    }
    console.log(data[0][3]);
    return data;
  }

  async function createGroupSheet(groupName) {
    const auth = await authenticate();
    try {
      const response = await addSheet({
        spreadsheetId,
        auth,
        title: groupName,
      });
      console.log("Sheet Created");
    } catch (error) {
      console.log("Sheet already exists, creation not needed");
    }
  }

  async function updateGroupDataToSheet(groupName, memberData) {
    const startingPoint = `${groupName}!A1`;
    const auth = await authenticate();
    const response = await updateCellValues({
      spreadsheetId,
      range: startingPoint,
      valueInputOption: "RAW",
      _values: memberData,
      auth,
    });
  }
}



