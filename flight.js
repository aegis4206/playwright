const { chromium } = require('playwright');
const moment = require('moment')

async function scrapeLotteryInfo(body, ws) {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const callbackFn = {
        timeout: 10000,
        callback: async () => {
            await browser.close();
            throw new Error('Terminating inner function');
        }
    };

    const { goDate, returnDate, forward, back } = JSON.parse(body);
    console.log(goDate, returnDate, forward, back);

    let searchDate = moment(goDate).add(2, 'day').format('yyyy-MM-DD')
    const searchDateList = []

    const sendData = {
        goDateList: [],
        returnDateList: [],
        complete: false
    }

    while (moment(searchDate) <= moment(returnDate).add(2, 'day')) {
        searchDateList.push(searchDate)
        searchDate = moment(searchDate).add(5, 'day').format('yyyy-MM-DD')
    }

    for (const d of searchDateList) {
        // 前往目標網站
        await page.goto(`https://booking.tigerairtw.com/zh-TW/index?type=roundTrip&outbound=${forward}-${back}&inbound=${back}-${forward}&departureDate=${d}&returnDate=${d}&adult=1&children=0&infant=0&promoCode=&currencyCode=TWD`);
        console.log(`https://booking.tigerairtw.com/zh-TW/index?type=roundTrip&outbound=${forward}-${back}&inbound=${back}-${forward}&departureDate=${d}&returnDate=${d}&adult=1&children=0&infant=0&promoCode=&currencyCode=TWD`)
        // 等待網頁載入完成
        // await page.waitForLoadState('load');
        await page.waitForTimeout(2000);
        if (page.url() === 'https://booking.tigerairtw.com/zh-TW/waiting-room') {
            await page.waitForTimeout(5000);
        }
        // const search = await page.$('.block:has-text("搜尋")');
        // search && await page.click('.block:has-text("搜尋")');

        await page.waitForURL('https://booking.tigerairtw.com/zh-TW/flight-result', {
            timeout: 30000,
            callback: async () => {
                const search = await page.$('.block:has-text("搜尋")');
                if (search) {
                    await page.click('.block:has-text("搜尋")');
                    await page.waitForURL('https://booking.tigerairtw.com/zh-TW/flight-result')
                    return
                }
                await browser.close();
                throw new Error('Terminating inner function');
            }
        });

        // 等待列表加載完成
        await page.waitForSelector('.is-active', callbackFn);

        await page.waitForSelector('.text-caption', callbackFn);
        await page.waitForSelector('.text-primary:has-text(",")', callbackFn);

        // await page.waitForTimeout(2000);

        const date = await page.$$eval('.text-caption', items => {
            return items.map(item => {
                const regex = /[\/,]/;
                const match = item.innerText.match(regex);
                return match ? item.innerText : null
            });
        })

        const res = date.filter(_ => _).slice(-20)
        console.log("res", res)
        const goRes = res.slice(0, 10)
        const retrunRes = res.slice(-10)
        sendData.goDateList.push(...goRes)
        sendData.returnDateList.push(...retrunRes)



        console.log('去程', sendData.goDateList)
        console.log('回程', sendData.returnDateList)
        ws.send(JSON.stringify(sendData))

    }
    console.log('全部去程', sendData.goDateList)
    console.log('全部回程', sendData.returnDateList)

    sendData.complete = true
    ws.send(JSON.stringify(sendData))

    // 關閉瀏覽器
    await browser.close();
    console.log('爬蟲完畢');

}

// 執行爬取
// scrapeLotteryInfo();

module.exports = {
    scrapeLotteryInfo
}