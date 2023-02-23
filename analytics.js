const PORT = 5100;
const privateKeyPath = `/etc/ssl-keys/pymnts.com/pymnts.key`;
const fullchainPath = `/etc/ssl-keys/pymnts.com/pymnts.com.pem`;

const express = require('express');
const https = require('https');
const socketio = require('socket.io');
const cors = require('cors');
const fs = require('fs');
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
    socket.on('disconnect', () => {
        console.log(`${socket.id} has disconnected`)
    });

    socket.on('pageView', (data) => {
        const id = socket.id;
        const ip = socket.conn.remoteAddress;

        console.log('pageView', id, ip, currentTime, data);
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
 