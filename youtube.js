const { chromium } = require('playwright');

async function scrapeLotteryInfo() {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // 前往目標網站
    await page.goto('https://www.youtube.com/@acshop666/community');
    // 等待網頁載入完成
    await page.waitForLoadState('domcontentloaded');
    // 等待列表加載完成
    await page.waitForSelector('#page-manager');

    let lastHeight = 0;
    let count = 0;
    const limitTimes = 0;

    while (true) {
        // 取得當前頁面高度
        const currentHeight = await page.$eval('#page-manager', (element) => {
            return element.scrollHeight;
        });

        // 模擬向下滑動
        await page.evaluate(() => {
            window.scrollTo(0, document.getElementById('page-manager').scrollHeight + 56);
        });

        // 等待一段時間，讓懶加載完成
        await page.waitForTimeout(10000);

        // 檢查是否仍然在滑動，如果高度沒有變化，則視為懶加載完成
        if (currentHeight === lastHeight) {
            break;
        }
        if (count == limitTimes) {
            break;
        }
        // 更新上次的頁面高度
        lastHeight = currentHeight;
        ++count;
    }

    // 使用 page.$$eval 來取得所有符合條件的 span 元素及其後面的 a 元素網址
    const links = await page.$$eval('span:has-text("影片請點我") + a', (anchors) => {
        return anchors.map(anchor => anchor.href);
    });

    console.log('所有網址:', links);


    for (const link of links) {
        // 點進連結
        await page.goto(link);
        await page.waitForSelector('#expand');
        await page.click('#expand');
        await page.waitForSelector('#description-interaction');
        // 在這裡處理中獎資訊的擷取
        const winnerElements = await page.$$eval('span:has-text("得獎人")', (spans) => {
            return spans.map(span => {
                const regex = /得獎人：.*?([\s\S]{80})/;
                const match = span.textContent.match(regex);
                return match ? match[1] : null
            });
        });
        if (winnerElements) {
            winnerElements.forEach(i => {
                const specialHint = i && (i.includes("aegis4206") || i.includes("陳俊佑"));
                if (specialHint) {
                    console.log('恭喜中獎', link);
                }

            })
        }

        // console.log('中獎資訊:', winnerElements);
    }

    console.log('爬蟲完畢');
    // 關閉瀏覽器
    await browser.close();
}

// 執行爬取
scrapeLotteryInfo();