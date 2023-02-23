const PORT = 5100;
const privateKeyPath = `/etc/ssl-keys/pymnts.com/pymnts.key`;
const fullchainPath = `/etc/ssl-keys/pymnts.com/pymnts.com.pem`;

const express = require('express');
const https = require('https');
const socketio = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const app = express();
//const server = app.listen(PORT); // Create an express app

let currentTime = Date.now();
setInterval(() => {
    currentTime = Date.now();
}, 1000);

const ipToLocation = ip => {
    return new Promise((resolve, reject) => {
        // check cache here

        let request = {
            url: `https://api.ipinfo.ai/ip/${ip}/geolocation?token=${process.env.IPINFO_AI_TOKEN}`,
            method: 'get'
        }

        axios(request)
        .then(response => { 
            // add to cache here
            resolve(response.data) })
        .catch(error => reject(error));
    })
} 

const sendMsgToUser = (socket, msg, data) => socket.emit(msg, data);

const handleSocket = async socket => {
    socket.location = {};
    socket.pageInfo = {
        url: null,
        start: null,
    };

    socket.on('disconnect', () => {
        console.log(`${socket.id} has disconnected`)
    });

    socket.on('pageView', async (data) => {
        const id = socket.id;
        const ip = socket.conn.remoteAddress;
        if (!socket.location.country) {
            let locationData;
            try {
                locationData = await ipToLocation(ip);
                socket.location.country = locationData.country;
                socket.location.region = locationData.region;
                socket.location.city = locationData.city;

                console.log('location', locationData);
            } catch(e) {
                console.error(e);
            }
        }

        data.country = socket.location.country;
        data.region = socket.location.region;
        data.city = socket.location.city;

        if (data.url !== socket.pageInfo.url) {
            console.log('NEW PAGE', data.url);
            socket.pageInfo.url = data.url;
            socket.start = currentTime;
        }
        
        console.log('pageView', id, currentTime, data);
    })
    sendMsgToUser (socket, 'welcome', { message: 'Hello!', id: socket.id });

    console.log(`${socket.id} has connected`);

}



app.use(express.static('static'));
app.use(express.json({limit: '200mb'})); 
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

const httpsServer = https.createServer({
    key: fs.readFileSync(privateKeyPath),
    cert: fs.readFileSync(fullchainPath),
  }, app);
  

httpsServer.listen(PORT, () => {
    console.log(`HTTPS Server running on port ${PORT}`);
});

const io = socketio(httpsServer, {
    cors: {
      origin: ["https://gamma.pymnts.com", "https://pymnts.com", "https:www.pymnts.com"],
      methods: ["GET", "POST"]
    }
}); // Connect socket io to the express app

io.on('connection', (socket) => handleSocket(socket));
 