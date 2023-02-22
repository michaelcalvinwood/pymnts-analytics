const PORT = 5100;
const privateKeyPath = `/etc/ssl-keys/pymnts.com/pymnts.key`;
const fullchainPath = `/etc/ssl-keys/pymnts.com/pymnts.com.pem`;

const express = require('express');
const https = require('https');
const socketio = require('socket.io');
const cors = require('cors');
const fs = require('fs');


const app = express();
//const server = app.listen(PORT); // Create an express app


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
io.on('connection', (socket) => {
  console.log(`${socket.id} has connected`);
  
  socket.on('disconnect', () => {
    console.log(`${socket.id} has disconnected`)
  });
});