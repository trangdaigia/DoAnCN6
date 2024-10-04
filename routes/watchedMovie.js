const express = require('express');
const router = express.Router();
const isLoggedIn = require('../routes/isLoggedIn');
const Movie = require('../models/movie');

router.post('/update-watched-time/:movieId', isLoggedIn, async (req, res) => {
    try {
        const user = req.user;
        const movieId = req.params.movieId;
        const watchedTime = req.body.watchedTime;


        const movieToUpdate = user.watchedMovies.find(item => item.movie.equals(movieId));
        console.log("Movie to update", movieToUpdate);

        const currentTime = new Date();

        if (movieToUpdate) {

            movieToUpdate.watchedTime = watchedTime;
            movieToUpdate.uploadTime = currentTime;
        } else {

            user.watchedMovies.push({
                movie: movieId,
                watchedTime: watchedTime,
                uploadTime: currentTime
            });
        }


        await user.save();


        const formattedWatchedMovies = user.watchedMovies.map(watchedMovie => ({
            movie: watchedMovie.movie,
            watchedTime: watchedMovie.watchedTime,
            uploadTime: new Date(watchedMovie.uploadTime).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }),
            _id: watchedMovie._id
        }));

        res.status(200).json({
            success: true,
            message: "Watched time updated successfully",
            watchedMovies: formattedWatchedMovies
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/remove-watched-time/:movieId', isLoggedIn, async (req, res) => {
    try {
        const user = req.user;
        const movieIdToRemove = req.params.movieId;


        const movieIndexToRemove = user.watchedMovies.findIndex(item => item.movie.equals(movieIdToRemove)); // Sử dụng đúng cú pháp hàm

        if (movieIndexToRemove !== -1) {

            user.watchedMovies.splice(movieIndexToRemove, 1);
            await user.save();


            res.json({
                success: true,
                message: "Movie removed from watched list successfully"
            });
        } else {

            res.status(404).json({
                success: false,
                message: "Movie not found in watched list"
            });
        }
    } catch (error) {

        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/remove-all-watched-movies', isLoggedIn, async (req, res) => {
    try {
        const user = req.user;
        user.watchedMovies = [];
        await user.save();


        res.json({ success: true, message: 'All watched movies removed successfully' });
    } catch (error) {

        res.status(500).json({ success: false, error: error.message });
    }
});


router.get('/watched-time/:movieId', isLoggedIn, async (req, res) => {
    try {
        const user = req.user;
        const movieId = req.params.movieId;


        const movieWatchedTime = user.watchedMovies.find(item => item.movie.equals(movieId));

        if (movieWatchedTime) {

            res.json({ success: true, watchedTime: movieWatchedTime.watchedTime });
        } else {

            res.json({ success: true, watchedTime: 0 });
        }
    } catch (error) {

        res.status(500).json({ success: false, error: error.message });
    }
});


router.get('/watched-movies', isLoggedIn, async (req, res) => {
    try {
        const user = req.user;

        if (!user.watchedMovies || user.watchedMovies.length === 0) {
            return res.status(200).json({ success: true, watchedMovies: [] });
        }

        const watchedMovies = await Promise.all(user.watchedMovies.map(async ({ movie, watchedTime, uploadTime }) => {
        
            console.log("Checking movie ID:", movie);
            const movieDetails = await Movie.findById(movie);
            
           
            if (!movieDetails) {
                console.error(`Movie not found for ID: ${movie}`);
                return {
                    movie: { title: "Unknown", id: movie },
                    watchedTime,
                    uploadTime: new Date(uploadTime).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }),
                };
            }

            return {
                movie: {
                    id: movieDetails._id,
                    movieID: movieDetails.movieID,
                    backdropPath: 'https://image.tmdb.org/t/p/original/' + movieDetails.backdropPath,
                    budget: Number(movieDetails.budget) || 0,
                    genreIds: movieDetails.genreIds || [], 
                    genres: movieDetails.genres || [],
                    originalTitle: movieDetails.originalTitle,
                    overview: movieDetails.overview,
                    ratings: Number(movieDetails.ratings) || 0,
                    popularity: Number(movieDetails.popularity) || 0,
                    posterPath: 'https://image.tmdb.org/t/p/original/' + movieDetails.posterPath,
                    productionCompanies: movieDetails.productionCompanies || [],
                    releaseDate: movieDetails.releaseDate,
                    revenue: Number(movieDetails.revenue) || 0,
                    runtime: movieDetails.runtime || 0,
                    status: movieDetails.status,
                    title: movieDetails.title,
                    watchProviders: movieDetails.watchProviders || [],
                    logos: 'https://image.tmdb.org/t/p/original/' + movieDetails.logos,
                    downloadLink: movieDetails.downloadLink || "",
                },
                watchedTime,
                uploadTime: new Date(uploadTime).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }),
            };
        }));

       
        watchedMovies.sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime));
        
        res.status(200).json({ success: true, watchedMovies });
    } catch (error) {
        console.error("Error fetching watched movies:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;



