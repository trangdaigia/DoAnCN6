const express = require('express');
const router = express.Router();


router.get('/edit-movie-list', async (req, res) => {
    try {
        const movies = await Movie.find();
        if (!movies || movies.length === 0) {
            return res.status(404).send('No movies found');
        }
        console.log(movies);  
        res.render('editMovieList', { movies });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;