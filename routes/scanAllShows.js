require('dotenv').config(); // Quản lý biến môi trường từ file .env
const express = require('express'); // Framework Express để tạo router
const router = express.Router(); // Tạo đối tượng router
const Shows = require('../models/Shows'); // Mô hình MongoDB cho chương trình truyền hình
const User = require('../models/User'); // Mô hình MongoDB cho người dùng
const path = require('path'); // Thư viện Node.js để xử lý đường dẫn
const fs = require('fs'); // Thư viện Node.js để thao tác với hệ thống file

// Thư mục chứa các chương trình truyền hình (lấy từ biến môi trường)
const directory = process.env.SHOWS_DIR;
const absolutePath = path.resolve(directory); // Lấy đường dẫn tuyệt đối đến thư mục

let clients = []; // Danh sách các client kết nối với server qua SSE (Server-Sent Events)

// Hàm đệ quy quét thư mục để lấy danh sách file, tiêu đề chương trình, và đường dẫn file
async function scanDirectory(dir, filenames = [], titles = [], filepaths = [], ignoredShowDirNames = []) {
    const files = fs.readdirSync(dir); // Đọc danh sách file/thư mục trong thư mục hiện tại

    for (const file of files) {
        const filePath = path.join(dir, file); // Lấy đường dẫn đầy đủ của file/thư mục
        const stat = fs.statSync(filePath); // Kiểm tra xem đây là file hay thư mục

        if (stat.isDirectory()) { // Nếu là thư mục
            if (ignoredShowDirNames.includes(file)) { // Kiểm tra xem thư mục có bị bỏ qua không
                console.log(`Skipping ignored directory: ${file}`); // Ghi log thư mục bị bỏ qua
                continue; // Bỏ qua thư mục này
            }
            await scanDirectory(filePath, filenames, titles, filepaths, ignoredShowDirNames); // Đệ quy vào thư mục con
        } else { // Nếu là file
            // Tìm tiêu đề chương trình dựa trên định dạng file (ví dụ: "ShowName.S01E01")
            const showTitleMatch = file.match(/^(.+?)\.S\d{2}/);
            let showTitle = showTitleMatch ? showTitleMatch[1] : file; // Lấy tiêu đề nếu khớp
            showTitle = showTitle.replace(/\./g, ' '); // Thay thế dấu chấm bằng khoảng trắng
            if (!titles.includes(showTitle)) { // Nếu tiêu đề chưa có trong danh sách
                titles.push(showTitle); // Thêm tiêu đề vào danh sách
            }
            const filefullpath = path.join(dir, file); // Đường dẫn đầy đủ của file
            const filepathWithoutPrefix = filefullpath
                .replace(/.*?TV Shows\\/, '') // Loại bỏ prefix "TV Shows\"
                .replace(/\\/g, '/'); // Thay dấu "\" bằng "/"
            filenames.push(file); // Thêm tên file vào danh sách
            filepaths.push(filepathWithoutPrefix); // Thêm đường dẫn file vào danh sách
        }
    }

    // Trả về kết quả gồm tiêu đề, tên file và đường dẫn file
    return { titles, filenames, filepaths };
}

// Hàm lấy chi tiết chương trình từ TMDB dựa trên showID
async function fetchDetailedShowDetails(showID, options) {
    const url = `https://api.themoviedb.org/3/tv/${showID}?language=en-US`; // URL API TMDB
    const showsData = await fetch(url, options); // Gửi yêu cầu API
    const showsDetails = await showsData.json(); // Lấy kết quả JSON

    if (!showsDetails) { // Kiểm tra nếu không có dữ liệu trả về
        return null; // Trả về null
    }

    // Lấy danh sách thể loại và chuyển đổi sang mảng ID và tên
    const genreIds = showsDetails.genres.map(genre => genre.id);
    const genreNames = showsDetails.genres.map(genre => genre.name);

    showsDetails.genreIds = genreIds; // Thêm mảng ID thể loại vào showsDetails
    showsDetails.genres = genreNames; // Thêm mảng tên thể loại vào showsDetails

    const numOfSeasons = showsDetails.number_of_seasons; // Lấy số lượng mùa

    showsDetails.seasons = []; // Tạo mảng để lưu thông tin từng mùa

    // Lặp qua từng mùa để lấy thông tin
    for (let i = 1; i <= numOfSeasons; i++) {
        const seasonUrl = `https://api.themoviedb.org/3/tv/${showID}/season/${i}?language=en-US`; // URL API cho từng mùa
        const response = await fetch(seasonUrl, options); // Gửi yêu cầu API
        const seasonData = await response.json(); // Lấy kết quả JSON

        // Map thông tin từng tập
        const episodes = seasonData.episodes.map(episode => ({
            episode_number: episode.episode_number, // Số tập
            name: episode.name, // Tên tập
            runtime: episode.runtime, // Thời lượng
            overview: episode.overview, // Mô tả
            poster: "https://image.tmdb.org/t/p/original" + episode.still_path, // Poster của tập
            downloadLink: "" // Placeholder cho liên kết tải xuống
        }));

        // Thêm thông tin mùa và tập vào danh sách
        showsDetails.seasons.push({
            season_number: seasonData.season_number,
            episodes: episodes
        });
    }

    // Chuẩn hóa dữ liệu trả về
    return {
        first_air_date: showsDetails.first_air_date, // Ngày phát sóng đầu tiên
        genres: showsDetails.genres, // Danh sách thể loại
        id: showsDetails.id, // ID chương trình
        name: showsDetails.name, // Tên chương trình
        overview: showsDetails.overview, // Mô tả chương trình
        poster_path: "https://image.tmdb.org/t/p/original" + showsDetails.poster_path, // Poster chính
        backdrop_path: "https://image.tmdb.org/t/p/original" + showsDetails.backdrop_path, // Ảnh nền
        vote_average: showsDetails.vote_average, // Điểm đánh giá
        seasons: showsDetails.seasons // Danh sách mùa và tập
    };
}

// Hàm thêm liên kết tải xuống vào từng tập
async function addDownloadLink(shows, filePaths) {
    shows.forEach(show => {
        const { showDetails } = show; // Lấy chi tiết chương trình
        const { seasons } = showDetails; // Lấy danh sách mùa

        // Lặp qua từng mùa
        seasons.forEach(season => {
            const { season_number, episodes } = season; // Lấy số mùa và danh sách tập

            episodes.forEach(episode => { // Lặp qua từng tập
                const formattedSeason = String(season_number).padStart(2, '0'); // Định dạng số mùa
                const formattedEpisode = String(episode.episode_number).padStart(2, '0'); // Định dạng số tập
                const episodeDesignation = `S${formattedSeason}E${formattedEpisode}`; // Gắn nhãn tập

                // Tìm file khớp với tiêu đề chương trình và số tập
                const matchingFilePath = filePaths.find(filePath =>
                    filePath.toLowerCase().includes(showDetails.name.replace(/:/g, '').replace(/,/g, '').replace(/\s/g, '.').toLowerCase()) &&
                    filePath.toLowerCase().includes(episodeDesignation.toLowerCase())
                );

                const filePathWithoutPrefix = matchingFilePath
                    ? `${process.env.HTTP_SERVER_ADDR}/shows/${matchingFilePath.replace(/^.*?shows[\\/]/i, '').replace(/\s/g, '%20')}`
                    : "Filepath not found"; // Nếu không tìm thấy file, trả về "Filepath not found"

                episode.downloadLink = filePathWithoutPrefix; // Gán liên kết tải xuống vào tập
            });
        });
    });

    return shows; // Trả về danh sách chương trình đã cập nhật liên kết tải xuống
}




router.post('/scanAllLocalShows', async (req, res) => {
    try {
        // Đặt lại danh sách watchedShows và showsMylist của tất cả người dùng
        await User.updateMany({}, { $set: { watchedShows: [], showsMylist: [] } });

        // Xóa tất cả chương trình không được đánh dấu `ignoreTitleOnScan`
        await Shows.deleteMany({ ignoreTitleOnScan: { $ne: true } });

        // Lấy danh sách các thư mục bị bỏ qua (ignoreTitleOnScan = true)
        const ignoredShows = await Shows.find({ ignoreTitleOnScan: true }, 'showDirName');
        const ignoredShowDirNames = ignoredShows.map(show => show.showDirName);
        console.log("Ignored shows are", ignoredShowDirNames);

        // Gửi phản hồi xác nhận việc quét đã bắt đầu
        res.status(200).send({ message: 'Processing started' });

        // Quét thư mục cục bộ để lấy tiêu đề, tên file, và đường dẫn file
        const { titles, filenames, filepaths } = await scanDirectory(absolutePath, [], [], [], ignoredShowDirNames);

        const shows = []; // Danh sách lưu các chương trình đã xử lý
        const totalShows = titles.length; // Tổng số chương trình tìm thấy
        let processedShows = 0; // Biến đếm số chương trình đã xử lý

        // Lặp qua từng tiêu đề chương trình
        for (const title of titles) {
            // Gửi cập nhật tiến trình qua SSE cho các client
            clients.forEach(client => {
                client.res.write(`data: ${JSON.stringify({ index: processedShows + 1, total: totalShows, title: title })}\n\n`);
            });

            const url = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(title)}&include_adult=false&language=en-US&page=1`;
            const options = {
                method: 'GET',
                headers: {
                    accept: 'application/json',
                    Authorization: process.env.TMDB_AUTH_KEY
                }
            };

            try {
                // Gửi yêu cầu tìm kiếm chương trình đến TMDB
                const responseData = await fetch(url, options);
                const result = await responseData.json();

                // Nếu tìm thấy kết quả từ TMDB
                if (result && result.results && result.results.length > 0) {
                    const showID = result.results[0].id; // Lấy ID chương trình đầu tiên trong danh sách
                    const showDetails = await fetchDetailedShowDetails(showID, options); // Lấy chi tiết chương trình

                    if (showDetails) {
                        shows.push({ showDetails }); // Thêm chương trình vào danh sách
                    }
                }
            } catch (error) {
                console.error(`Error fetching details for ${title}:`, error); // Log lỗi nếu xảy ra
            }
            processedShows++; // Tăng biến đếm
        }

        // Cập nhật liên kết tải xuống cho từng chương trình
        const modifiedShowDetails = await addDownloadLink(shows, filepaths);

        // Lưu từng chương trình vào cơ sở dữ liệu
        for (const modifiedShow of modifiedShowDetails) {
            try {
                // Kiểm tra xem chương trình đã tồn tại trong database chưa
                const existingShow = await Shows.findOne({ name: modifiedShow.showDetails.name });
                if (existingShow) {
                    console.log(`Show '${modifiedShow.showDetails.name}' already exists. Skipping...`); // Bỏ qua nếu đã tồn tại
                } else {
                    // Tạo document mới và lưu vào database
                    const newShowsDocument = new Shows({
                        genres: modifiedShow.showDetails.genres,
                        overview: modifiedShow.showDetails.overview,
                        posterPath: modifiedShow.showDetails.poster_path,
                        backdropPath: modifiedShow.showDetails.backdrop_path,
                        releaseDate: new Date(modifiedShow.showDetails.first_air_date),
                        name: modifiedShow.showDetails.name,
                        ratings: modifiedShow.showDetails.vote_average,
                        ignoreTitleOnScan: 'false',
                        showDirName: '',
                        seasons: modifiedShow.showDetails.seasons.map(season => ({
                            season_number: season.season_number,
                            episodes: season.episodes.map(episode => ({
                                episode_number: episode.episode_number,
                                name: episode.name,
                                runtime: episode.runtime,
                                overview: episode.overview,
                                poster: episode.poster,
                                downloadLink: episode.downloadLink
                            }))
                        }))
                    });

                    await newShowsDocument.save(); // Lưu chương trình vào MongoDB
                }
            } catch (error) {
                console.error('Error saving show to MongoDB:', error); // Log lỗi khi lưu dữ liệu
            }
        }

        // Gửi cập nhật hoàn thành cho tất cả client SSE
        console.log('Sending completion update to all clients');
        clients.forEach(client => client.res.write('data: {"complete": true}\n\n'));
        clients.forEach(client => client.res.end()); // Kết thúc kết nối SSE
        clients.length = 0; // Xóa danh sách client
    } catch (error) {
        console.error('Error scanning shows:', error); // Log lỗi trong toàn bộ quá trình quét
        res.status(500).send('Internal Server Error'); // Phản hồi lỗi
    }
});



router.get('/progress-shows', (req, res) => {
    console.log('Client connected for progress updates');

    // Cấu hình header để thiết lập SSE
    res.setHeader('Content-Type', 'text/event-stream'); // Định dạng dữ liệu SSE
    res.setHeader('Cache-Control', 'no-cache'); // Không cache dữ liệu
    res.setHeader('Connection', 'keep-alive'); // Giữ kết nối mở
    res.flushHeaders(); // Flush header để bắt đầu gửi dữ liệu ngay

    // Thêm client vào danh sách theo dõi
    clients.push({ res });
    console.log('Number of connected clients:', clients.length);

    // Xử lý khi client đóng kết nối
    req.on('close', () => {
        clients = clients.filter(client => client.res !== res); // Xóa client đã ngắt kết nối khỏi danh sách
        console.log('Client disconnected, remaining clients:', clients.length);
    });
});



module.exports = router; // Xuất router để sử dụng trong ứng dụng chính
