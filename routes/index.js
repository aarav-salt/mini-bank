var router = require('express').Router();
const createError = require('http-errors');
const { requiresAuth } = require('express-openid-connect');
const bodyParser = require('body-parser')
const { check, validationResult } = require('express-validator')
const urlencodedParser = bodyParser.urlencoded({ extended: false })
const mongoose = require('mongoose');
// const User = require("../models/user");
const User = mongoose.model('User');
const { exists } = require('../models/user');



const claimCheckAdmin = (req, res, next) => req.oidc.user ?
    req.oidc.user['https://myapp.com/roles'] === 'Admin' ?
        next() : next(createError(403, 'Please login to view this page.')) : res.oidc.login();

router.get("/", function (req, res, next) {
    res.sendFile(__dirname + "/index.html");
});

router.get('/profile', requiresAuth(), function (req, res, next) {
    res.send(JSON.stringify(req.oidc.user));
});

router.get('/admin', claimCheckAdmin, (req, res) =>
    res.send(`Hello ${req.oidc.user.sub}, this is the admin section.`)
);

// app.get("/home", requiresAuth(), (req, res) => {
//     res.sendFile(__dirname + "/public/home.html");
// });
router.get('/home', requiresAuth(), async function (req, res, next) {
    // get account balance for the user:
    try {
        const User = mongoose.model('User');
        const userInDB = await User.findOne({ auth0_id_token: req.appSession.user.auth0_id_token });
        const user = {
            accountNumber: req.appSession.user.accountNumber,
            balance: userInDB ? userInDB.balance : 0,
            name: userInDB ? userInDB.name : '',
        }
        res.render('home.ejs', {
            user: user,
            title: 'Home'
        });
    } catch (err) {
        console.error(err);
        return next(err);
    }
});

router.get('/transactions', requiresAuth(), async function (req, res, next) {
    try {
        const userInDB = await User.findOne({ auth0_id_token: req.appSession.user.auth0_id_token });
        const user = {
            accountNumber: req.appSession.user.accountNumber,
            balance: userInDB ? userInDB.balance : 0,
            name: userInDB ? userInDB.name : '',
            transactions: userInDB ? userInDB.transactions : []
        }
        res.render('transactions.ejs', {
            user: user,
            title: 'Transactions'
        });
    } catch (err) {
        console.error(err);
        return next(err);
    }
});

router.get('/transfer', requiresAuth(), async function (req, res, next) {
    try {
        const userInDB = await User.findOne({ auth0_id_token: req.appSession.user.auth0_id_token });
        const user = {
            accountNumber: req.appSession.user.accountNumber,
            balance: userInDB ? userInDB.balance : 0,
            name: userInDB ? userInDB.name : '',
            transactions: userInDB ? userInDB.transactions : [],
        }
        res.render('transfer.ejs', {
            user: user,
            title: 'Transfer'
        });
    } catch (err) {
        console.error(err);
        return next(err);
    }
});


router.post('/transfer', urlencodedParser, [
    check('accountNumber', 'This Account Number is invalid')
        .custom((value, { req }) => {
            console.log(value, value.toString().length);
            if (value.toString().length !== 16) {
                console.log("Here")
                throw new Error('Account Number must be 16 digits');
            }
            if (value === req.appSession.user.accountNumber) {
                console.log("ASd")
                throw new Error('You cannot transfer to your own account');
            }
            console.log("Cool")
            return Promise.resolve();
        })
        .custom(value => {
            return User.findOne({ accountNumber: value })
                .then(user => {
                    if (!user) {
                        return Promise.reject('Invalid A/C Number');
                    } else {
                        return Promise.resolve();
                    }
                })
        }),
    // check if balance exists
    check('amount', 'Not enough balance')
        .custom(async (value, { req }) => {
            const userInDB = await User.findOne({ accountNumber: req.appSession.user.accountNumber });
            if (userInDB.balance >= value) {
                return Promise.resolve();
            } else {
                return Promise.reject('Not enough balance');
            }
        })
], (req, res) => {
    console.log(req.body);
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const alert = errors.array()
        res.render('transfer.ejs', {
            alert,
            user: req.appSession.user,
        })
    } else {
        const { accountNumber, amount } = req.body;
        const userInDB = User.findOne({ accountNumber: accountNumber });
        userInDB.then(user => {
            user.balance += amount;
            user.transactions.push({
                type: 'transfer',
                amount: amount,
                accountNumber: req.appSession.user.accountNumber,
                date: new Date()
            })
            user.save();
            res.redirect('/home');
        })
        const payee = User.findOne({ accountNumber: req.appSession.user.accountNumber });
        payee.then(user => {
            user.balance -= amount;
            user.transactions.push({
                type: 'transfer',
                amount: amount,
                accountNumber: accountNumber,
                date: new Date()
            })
            user.save();
        })
    }
})
module.exports = router;