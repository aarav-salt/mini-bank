require("dotenv").config();

const express = require("express");
const mongoose = require('mongoose');
const { auth, requiresAuth } = require('express-openid-connect');
const jwt = require('jsonwebtoken');
const path = require("path");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const User = require("./models/user");
const router = require('./routes/index');
const app = express();
const PORT = process.env.PORT || 3000
const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const uri = process.env.DATABASE || "mongodb+srv://admin:admin@cluster0.arepl.mongodb.net/dummyBankDB?retryWrites=true&w=majority";
const config = {
    authRequired: false,
    auth0Logout: true,
    baseURL: BASE_URL,
    afterCallback: async (req, res, session, decodedState) => {
        try {
            // parse the id_token
            const idToken = session.id_token;
            const claims = jwt.decode(idToken);
            console.log(claims);
            const user = {
                name: claims.name,
                email: claims.email,
                auth0_id_token: idToken,
                accountNumber: '',
                balance: 10000,
                isAdmin: claims['https://myapp.com/roles'] === 'Admin' ? true : false,
                transactions: []
            }
            // find the user in the database
            const User = mongoose.model('User');
            const userInDB = await User.findOne({ auth0_id_token: idToken });
            if (!userInDB) {
                // create the user in the database
                // check if the accountNumber is already in use
                const accountNumber = Math.floor(Math.random() * Math.pow(10, 16));
                while (accountNumber.toString().length != 16) {
                    accountNumber = Math.floor(Math.random() * Math.pow(10, 16));
                }
                const userWithAccountNumber = await User.findOne({ accountNumber });
                while (userWithAccountNumber || accountNumber.toString().length != 16) {
                    accountNumber = Math.floor(Math.random() * Math.pow(10, 16));
                    userWithAccountNumber = await User.findOne({ accountNumber });
                }
                user.accountNumber = accountNumber;
                await User.create(user);
            }

            // save the user in the session
            session.user = user;
            return {
                ...session,
            };
        } catch (err) {
            console.error(err);
            return session;
        }
    },
    clientID: 'zs3W1oaHCF5QIqyXaijcdROeifiQOTPW',
    issuerBaseURL: 'https://dev-3xgjyfty.us.auth0.com',
    secret: 'LONG_RANDOM_STRING'
};


mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
})


app.use(auth(config));
app.use(express.static(path.join(__dirname, "public")));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(function (req, res, next) {
    res.locals.user = req.oidc.user;
    next();
});

app.use('/', router);

app.use(function (err, req, res, next) {
    if (err.status === 403) {
        res.render('unauthorized.html');
    }
})


app.listen(PORT, console.log(`Listening on port ${PORT}.`));