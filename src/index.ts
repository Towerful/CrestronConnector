const https = require('https');
import express, { Request } from 'express'
import cors from 'cors'

const parseToInt = (str: string | undefined, defaultValue: number) => {
  if (typeof str === 'undefined') return defaultValue
  const val = parseInt(str)
  if (isNaN(val)) return defaultValue
  return val
}

const PORT = parseToInt(process.env.PORT, 8009)
const CRESTRON_USER = process.env.CRESTRON_USER
const CRESTRON_PWD = process.env.CRESTRON_PWD
const CRESTRON_HOST = process.env.CRESTRON_USR


const app = express()
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let Cookies = {
  AuthByPasswd: null,
  TRACKID: null,
  iv: null,
  tag: null,
  userid: null,
  userstr: null
}

app.post('/', async (req, res, next) => {
  const body = req.body as { [key: string]: any }
  const path = body.path
  const payload = body.payload
  const method = body.method
  if (Cookies.AuthByPasswd) {
    await login();
  }
  const opts = {
    method: method,
    url: CRESTRON_HOST + path,
    jar: true,
    agentOptions: {
      rejectUnauthorized: false    // To accept self signed certificates
    },
    body: payload
  }
  console.log(opts);
  const result = await https.request(opts);
  res.send(result.body);
})



const login = async () => {
  const loginPage = CRESTRON_HOST + '/userlogin.html'; // Login page url
  let postOptions = {
    url: loginPage,
    jar: true,    // Saves the cookies for subsequent requests
    agentOptions: {
      rejectUnauthorized: false    // To accept self signed certificates
    },
    form: {
      login: 'admin',    // User credentials
      passwd: 'admin'
    }
  };

  return https.post(postOptions, async (error: any, response: any, body: any) => {
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
      await https.get(getOptions, (err: any, resp: any, bdy: any) => {
        if (resp.statusCode && resp.statusCode === 200 && bdy) {
          console.log(bdy);
        }
      });
    }
  });
}

console.log(`Listening on ${PORT}`)
app.listen(PORT)
