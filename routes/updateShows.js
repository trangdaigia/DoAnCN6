const express = require('express'); // Import Express.js framework
const router = express.Router(); // Tạo đối tượng router
const Shows = require('../models/Shows'); // Import mô hình MongoDB cho Shows

// Route: Lấy danh sách tất cả các chương trình để chỉnh sửa
router.get('/edit-shows-list', async (req, res) => {
    try {
        const shows = await Shows.find(); // Truy vấn tất cả chương trình từ MongoDB
        console.log("TV Shows list are", shows); // Ghi log danh sách chương trình
        res.render('editShowList', { shows }); // Render trang editShowList với dữ liệu từ MongoDB
    } catch (error) {
        console.error(error); // Log lỗi nếu xảy ra
        res.status(500).send('Internal Server Error'); // Trả về lỗi 500 nếu có vấn đề
    }
});

// Route: Lấy chi tiết một chương trình cụ thể theo ID
router.get('/shows/:id', async (req, res) => {
    try {
        const show = await Shows.findById(req.params.id); // Tìm chương trình theo ID trong MongoDB
        console.log("TV Show details update", show); // Ghi log chi tiết chương trình
        res.render('updateShowsDetail', { showsDetails: show }); // Render trang updateShowsDetail với chi tiết chương trình
    } catch (error) {
        console.error(error); // Log lỗi nếu xảy ra
        res.status(500).send('Internal Server Error'); // Trả về lỗi 500 nếu có vấn đề
    }
});

// Route: Cập nhật thông tin chương trình theo ID
router.post('/update-show/:id', async (req, res) => {
    try {
        const existingShow = await Shows.findById(req.params.id); // Kiểm tra chương trình có tồn tại không

        if (!existingShow) { // Nếu chương trình không tồn tại
            return res.status(404).send('Show not found'); // Trả về lỗi 404
        }

        console.log("Request body", req.body); // Ghi log dữ liệu yêu cầu từ client

        // Cập nhật thông tin chương trình trong MongoDB
        await Shows.findByIdAndUpdate(
            req.params.id, // ID của chương trình cần cập nhật
            {
                // Cập nhật thông tin cơ bản của chương trình
                genres: req.body.showDetails.genres.split(',').map(genre => genre.trim()), // Chuyển danh sách thể loại thành mảng
                name: req.body.showDetails.name, // Tên chương trình
                overview: req.body.showDetails.overview, // Mô tả chương trình
                ratings: Number(req.body.showDetails.vote_average), // Điểm đánh giá
                posterPath: req.body.showDetails.poster_path, // Đường dẫn poster
                backdropPath: req.body.showDetails.backdrop_path, // Đường dẫn ảnh nền
                releaseDate: req.body.showDetails.first_air_date, // Ngày phát hành

                // Cập nhật danh sách mùa và tập
                seasons: req.body.seasons.map(season => ({
                    season_number: Number(season.season_number), // Số mùa
                    episodes: season.episodes.map(episode => ({
                        episode_number: Number(episode.episode_number), // Số tập
                        name: episode.name, // Tên tập
                        runtime: Number(episode.runtime), // Thời lượng tập
                        overview: episode.overview, // Mô tả tập
                        poster: episode.poster, // Poster tập
                        downloadLink: episode.downloadLink // Liên kết tải xuống
                    }))
                }))
            },
            { new: true } // Tùy chọn để trả về tài liệu đã cập nhật
        );

        res.json({ success: true }); // Trả về phản hồi JSON xác nhận cập nhật thành công
    } catch (error) {
        console.error(error); // Log lỗi nếu xảy ra
        res.status(500).send('Internal Server Error'); // Trả về lỗi 500 nếu có vấn đề
    }
});

module.exports = router; // Xuất router để sử dụng trong ứng dụng chính
