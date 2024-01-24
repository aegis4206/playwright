require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const app = express();
const server = http.createServer(app);
const port = process.env.PORT;
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

const { Router } = require('express')
const scrapy = require("./flight")


app.use(express.json());

const corsOptions = {
    origin: process.env.CORS
}

app.use(cors(corsOptions))

wss.on('connection', (ws) => {
    console.log("connected");

    ws.on('message', async (searchBody) => {
        const searchOption = searchBody.toString();
        console.log(searchOption)
        try {
            await scrapy.scrapeLotteryInfo(searchOption, ws)
        } catch {
            ws.send(JSON.stringify({
                message: '伺服器錯誤'
            }))
        }
    })

    ws.on('close', () => {
        console.log("disconnected");
    })
})



// const router = Router();

// const postHanlde = (req, res) => {
//     const body = req.body;
//     console.log(body)
// }
// router.post('/start', postHanlde)

// app.use('/api', router)

server.listen(port, () => {
    console.log(`APP is listening on port ${port}`)
})