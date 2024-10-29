const express = require('express');
const router = express.Router();
const isLoggedIn = require('../routes/isLoggedIn');
const Movie = require('../models/movie');

// Cập nhật thời gian xem của một bộ phim
router.post('/update-watched-time/:movieId', isLoggedIn, async (req, res) => {
    try {
        const user = req.user;
        const movieId = req.params.movieId;
        const watchedTime = req.body.watchedTime;

        const movieToUpdate = user.watchedMovies.find(item => item.movie.equals(movieId));
        console.log("Movie to update", movieToUpdate);

        // Lấy thời gian hiện tại thay vì giá trị cứng
        const currentTime = new Date();

        if (movieToUpdate) {
            movieToUpdate.watchedTime = watchedTime;
            movieToUpdate.uploadTime = currentTime;  // Thời gian hiện tại
        } else {
            user.watchedMovies.push({
                movie: movieId,
                watchedTime: watchedTime,
                uploadTime: currentTime  // Thời gian hiện tại
            });
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "Watched time updated successfully",
            watchedMovies: user.watchedMovies
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// Xoá thời gian xem của một bộ phim
router.post('/remove-watched-time/:movieId', isLoggedIn, async (req, res) => {
    try {
        const user = req.user;
        const { movieId } = req.params;

        const movieIndexToRemove = user.watchedMovies.findIndex(item => item.movie.equals(movieId));

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

// Xoá toàn bộ danh sách phim đã xem
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

// Lấy thời gian xem của một phim cụ thể
router.get('/watched-time/:movieId', isLoggedIn, async (req, res) => {
    try {
        const user = req.user;
        const { movieId } = req.params;

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

// Lấy danh sách toàn bộ phim đã xem
router.get('/watched-movies', isLoggedIn, async (req, res) => {
    try {
        const user = req.user;

        if (!user.watchedMovies || user.watchedMovies.length === 0) {
            return res.status(200).json({ success: true, watchedMovies: [] });
        }

        const watchedMovies = await Promise.all(user.watchedMovies.map(async ({ movie, watchedTime, uploadTime }) => {
            const movieDetails = await Movie.findById(movie);

            if (!movieDetails) {
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
                    backdropPath: `https://image.tmdb.org/t/p/original/${movieDetails.backdropPath}`,
                    budget: Number(movieDetails.budget) || 0,
                    genreIds: movieDetails.genreIds || [], 
                    genres: movieDetails.genres || [],
                    originalTitle: movieDetails.originalTitle,
                    overview: movieDetails.overview,
                    ratings: Number(movieDetails.ratings) || 0,
                    popularity: Number(movieDetails.popularity) || 0,
                    posterPath: `https://image.tmdb.org/t/p/original/${movieDetails.posterPath}`,
                    productionCompanies: movieDetails.productionCompanies || [],
                    releaseDate: movieDetails.releaseDate,
                    revenue: Number(movieDetails.revenue) || 0,
                    runtime: movieDetails.runtime || 0,
                    status: movieDetails.status,
                    title: movieDetails.title,
                    watchProviders: movieDetails.watchProviders || [],
                    logos: `https://image.tmdb.org/t/p/original/${movieDetails.logos}`,
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
