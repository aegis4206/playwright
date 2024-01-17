const moment = require('moment');
const { chromium } = require('playwright')

const start = async () => {
    const browser = await chromium.launch();

    const page = await browser.newPage();
    await page.goto('https://www.google.com');
    await page.screenshot({
        path: `${moment().format("yyyyMMDD")}_snap.png`
    });
    await browser.close();
    console.log("done")
}

start();