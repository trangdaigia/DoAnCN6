// Import Express framework
const express = require('express');
const router = express.Router();

// Import mô hình MongoDB cho Shows
const Shows = require('../models/Shows');

// Route: /delete-show - Hiển thị danh sách các chương trình có thể xóa
router.get('/delete-show', async (req, res) => {
    try {
        // Lấy danh sách tất cả chương trình truyền hình từ MongoDB
        const shows = await Shows.find();
        console.log("Delete Shows", shows);

        // Render trang deleteShow với danh sách các chương trình
        res.render('deleteShow', { shows });
    } catch (error) {
        console.error(error);

        // Xử lý lỗi nếu xảy ra vấn đề trong quá trình lấy dữ liệu
        res.status(500).send('Internal Server Error');
    }
});

// Route: /delete-show/:id - Xóa chương trình theo ID
router.post('/delete-show/:id', async (req, res) => {
    try {
        // Tìm và xóa chương trình theo ID được cung cấp từ URL
        const deleteShow = await Shows.findOneAndDelete({ _id: req.params.id });

        // *** Tùy chọn: Nếu bạn muốn xóa chương trình khỏi danh sách của người dùng ***
        // Xóa chương trình khỏi danh sách "mylist" của tất cả người dùng
        // await User.updateMany({}, { $pull: { mylist: req.params.id } });

        // Xóa chương trình khỏi danh sách "watchedMovies" của tất cả người dùng
        // await User.updateMany({}, { $pull: { "watchedMovies": { movie: req.params.id } } });

        // Lấy lại danh sách chương trình sau khi đã xóa
        const shows = await Shows.find();

        // Render trang deleteShow với danh sách cập nhật và thông báo thành công
        res.render('deleteShow', { shows, successMessage: 'Movie deleted successfully!' });
    } catch (error) {
        console.error(error);

        // Xử lý lỗi nếu xảy ra vấn đề trong quá trình xóa
        res.status(500).send('Internal Server Error');
    }
});

// Export router để sử dụng trong ứng dụng chính
module.exports = router;
