function isLoggedIn(req, res, next) {
    console.log(req.session); 
    if (req.isAuthenticated()) {
        return next(); 
    }
    res.status(401).json({ success: false, message: 'Unauthorized' });
}


module.exports = isLoggedIn;