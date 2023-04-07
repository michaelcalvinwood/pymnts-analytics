const axios = require('axios');
require('dotenv').config();

const csv = require('csv-array');
const bs = require("binary-search");
let GoogleIds = null;

// Setup MYSQL

const mysql = require('mysql2');

const pool = mysql.createPool({
    connectionLimit : 100, //important
    host     : process.env.MYSQL_HOST,
    user     : process.env.MYSQL_USER,
    password : process.env.MYSQL_PASSWORD,
    database : process.env.MYSQL_DATABASE,
    debug    :  false
});

let databaseReady = false;

pool.query("SHOW DATABASES",(err, data) => {
    if(err) {
        console.error(err);
        return;
    }
    // rows fetch
    console.log(data);
    databaseReady = true;
});

const mysqlQuery = query => {
  return new Promise ((resolve, reject) => {
    pool.query(query,(err, data) => {
      if(err) {
          console.error(err);
          return reject(err);
      }
      // rows fetch
      //console.log(data);
      return resolve(data);
  });
  })
}


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

async function sendG3PageView (hostname, url, clientId, meta) {
     const webPropertyId = hostname === 'gamma.pymnts.com' ? 'UA-11167465-10' : 'UA-11167465-1';

     const params = {
        v: 1,
        t: 'pageview',
        tid: webPropertyId,
        dh: hostname,
        cid: clientId,
        dp: url.indexOf('?') === -1 ? `${url}?ppp=true` : `${url}&ppp=true`,
     }

    if (meta.title) params.dt = meta.title.replaceAll(' ', '-');
    if (meta.referrer) params.dr = meta.referrer;
    if (meta.city && meta.country) params.geoid = getGoogleCode(meta.city, meta.country);
    if (meta.userAgent) params.ua = meta.userAgent;

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

async function sendG4PageView (hostname, url, deviceId, timeOnPage, meta) {
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
                }
            },
            {
                name: 'pymnts_sync_proxy',
                params: {
                    blocked_visitor: 1,
                }
            },
            {
                name: 'pymnts_device_visit',
                params: {
                    path: url,
                    device: deviceId,
                    pymnts_device_visit: `${deviceId}--${url}`
                }
            }
        ]
    }

    if (meta.referrer) data.events[0].params.page_referrer = meta.referrer;
    if (meta.title) data.events[0].params.page_title = meta.title;
    if (meta.userAgent) data.events[1].params.user_agent = meta.userAgent;
    if (meta.country) data.events[1].params.country = meta.country;
    if (meta.region) data.events[1].params.region = meta.region;
    if (meta.city) data.events[1].params.city = meta.city;

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

// sendG3PageView('gamma.pymnts.com', '/test/url', '99c48053-7ec2-4898-b91f-4255502fb981', {
//     title: 'Wow: Amazing Article',
//     userAgent: "Incredible Browser",
// });
sendG4PageView('gamma.pymnts.com', '/test/url/', '99c48053-7ec2-4898-b91f-4255502fb981', 60000, {
    title: 'Another amazing artile',
    userAgent: 'Another incredible browser'
});
