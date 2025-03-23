import * as https from 'https';
import express from 'express'
import cors from 'cors'
import createError from 'http-errors';
import axios from 'axios';
const parseToInt = (str: string | undefined, defaultValue: number) => {
  if (typeof str === 'undefined') return defaultValue
  const val = parseInt(str)
  if (isNaN(val)) return defaultValue
  return val
}
const PORT = parseToInt(process.env.PORT, 8009)
const CRESTRON_USER = process.env.CRESTRON_USER ?? "admin"
const CRESTRON_PWD = process.env.CRESTRON_PWD ?? "admin"
const CRESTRON_HOST = process.env.CRESTRON_HOST ?? "10.10.10.90"


const client = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  withCredentials: true,
  withXSRFToken: true,
  maxRedirects: 0,
  xsrfCookieName: "CREST-XSRF-TOKEN",
  headers: {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
  },
  validateStatus: () => true
})

let cookies: { [name: string]: string } = {};
let token: string | undefined = undefined;
let init = false;

client.interceptors.request.use((config) => {
  config.url = "https://" + config.url
  if (token) {
    config.headers['CREST-XSRF-TOKEN'] = token;
  }
  config.headers['Sec-Fetch-Dest'];
  config.headers['Sec-Fetch-Mode'] = "cors";
  config.headers['Sec-Fetch-Site'] = "same-origin ";

  if (!cookies) return config;
  config.headers['Cookie'] = Object.entries(cookies).map(([name, value]) => {
    return `${name}=${value}`
  }).join('; ')
  return config
})

client.interceptors.response.use((response) => {
  if (response.headers['CREST-XSRF-TOKEN']) {
    token = response.headers['CREST-XSRF-TOKEN']
  }
  if (!response.headers['set-cookie']) return response;
  response.headers['set-cookie'].map(str => {
    str.split(';').filter(c => c.includes("=")).forEach(c => {
      const [name, value] = c.split('=')
      cookies[name.trim()] = value.trim()
    });
  })
  return response;
})




const app = express()
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/', async (req, res, next) => {
  try {
    const body = req.body as { [key: string]: any }

    const path = body.path
    const payload = body.payload
    const method = body.method
    if (!init || !cookies) {
      init = await login();
    }
    if (!init || !cookies) {
      throw createError.Unauthorized("Could not authenticate with crestron");
    }
    let result
    if (method == "GET") {
      result = await client.get(CRESTRON_HOST + path)
    } else {
      result = await client.post(CRESTRON_HOST + path, payload)
    }
    res.send(result.data);
  } catch (e) {
    next(e);
  }
})



const login = async () => {
  const loginPage = CRESTRON_HOST + '/userlogin.html'; // Login page url

  const result = await client.get(loginPage)

  return client.post(loginPage, `login=${CRESTRON_USER}&&passwd=${CRESTRON_PWD}`, {
    headers: {
      Origin: CRESTRON_HOST,
      Referer: loginPage
    }
  }).then((res) => {
    if (res.status == 200) {
      // console.log(res.data)       
      return true;
    }
    if (res.status === 302 && (res.headers["location"] === '/')) {
      return true
    } else {
      return false
    }
  }, (...res) => {
    return false
  });
}

console.log(`Listening on ${PORT}`)
app.listen(PORT)
