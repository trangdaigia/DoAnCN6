require('dotenv').config()
const express = require('express');
const router = express.Router()
const Movie = require('../models/Movie');



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
        if (result.results.length === 0) {
            return res.status(404).json({ error: 'No movies found with the given search term' });
        }

        res.render('addMovieList', { movieList: result.results })
        // res.json(result)
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
})

router.get("/addMovie/:movieId", async (req, res) => {
    const movieId = req.params.movieId;

    try {
        const url = `https://api.themoviedb.org/3/movie/${movieId}?language=en-US`;
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: process.env.TMDB_AUTH_KEY
            }
        };

        const responseData = await fetch(url, options);
        const movieDetails = await responseData.json();

        const watchProviderUrl = `https://api.themoviedb.org/3/movie/${movieId}/watch/providers`;
        const watchProvidersResponse = await fetch(watchProviderUrl, options);
        const watchProvidersResult = await watchProvidersResponse.json();

        const watchProviders = Object.keys(watchProvidersResult.results)
            .filter((country) => country === "US")
            .map((country) => {
                const countryData = watchProvidersResult.results[country];
                return {
                    country,
                    providerName: countryData.flatrate ? countryData.flatrate[0]?.provider_name : null
                };
            });

        movieDetails.watchProviders = watchProviders;
        const genreIds = movieDetails.genres.map(genre => genre.id);
        const genreNames = movieDetails.genres.map(genre => genre.name);
        movieDetails.genreIds = genreIds;
        movieDetails.genres = genreNames;
        movieDetails.production_companies = movieDetails.production_companies.map(company => company.name);
        movieDetails.watchProviders = movieDetails.watchProviders.map(provider => provider.providerName);

        res.render('addMovie', { movieDetails });

    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to fetch movie details' });
        }
    }


});

router.post('/add-movie-details', async (req, res) => {
    try {
        const movieDetails = req.body;

        
        const genreIds = movieDetails.genreIds.split(',').map(id => Number(id));

        const existingMovie = await Movie.findOne({ movieID: movieDetails.id });

        if (existingMovie) {
            console.log(`Movie with movieID ${movieDetails.id} already exists. Skipping.`);
            return res.status(400).json({ error: `Movie with movieID ${movieDetails.id} already exists. Skipping.` });
        }

       
        const runtime = isNaN(Number(movieDetails.runtime)) ? 0 : Number(movieDetails.runtime);

        const newMovie = new Movie({
            movieID: movieDetails.id,
            backdropPath: 'https://image.tmdb.org/t/p/original/' + movieDetails.backdrop_path,
            budget: Number(movieDetails.budget) || 0, 
            genreIds: genreIds,
            genres: movieDetails.genres.split(','),
            originalTitle: movieDetails.original_title,
            overview: movieDetails.overview,
            ratings: Number(movieDetails.ratings) || 0, 
            popularity: Number(movieDetails.popularity) || 0,
            posterPath: 'https://image.tmdb.org/t/p/original' + movieDetails.poster_path,
            productionCompanies: movieDetails.production_companies,
            releaseDate: movieDetails.release_date,
            revenue: Number(movieDetails.revenue) || 0, 
            runtime: runtime, 
            status: movieDetails.status,
            title: movieDetails.title,
            watchProviders: movieDetails.watchProviders,
            logos: 'https://image.tmdb.org/t/p/original' + movieDetails.logos,
            downloadLink: movieDetails.downloadLink,
        });

        const savedMovie = await newMovie.save();
        res.render('addMovie', { successMessage: 'Movie details submitted successfully' });
    } catch (error) {
        console.error('Error submitting movie details:', error);
        res.status(500).json({ error: 'Failed to submit movie details' });
     

    }
});


module.exports = router;