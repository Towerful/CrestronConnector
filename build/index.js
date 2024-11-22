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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const axios_1 = __importStar(require("axios"));
const client = new axios_1.Axios({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    }),
    withCredentials: true
});
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
const CRESTRON_HOST = (_c = process.env.CRESTRON_HOST) !== null && _c !== void 0 ? _c : "localhost";
const requestPromise = ((urlOptions, data) => {
    return new Promise((resolve, reject) => {
        const req = https.request(urlOptions, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk.toString()));
            res.on('error', reject);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode <= 299) {
                    resolve({ statusCode: res.statusCode, headers: res.headers, body: body });
                }
                else {
                    reject('Request failed. status: ' + res.statusCode + ', body: ' + body);
                }
            });
        });
        req.on('error', reject);
        req.write(data, 'binary');
        req.end();
    });
});
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
let init = false;
app.post('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const body = req.body;
        const path = body.path;
        const payload = body.payload;
        const method = body.method;
        if (!init) {
            init = yield login();
        }
        if (!init) {
            throw http_errors_1.default.Unauthorized("Could not authenticate with crestron");
        }
        const opts = {
            method: method,
            url: CRESTRON_HOST + path,
            jar: true,
            agentOptions: {
                rejectUnauthorized: false // To accept self signed certificates
            },
            body: payload
        };
        console.log(opts);
        let result;
        if (method == "POST") {
            result = yield axios_1.default.post(CRESTRON_HOST + path, payload);
        }
        else {
            result = yield axios_1.default.get(CRESTRON_HOST + path);
        }
        res.send(result);
    }
    catch (e) {
        next(e);
    }
}));
const login = () => __awaiter(void 0, void 0, void 0, function* () {
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
});
console.log(`Listening on ${PORT}`);
app.listen(PORT);
