var router = require('express').Router();
const createError = require('http-errors');
const { requiresAuth } = require('express-openid-connect');
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
router.get('/home', requiresAuth(), function (req, res, next) {
    res.render('home.ejs', {
        userProfile: JSON.stringify(req.oidc.user, null, 2),
        title: 'Home'
    });
});

module.exports = router;