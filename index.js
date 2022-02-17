const express = require("express");
require("dotenv").config();
const app = express();
const { auth, requiresAuth } = require('express-openid-connect');
const PORT = process.env.PORT || 3000
const config = {
    authRequired: false,
    auth0Logout: true,
    baseURL: 'http://localhost:3000',
    clientID: 'zs3W1oaHCF5QIqyXaijcdROeifiQOTPW',
    issuerBaseURL: 'https://dev-3xgjyfty.us.auth0.com',
    secret: 'LONG_RANDOM_STRING'
};


const path = require("path");
app.use(auth(config));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get('/profile', requiresAuth(), (req, res) => {
    res.send(JSON.stringify(req.oidc.user));
});

app.get("/home", requiresAuth(), (req, res) => {
    res.sendFile(__dirname + "/public/home.html");
});

app.listen(PORT, console.log(`Listening on port ${PORT}.`));