const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie'); 

router.get('/edit-movie-list', async (req, res) => {
    try {
        const movies = await Movie.find();
        res.render('editMovieList', { movies });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
