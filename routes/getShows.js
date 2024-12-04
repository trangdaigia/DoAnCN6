// Import Express framework
const express = require('express');
const router = express.Router();

// Import MongoDB model cho Shows
const Shows = require('../models/Shows');

// Route: /getAllShows - Lấy danh sách tất cả các chương trình truyền hình
router.get('/getAllShows', async (req, res) => {
  try {
    // Lấy tất cả chương trình từ MongoDB
    const allShows = await Shows.find();

    // Trả về danh sách dưới dạng JSON
    res.json(allShows);
  } catch (error) {
    console.error(error);

    // Xử lý lỗi nếu không thể lấy dữ liệu
    res.status(500).send('Internal Server Error');
  }
});

// Hàm phụ trợ: Lấy danh sách các thể loại duy nhất từ danh sách chương trình
const getUniqueGenres = (shows) => {
  const genresSet = new Set();

  // Lặp qua từng chương trình và thêm thể loại của nó vào Set
  shows.forEach((show) => {
    show.genres.forEach((genre) => {
      genresSet.add(genre);
    });
  });

  // Chuyển Set thành mảng để lấy danh sách thể loại duy nhất
  const uniqueGenres = [...genresSet];

  return uniqueGenres;
};

// Route: /getAllShowsGenres - Lấy danh sách các thể loại duy nhất từ các chương trình
router.get('/getAllShowsGenres', async (req, res) => {
  try {
    // Lấy tất cả chương trình từ MongoDB
    const allShows = await Shows.find();

    // Lấy danh sách thể loại duy nhất bằng hàm `getUniqueGenres`
    const uniqueGenres = getUniqueGenres(allShows);

    // Trả về danh sách thể loại dưới dạng JSON
    res.json(uniqueGenres);
  } catch (error) {
    console.error(error);

    // Xử lý lỗi nếu không thể lấy dữ liệu
    res.status(500).send('Internal Server Error');
  }
});

// Route: /getAllShowsByGenre - Lấy danh sách chương trình theo từng thể loại
router.get('/getAllShowsByGenre', async (req, res) => {
  try {
    // Bước 1: Lấy tất cả các thể loại duy nhất từ MongoDB
    const distinctGenres = await Shows.distinct('genres');

    // Bước 2: Với mỗi thể loại, tìm các chương trình thuộc thể loại đó
    const showsByGenre = await Promise.all(
      distinctGenres.map(async (genre) => {
        const shows = await Shows.find({ genres: genre });
        return { genre, shows }; // Trả về đối tượng chứa thể loại và các chương trình thuộc thể loại đó
      })
    );

    // Trả về danh sách chương trình theo thể loại dưới dạng JSON
    res.json(showsByGenre);
  } catch (error) {
    console.error(error);

    // Xử lý lỗi nếu không thể lấy dữ liệu
    res.status(500).send('Internal Server Error');
  }
});

// Route: /searchShows/:showName - Tìm kiếm chương trình theo tên (tìm kiếm một phần, không phân biệt chữ hoa/thường)
router.get('/searchShows/:showName', async (req, res) => {
  try {
    const { showName } = req.params; // Lấy tên chương trình từ URL

    // Sử dụng Regular Expression để tìm kiếm không phân biệt chữ hoa/thường
    const matchingShows = await Shows.find({ name: { $regex: new RegExp(showName, 'i') } });

    // Trả về danh sách các chương trình phù hợp
    res.json(matchingShows);
  } catch (error) {
    console.error(error);

    // Xử lý lỗi nếu không thể tìm kiếm
    res.status(500).send('Internal Server Error');
  }
});

// Export router để sử dụng trong ứng dụng chính
module.exports = router;
