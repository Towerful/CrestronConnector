"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
const https = __importStar(require("https"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_errors_1 = __importDefault(require("http-errors"));
const axios_1 = __importDefault(require("axios"));
const parseToInt = (str, defaultValue) => {
    if (typeof str === 'undefined')
        return defaultValue;
    const val = parseInt(str);
    if (isNaN(val))
        return defaultValue;
    return val;
};
const PORT = parseToInt(process.env.PORT, 8009);
const CRESTRON_USER = (_a = process.env.CRESTRON_USER) !== null && _a !== void 0 ? _a : "admin";
const CRESTRON_PWD = (_b = process.env.CRESTRON_PWD) !== null && _b !== void 0 ? _b : "admin";
const CRESTRON_HOST = (_c = process.env.CRESTRON_HOST) !== null && _c !== void 0 ? _c : "10.10.10.90";
const client = axios_1.default.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    }),
    withCredentials: true,
    withXSRFToken: true,
    xsrfCookieName: "CREST-XSRF-TOKEN",
    headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
    }
});
let cookies = {};
let token = undefined;
let init = false;
client.interceptors.request.use((config) => {
    console.log("---------------");
    console.log("Request: ");
    config.url = "https://" + config.url;
    if (token) {
        config.headers['CREST-XSRF-TOKEN'] = token;
    }
    config.headers['Sec-Fetch-Dest'];
    config.headers['Sec-Fetch-Mode'] = "cors";
    config.headers['Sec-Fetch-Site'] = "same-origin ";
    if (!cookies)
        return config;
    config.headers['Cookie'] = Object.entries(cookies).map(([name, value]) => {
        return `${name}=${value}`;
    }).join('; ');
    console.log(config.headers);
    return config;
});
client.interceptors.response.use((response) => {
    console.log("---------------");
    console.log("Response:");
    console.log(response.headers);
    if (response.headers['CREST-XSRF-TOKEN']) {
        console.log("Found token");
        token = response.headers['CREST-XSRF-TOKEN'];
    }
    if (!response.headers['set-cookie'])
        return response;
    response.headers['set-cookie'][0].split(';').filter(c => c.includes("=")).forEach(c => {
        const [name, value] = c.split('=');
        cookies[name.trim()] = value.trim();
    });
    return response;
});
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.post('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const body = req.body;
        const path = body.path;
        const payload = body.payload;
        const method = body.method;
        if (!init || !cookies) {
            init = yield login();
        }
        if (!init || !cookies) {
            throw http_errors_1.default.Unauthorized("Could not authenticate with crestron");
        }
        console.log("Logged in!");
        let result;
        if (method == "GET") {
            result = yield client.get(CRESTRON_HOST + path);
        }
        else {
            result = yield client.post(CRESTRON_HOST + path, payload);
        }
        res.send(result);
    }
    catch (e) {
        next(e);
    }
}));
const login = () => __awaiter(void 0, void 0, void 0, function* () {
    const loginPage = CRESTRON_HOST + '/userlogin.html'; // Login page url
    const result = yield client.get(loginPage);
    return client.post(loginPage, `login=${CRESTRON_USER}&&passwd=${CRESTRON_PWD}`, {
        headers: {
            Origin: CRESTRON_HOST,
            Referer: loginPage
        }
    }).then((res) => {
        console.log(res.status);
        if (res.status == 200) {
            // console.log(res.data)       
            return true;
        }
        if (res.status === 302 && (res.headers["location"] === '/')) {
            return true;
        }
        else {
            return false;
        }
    }, (...res) => {
        console.log("error");
        console.log(res);
        return false;
    });
});
console.log(`Listening on ${PORT}`);
app.listen(PORT);
