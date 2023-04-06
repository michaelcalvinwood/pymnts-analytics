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
    
    
}, false);

async function sendG3PageView (hostname, url, clientId, title, userAgent = '', referrer = '', city = '', country = '') {
     const webPropertyId = hostname === 'gamma.pymnts.com' ? 'UA-11167465-10' : 'UA-11167465-1';

     const params = {
        v: 1,
        t: 'pageview',
        tid: webPropertyId,
        dh: hostname,
        cid: clientId,
        dp: url.indexOf('?') === -1 ? `${url}?ppp=true` : `${url}&ppp=true`,
        dt: title.replaceAll(' ', '-'),
        dr: referrer,
        geoid: city && country ? getGoogleCode(city, country) : '',
        ua: userAgent
     }

     let request = {
            url: 'https://www.google-analytics.com/collect',
            method: 'post',
            params
    }

    console.log('request', request);
    
    let response;

    try {
        response = await axios(request);
        console.log('GA3 Resposne', response.data);
    } catch (err) {
        console.error('GA3 Error', err);
    }
}

sendG3PageView('gamma.pymnts.com', '/test/url', '99c48053-7ec2-4898-b91f-4255502fb981', 'Test Url', 'Amazing Browser');
