var router = require('express').Router();
const { requiresAuth } = require('express-openid-connect');

router.get("/", function (req, res, next) {
    res.sendFile(__dirname + "/index.html");
});

router.get('/profile', requiresAuth(), function (req, res, next) {
    res.send(JSON.stringify(req.oidc.user));
});

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