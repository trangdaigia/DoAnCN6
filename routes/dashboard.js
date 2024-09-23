const express = require('express');
const router = express.Router();

// Middleware to check if the user is authenticated and is an admin
function isAdminAuthenticated(req, res, next) {
    if (req.isAuthenticated() && req.user.isAdmin) {
        return next();
    }
    res.redirect('/admin/login');
}

// Dashboard route for admin users
router.get('/', isAdminAuthenticated, (req, res) => {
    res.render('dashboard'); // Assuming you have a dashboard.hbs in your views folder
});

module.exports = router;
