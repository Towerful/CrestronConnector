"use strict";
const request = require('request');
``;
const parseToInt = (str, defaultValue) => {
    if (typeof str === 'undefined')
        return defaultValue;
    const val = parseInt(str);
    if (isNaN(val))
        return defaultValue;
    return val;
};
const PORT = parseToInt(process.env.PORT, 8009);
const CRESTRON_USER = process.env.CRESTRON_USER;
const CRESTRON_PWD = process.env.CRESTRON_PWD;
const CRESTRON_HOST = process.env.CRESTRON_USR;
const loginPage = CRESTRON_HOST + '/userlogin.html'; // Login page url
let postOptions = {
    url: loginPage,
    jar: true, // Saves the cookies for subsequent requests
    agentOptions: {
        rejectUnauthorized: false // To accept self signed certificates
    },
    form: {
        login: 'admin', // User credentials
        passwd: 'admin'
    }
};
request.post(postOptions, (error, response, body) => {
    // Error handling
    if (error) {
        console.log('error: ' + response.statusCode);
        console.log(body);
        return;
    }
    // Valid crendentials will cause the server to respond with a redirect to root
    if (response.statusCode === 302 && (response.headers["location"] === '/')) {
        let getOptions = {
            url: CRESTRON_HOST + '/Device/DeviceInfo', // URL for the deviceinfo
            jar: true,
            agentOptions: {
                rejectUnauthorized: false
            },
        };
        // Requested data will be in the response body
        request.get(getOptions, (err, resp, bdy) => {
            if (resp.statusCode && resp.statusCode === 200 && bdy) {
                console.log(bdy);
            }
        });
    }
});
