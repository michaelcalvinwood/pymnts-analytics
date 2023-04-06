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

async function sendG3PageView (hostname, url, clientId, title, userAgent = '', referrer = '',  country = '', city = '',) {
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

async function sendG4PageView (hostname, url, deviceId, timeOnPage, title = '', userAgent = 'unknown', referrer = 'unknown', country = 'unknown', region = 'unknown', city = 'unknown') {
    const g4Id = hostname === 'gamma.pymnts.com' ? 'G-NY60TDWHJ9' : 'G-3WHRCQ5780';
    const apiSecret = hostname === 'gamma.pymnts.com' ? 'LSPWrwHwTyKhghOCL2PqRA' : 'dlnjCX6cQmSqk73YzmIXsg';
      /*
         * Send to GA4
         */
      params = {
        api_secret: apiSecret,
        measurement_id: g4Id,
        uc: 'US'
    }

    let data = {
        client_id: deviceId,
        user_id: deviceId,
        events: [
            {
                name: 'page_view',
                params: {
                    engagement_time_msec: timeOnPage,
                    page_location: `https://${hostname}${url.indexOf('?') === -1 ? `${url}?ppp=true` : `${url}&ppp=true`}`,
                    page_path: url.indexOf('?') === -1 ? `${url}?ppp=true` : `${url}&ppp=true`,
                    page_title: title.replaceAll(' ', '-'),
                    page_referrer: referrer
                    
                }
            },
            {
                name: 'pymnts_rt_proxy',
                params: {
                    blocked_visitor: 1,
                    user_agent: userAgent,
                    country,
                    region,
                    city
                }
            }
        ]
    }

    request = {
        url: "https://www.google-analytics.com/mp/collect",
        method: "post",
        params,
        data
    }

    console.log("G4 Request: ", JSON.stringify(request,null, 4));

    let response;

    try {
        response = await axios(request);
        console.log('G4 Response: ', response.data);
    } catch (err) {
        console.error('G4 Error: ', err);
    }

}

//sendG3PageView('gamma.pymnts.com', '/test/url', '99c48053-7ec2-4898-b91f-4255502fb981', 'Test Url', 'Amazing Browser');
sendG4PageView('gamma.pymnts.com', '/test/url/', '99c48053-7ec2-4898-b91f-4255502fb981', 60000, 'Test URL', 'Amazing Browser');
