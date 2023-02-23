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

const csv = require('csv-array');
const bs = require("binary-search");
let GoogleIds = null;




const getGoogleCode = (city, country) => {
    let test = bs(GoogleIds, city, (key, target) => {
        if (key[1].toLowerCase() > target.toLowerCase()) return 1;
        if (key[1].toLowerCase() < target.toLocaleLowerCase()) return -1;
        return 0;
    });

    if (test > 0) return GoogleIds[test][0];
    
    return country;


}

csv.parseCSV("geotargets.csv", function(data){
    GoogleIds = data;
    GoogleIds.shift();
    GoogleIds.sort((a, b) => {
        if (a[1] > b[1]) return 1;
        if (a[1] < b[1]) return -1;
        return 0;
    })
    
    for (let i = 0; i < 10; ++i) {
        console.log(JSON.stringify(GoogleIds[i]));
    }
}, false);


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

const recordPageTime = socket => {
    if (!socket.pageInfo.url) return;
    const { url, start, title, referrer, hostname } = socket.pageInfo;
    const { country, region, city } = socket.location;
    const { deviceId, deviceType, browser } = socket.userInfo;
    let timeOnPage = currentTime - start;
        
    if (timeOnPage < 15000) timeOnPage = 15000;

    return new Promise((resolve, reject) => {
        const g3Id = hostname === 'gamma.pymnts.com' ? 'UA-11167465-10' : 'UA-11167465-1';
        const g4Id = hostname === 'gamma.pymnts.com' ? 'G-NY60TDWHJ9' : 'G-3WHRCQ5780';

        let params = {
            v: 1,
            t: 'pageview',
            tid: g3Id,
            cid: deviceId,
            dh: hostname,
            dp: url,
            dt: title,
            dr: referrer,
            geoid: country,

        }

        console.log('ids', g3Id, g4Id);


        console.log(`${timeOnPage} milliseconds spent on https://${hostname}${url}`, country, region, city, title, referrer, deviceId, deviceType, browser);
    
        resolve('okay');
    })
}

const handleSocket = async socket => {
    socket.location = {};
    socket.pageInfo = {
        url: null,
        start: null,
    };
    socket.userInfo = {};

    socket.on('disconnect', () => {
        console.log(`${socket.id} has disconnected`)
        recordPageTime(socket);
    });

    socket.on('pageView', async (data) => {
        const id = socket.id;
        const ip = socket.conn.remoteAddress;

        /*
         * add location info to socket if not already there
         */
        if (!socket.location.country) {
            let locationData;
            try {
                locationData = await ipToLocation(ip);
                socket.location.country = locationData.country;
                socket.location.region = locationData.region;
                socket.location.city = locationData.city;

                //console.log('location', locationData);
            } catch(e) {
                console.error(e);
            }
        }

        /*
         * add user info to socket
         */

        socket.userInfo.deviceId = data.deviceId;
        socket.userInfo.deviceType = data.deviceType;
        socket.userInfo.browser = data.browser;
        
        if (data.url !== socket.pageInfo.url) {
            //console.log('NEW PAGE', data.url);
        
            if (socket.pageInfo.url !== null) recordPageTime(socket);

            socket.pageInfo.url = data.url;
            socket.pageInfo.start = currentTime;
            socket.pageInfo.title = data.title;
            socket.pageInfo.referrer = data.referrer;
            socket.pageInfo.hostname = data.hostname;
        }

        //console.log('pageView', id, socket.location, socket.userInfo, socket.pageInfo);
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
 