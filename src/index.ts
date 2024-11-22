import * as https from 'https';
import express, { Request } from 'express'
import cors from 'cors'
import createError from 'http-errors';
import axios, { Axios } from 'axios';

const client = new Axios({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  withCredentials: true
})
const parseToInt = (str: string | undefined, defaultValue: number) => {
  if (typeof str === 'undefined') return defaultValue
  const val = parseInt(str)
  if (isNaN(val)) return defaultValue
  return val
}

const PORT = parseToInt(process.env.PORT, 8009)
const CRESTRON_USER = process.env.CRESTRON_USER ?? "admin"
const CRESTRON_PWD = process.env.CRESTRON_PWD ?? "admin"
const CRESTRON_HOST = process.env.CRESTRON_HOST ?? "localhost"


const requestPromise = ((urlOptions: https.RequestOptions, data: any) => {
  return new Promise((resolve, reject) => {
    const req = https.request(urlOptions,
      (res: any) => {
        let body = '';
        res.on('data', (chunk: any) => (body += chunk.toString()));
        res.on('error', reject);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode <= 299) {
            resolve({ statusCode: res.statusCode, headers: res.headers, body: body });
          } else {
            reject('Request failed. status: ' + res.statusCode + ', body: ' + body);
          }
        });
      });
    req.on('error', reject);
    req.write(data, 'binary');
    req.end();
  });
});

const app = express()
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let init = false;

app.post('/', async (req, res, next) => {
  try {
    const body = req.body as { [key: string]: any }

    const path = body.path
    const payload = body.payload
    const method = body.method
    if (!init) {
      init = await login();
    }
    if (!init) {
      throw createError.Unauthorized("Could not authenticate with crestron");
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
    let result
    if (method == "POST") {
      result = await axios.post(CRESTRON_HOST + path, payload)
    } else {
      result = await axios.get(CRESTRON_HOST + path)

    }
    res.send(result);
  } catch (e) {
    next(e);
  }

})



const login = async () => {
  const loginPage = CRESTRON_HOST + '/userlogin.html'; // Login page url
  let formData = new FormData();
  formData.append("login", CRESTRON_USER);
  formData.append("passwd", CRESTRON_PWD);
  return client.post(loginPage, formData).then(() => true, () => false);
  // return promise_https(postOptions);
  // return https.post(postOptions, async (error: any, response: any, body: any) => {
  //   // Error handling
  //   if (error) {
  //     console.log('error: ' + response.statusCode);
  //     console.log(body);
  //     return false;
  //   }
  //   // Valid crendentials will cause the server to respond with a redirect to root
  //   if (response.statusCode === 302 && (response.headers["location"] === '/')) {
  //     return true;
  //   }
  // });
}

console.log(`Listening on ${PORT}`)
app.listen(PORT)
