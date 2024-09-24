require('dotenv').config()
const express = require('express');
const router = express.Router()

router.post('/fetch-movie', async (req, res) => {
    let search_term = req.body.searchTerm
    try {
        const url = `https://api.themoviedb.org/3/search/movie?query=${search_term}&include_adult=false&language=en-US&page=1`;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: process.env.TMDB_AUTH_KEY

            }
        }
        const responseData = await fetch(url, options)
        const result = await responseData.json()
        //console.log("Result", result)
        res.json(result)
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
})
module.exports = router;