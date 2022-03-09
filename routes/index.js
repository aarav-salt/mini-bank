var router = require('express').Router();
var axios = require("axios").default;
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

router.get('/admin', claimCheckAdmin, async (req, res) => {
    try {
        const User = mongoose.model('User');
        // calculate the total sum of all users' balances
        const users = await User.find({});
        let total = 0;
        let count = 0;
        users.forEach(user => {
            total += parseInt(user.balance);
            console.log(parseInt(user.balance));
            count += 1;
        });

        res.render('admin/home.ejs', {
            totalMoney: total,
            count: count,
            user: req.oidc.user,
            title: 'Home'
        });
    } catch (err) {
        console.error(err);
        return next(err);
    }
});

router.get('/admin/users', claimCheckAdmin, async (req, res) => {
    try {
        const User = mongoose.model('User');
        // calculate the total sum of all users' balances
        const users = await User.find({});

        res.render('admin/users.ejs', {
            users: users,
            user: req.oidc.user,
            title: 'Users'
        });
    } catch (err) {
        console.error(err);
        return next(err);
    }
});

router.get('/admin/transfer', claimCheckAdmin, async (req, res) => {
    try {
        const User = mongoose.model('User');
        const users = await User.find({});

        res.render('admin/transfer.ejs', {
            users: users,
            user: req.oidc.user,
            accountNumber: req.appSession.user.accountNumber,
            title: 'Transfer'
        });
    } catch (err) {
        console.error(err);
        return next(err);
    }
});

router.post('/admin/add-user', claimCheckAdmin, urlencodedParser, [
    check('name').isLength({ min: 1 }).withMessage('Name is required'),
    check('email').isEmail().withMessage('Email is required'),
],
    (req, res) => {
        // getting mgmt access token:
        var options = {
            method: 'POST',
            url: 'https://dev-3xgjyfty.us.auth0.com/oauth/token',
            headers: { 'content-type': 'application/json' },
            data: {
                grant_type: 'client_credentials',
                client_id: 'zs3W1oaHCF5QIqyXaijcdROeifiQOTPW',
                client_secret: 'Sugr66LfSsCYlv9qtc2n79ffjEC9ZjIoThfPa8JAfzGxdTb7LCuRpRYDJUeRZKRQ',
                audience: 'https://dev-3xgjyfty.us.auth0.com/api/v2/'
            }
        };

        axios.request(options).then(function (response) {
            // create a new user:
            var options = {
                method: 'POST',
                url: 'https://dev-3xgjyfty.us.auth0.com/api/v2/users',
                headers: {
                    'content-type': 'application/json',
                    authorization: 'Bearer ' + response.data.access_token
                },
                data: {
                    connection: 'Username-Password-Authentication',
                    email: req.body.email,
                    name: req.body.name,
                    password: 'password#234',
                    username: req.body.name,
                }
            };
            axios.request(options).then(function (response) {
                console.log(response.data);
                res.redirect('/admin/users');
            }
            ).catch(function (error) {
                console.log(error.response.data);
            }
            );

        }).catch(function (error) {
            console.error(error.response.data);
        });
    })

router.post('/admin/transfer', claimCheckAdmin, urlencodedParser, [
    check('accountNumber').isLength({ min: 16, max: 16 }).withMessage('Account number must be 16 digits long.'),
    check('amount').isNumeric().withMessage('Amount must be a number.'),
    check('amount').custom((value, { req }) => {
        const { accountNumber, isCredit } = req.body;
        if (isCredit !== 'on') {
            const userInDB = User.findOne({ accountNumber: accountNumber });
            if (userInDB.balance < value) {
                throw new Error('Insufficient funds.');
            }
            return Promise.resolve();
        }
        return Promise.resolve();
    })
],
    async (req, res) => {
        console.log(req.body)
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            const alert = errors.array()
            const User = mongoose.model('User');
            const users = await User.find({});
            res.render('admin/transfer.ejs', {
                alert,
                user: req.appSession.user,
                accountNumber: req.appSession.user.accountNumber,
                users: users,
                title: 'Transfer'
            })
        } else {
            const { accountNumber, amount, isCredit } = req.body;
            const userInDB = User.findOne({ accountNumber: accountNumber });
            if (isCredit === 'on') {
                userInDB.then(user => {
                    user.balance += parseInt(amount);
                    user.transactions.push({
                        type: 'transfer',
                        amount: amount,
                        accountNumber: req.appSession.user.accountNumber,
                        date: new Date()
                    })
                    user.save();
                })
            } else {
                userInDB.then(user => {
                    user.balance -= parseInt(amount);
                    user.transactions.push({
                        type: 'transfer',
                        amount: amount,
                        accountNumber: req.appSession.user.accountNumber,
                        date: new Date()
                    })
                    user.save();
                })
            }
            res.redirect('/home');
        }
    })




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
            user.balance += parseInt(amount);
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
            user.balance -= parseInt(amount);
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