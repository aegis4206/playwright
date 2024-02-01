const { chromium, firefox, webkit } = require('playwright');
const moment = require('moment')

async function scrapeLotteryInfo(body, ws) {
    const { goDate, returnDate, forward, back, choseBrowser, head } = JSON.parse(body);
    console.log(goDate, returnDate, forward, back);

    const browser = await { chromium, firefox, webkit }[choseBrowser].launch({
        headless: head,
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    });
    const page = await context.newPage();

    // 設定重試次數
    const retryCount = 5;
    let count = 0;

    const callbackOptions = {
        timeout: 10000,
        callback: async () => {
            await browser.close();
            throw new Error('Terminating inner function');
        }
    };

    const callbackFn = {
        waitForSelector: async (target) => await page.waitForSelector(target, callbackOptions),
        waitForURL: async (target) => await page.waitForURL(target, callbackOptions)

    }

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
        await page.waitForLoadState('load');
        await page.waitForTimeout(2000);

        while (page.url() !== 'https://booking.tigerairtw.com/zh-TW/flight-result' && count !== retryCount) {
            ++count
            if (page.url() === 'https://booking.tigerairtw.com/zh-TW/waiting-room') {
                console.log('進入waiting-room')

            } else {
                // await page.screenshot({
                //     path: `./flight/${moment().format("yyyyMMDDhhmmss")}_snap.png`
                // });
                console.log('等待進入flight-result', page.url())
                // const search = await page.$('.block:has-text("搜尋")');
                // search && await page.click('.block:has-text("搜尋")');
            }
            await page.waitForTimeout(5000);
        }

        console.log('進入flight-result')
        await callbackFn.waitForURL('https://booking.tigerairtw.com/zh-TW/flight-result')
        // 等待列表加載完成
        await page.waitForTimeout(2000);

        await callbackFn.waitForSelector('.is-active')

        await callbackFn.waitForSelector('.text-caption')

        await page.waitForSelector('.text-caption:has-text(",")', {
            timeout: 30000,
            callback: async () => {
                await callbackFn.waitForSelector('.text-primary:has-text("-")')

            }
        });


        const date = await page.$$eval('.text-caption', items => {
            return items.map(item => {
                const regex = /[\-,\/]/;
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