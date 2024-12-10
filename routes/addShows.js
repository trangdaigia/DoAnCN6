// Import dotenv để quản lý biến môi trường
require('dotenv').config();

// Import Express framework
const express = require('express');
const router = express.Router();

// Import mô hình MongoDB cho Shows
const Shows = require('../models/Shows');

// Route: /fetch-shows - Tìm kiếm chương trình truyền hình dựa trên từ khóa
router.post('/fetch-shows', async (req, res) => {
    // Lấy từ khóa tìm kiếm từ request body
    let search_term = req.body.searchTerm;
    console.log("Search Term is", search_term);

    try {
        // URL API TMDB để tìm kiếm chương trình
        const url = `https://api.themoviedb.org/3/search/tv?query=${search_term}&include_adult=false&language=en-US&page=1`;

        // Cấu hình header để xác thực API
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: process.env.TMDB_AUTH_KEY
            }
        };

        // Gửi yêu cầu đến API TMDB
        const responseData = await fetch(url, options);
        const result = await responseData.json();

        // Kiểm tra nếu không có kết quả
        if (result.results.length === 0) {
            return res.status(404).json({ error: 'No TV Shows found with the given search term' });
        }

        // Render trang addShowsList với danh sách chương trình tìm thấy
        res.render('addShowsList', { showsList: result.results });
    } catch (error) {
        console.error(error);
        // Xử lý lỗi và trả về phản hồi lỗi
        res.status(500).json({ error: 'Failed to fetch TV Show details' });
    }
});

// Route: /addShows/:showID - Lấy thông tin chi tiết chương trình truyền hình
router.get('/addShows/:showID', async (req, res) => {
    const showID = req.params.showID; // Lấy showID từ URL

    try {
        // URL API để lấy thông tin chi tiết chương trình
        const url = `https://api.themoviedb.org/3/tv/${showID}?language=en-US`;

        // Cấu hình header để xác thực API
        const options = {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: process.env.TMDB_AUTH_KEY
            }
        };

        // Gửi yêu cầu đến API TMDB
        const showsData = await fetch(url, options);
        const showsDetails = await showsData.json();

        // Lấy danh sách thể loại và tên thể loại
        const genreIds = showsDetails.genres.map(genre => genre.id);
        const genreNames = showsDetails.genres.map(genre => genre.name);
        console.log("Genre Names are as follows", genreNames);

        // Định dạng lại các trường cần thiết
        showsDetails.production_companies = showsDetails.production_companies.map(company => company.name);
        showsDetails.genreIds = genreIds;
        showsDetails.genres = genreNames;

        console.log("TV Shows Details", showsDetails);

        // Lấy số mùa của chương trình
        const numOfSeasons = showsDetails.number_of_seasons;
        console.log("Number of seasons", numOfSeasons);

        showsDetails.seasons = []; // Tạo mảng để lưu thông tin các mùa

        // Lấy thông tin từng mùa và các tập trong mùa
        for (let i = 1; i <= numOfSeasons; i++) {
            const seasonUrl = `https://api.themoviedb.org/3/tv/${showID}/season/${i}?language=en-US`;
            const response = await fetch(seasonUrl, options);
            const seasonData = await response.json();

            // Map thông tin từng tập
            const episodes = seasonData.episodes.map(episode => ({
                episode_number: episode.episode_number,
                name: episode.name,
                runtime: episode.runtime,
                overview: episode.overview,
                poster: "https://image.tmdb.org/t/p/original" + episode.still_path,
                downloadLink: "" // Placeholder cho liên kết tải xuống
            }));

            // Thêm thông tin mùa và tập vào danh sách
            showsDetails.seasons.push({
                season_number: seasonData.season_number,
                episodes: episodes
            });
        }

        // Chuẩn hóa dữ liệu để gửi đến client
        const selectedShowDetails = {
            first_air_date: showsDetails.first_air_date,
            genres: showsDetails.genres,
            id: showsDetails.id,
            name: showsDetails.name,
            overview: showsDetails.overview,
            poster_path: "https://image.tmdb.org/t/p/original" + showsDetails.poster_path,
            backdrop_path: "https://image.tmdb.org/t/p/original" + showsDetails.backdrop_path,
            vote_average: showsDetails.vote_average,
            seasons: showsDetails.seasons
        };

        // Render trang addShows với thông tin chi tiết
        res.render('addShows', { showsDetails: selectedShowDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch TV Shows details' });
    }
});

// Route: /add-show-details - Lưu thông tin chương trình vào cơ sở dữ liệu
router.post('/add-show-details', async (req, res) => {
    try {
        const showsDetailsData = req.body; // Lấy dữ liệu từ request body
        console.log("Show Details on adding", showsDetailsData);

        // Tạo document mới trong MongoDB
        const newShowsDocument = new Shows({
            genres: showsDetailsData.showDetails.genres.replaceAll('amp;', '').split(',').map(genre => genre.trim()),
            overview: showsDetailsData.showDetails.overview,
            posterPath: showsDetailsData.showDetails.poster_path,
            backdropPath: showsDetailsData.showDetails.backdrop_path,
            releaseDate: new Date(showsDetailsData.showDetails.first_air_date),
            name: showsDetailsData.showDetails.name,
            ratings: Number(showsDetailsData.showDetails.vote_average),
            ignoreTitleOnScan: showsDetailsData.showDetails.ignoreTitleOnScan,
            showDirName: showsDetailsData.showDetails.showDirName,
            seasons: showsDetailsData.seasons.map(season => ({
                season_number: Number(season.season_number),
                episodes: season.episodes.map(episode => ({
                    episode_number: Number(episode.episode_number),
                    name: episode.name,
                    runtime: Number(episode.runtime),
                    overview: episode.overview,
                    poster: episode.poster,
                    downloadLink: episode.downloadLink
                }))
            }))
        });

        // Lưu document vào MongoDB
        const savedShows = await newShowsDocument.save();
        console.log('Shows details saved successfully:', savedShows);

        // Phản hồi thành công
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit movie details' });
    }
});

module.exports = router; // Export router để sử dụng trong ứng dụng
