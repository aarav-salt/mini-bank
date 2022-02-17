const express = require("express");
require("dotenv").config();
const app = express();
const router = require('./routes/index');
const { auth, requiresAuth } = require('express-openid-connect');
const PORT = process.env.PORT || 3000
const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const config = {
    authRequired: false,
    auth0Logout: true,
    baseURL: BASE_URL,
    clientID: 'zs3W1oaHCF5QIqyXaijcdROeifiQOTPW',
    issuerBaseURL: 'https://dev-3xgjyfty.us.auth0.com',
    secret: 'LONG_RANDOM_STRING'
};


const path = require("path");
app.use(auth(config));
app.use(express.static(path.join(__dirname, "public")));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(function (req, res, next) {
    res.locals.user = req.oidc.user;
    next();
});

app.use('/', router);


app.listen(PORT, console.log(`Listening on port ${PORT}.`));