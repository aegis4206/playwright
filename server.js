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

wss.on('connection', (ws, req) => {
    console.log(req.socket.remoteAddress, "connected");
    console.log(wss.clients.size)
    ws.on('message', async (searchBody) => {
        if (wss.clients.size > 1) return ws.send(JSON.stringify({
            message: '其他使用者正在使用中'
        }));

        const searchOption = searchBody.toString();
        console.log(searchOption)
        try {
            await scrapy.scrapeLotteryInfo(searchOption, ws)
        } catch {
            ws.send(JSON.stringify({
                message: '伺服器無回應或選擇日期無航班'
            }))
        }
    })


    ws.on('close', () => {
        console.log(req.socket.remoteAddress, "disconnected");
        console.log(wss.clients.size)
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