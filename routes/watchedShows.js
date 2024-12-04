const express = require('express');
const router = express.Router();
const isLoggedIn = require('../routes/isLoggedin')
const Shows = require('../models/Shows')

router.get('/all-watched-shows', isLoggedIn, async (req, res) => {
    try {
        const user = req.user; // Lấy thông tin người dùng hiện tại từ middleware isLoggedIn
        const shows = await Shows.find(); // Lấy tất cả chương trình từ MongoDB

        // Tạo danh sách các tập đã xem, bao gồm thông tin chi tiết từng tập
        const watchedShows = await Promise.all(user.watchedShows.map(async ({ _id, episode, watchedTime, uploadTime }) => {
            let episodeInfo = null;

            // Duyệt qua từng chương trình và từng mùa để tìm tập đã xem
            for (const show of shows) {
                for (const season of show.seasons) {
                    const foundEpisode = season.episodes.find(ep => ep._id.toString() === episode.toString());
                    if (foundEpisode) {
                        episodeInfo = {
                            showId: show._id,
                            episodeID: episode,
                            showName: show.name,
                            seasonNumber: season.season_number,
                            showPoster: show.posterPath,
                            episodeNumber: foundEpisode.episode_number,
                            episodePoster: foundEpisode.poster,
                            episodeRuntime: foundEpisode.runtime,
                            episodeLink: foundEpisode.downloadLink,
                            episodeName: foundEpisode.name
                        };
                        break;
                    }
                }
                if (episodeInfo) break;
            }

            return {
                id: _id,
                episodeInfo,
                watchedTime,
                uploadTime,
            };
        }));

        // Sắp xếp danh sách theo thời gian xem (uploadTime giảm dần)
        watchedShows.sort((a, b) => b.uploadTime - a.uploadTime);

        res.json({ success: true, watchedShows }); // Trả về danh sách tập đã xem
    } catch (error) {
        res.status(500).json({ success: false, error: error.message }); // Xử lý lỗi
    }
});



router.post('/update-shows-watched-time/:episodeID', isLoggedIn, async (req, res) => {
    try {
        const user = req.user; // Lấy thông tin người dùng hiện tại
        const episodeID = req.params.episodeID; // Lấy ID tập từ URL
        const watchedTime = req.body.watchedTime; // Thời gian đã xem từ yêu cầu body
        const episodeShowID = req.body.showID; // ID chương trình của tập

        // Tìm tập trong danh sách watchedShows của người dùng
        const episodeToUpdate = user.watchedShows.find(item => item.episode.equals(episodeID));
        if (episodeToUpdate) {
            // Nếu đã có trong danh sách, cập nhật thời gian đã xem và thời gian tải lên
            episodeToUpdate.watchedTime = watchedTime;
            episodeToUpdate.uploadTime = Date.now();
        } else {
            // Nếu chưa có, thêm mới tập vào danh sách
            user.watchedShows.push({ episode: episodeID, showID: episodeShowID, watchedTime, uploadTime: Date.now() });
        }

        await user.save(); // Lưu thông tin người dùng vào MongoDB
        res.json({ success: true, user }); // Trả về người dùng đã cập nhật
    } catch (error) {
        res.status(500).json({ success: false, error: error.message }); // Xử lý lỗi
    }
});



router.get('/get-show-watchtime/:episodeID', isLoggedIn, async (req, res) => {
    try {
        const user = req.user; // Lấy thông tin người dùng
        const episodeID = req.params.episodeID; // Lấy ID tập từ URL

        // Tìm tập trong danh sách watchedShows của người dùng
        const watchedEpisode = user.watchedShows.find(item => item.episode.equals(episodeID));

        if (watchedEpisode) {
            res.json({ success: true, watchedTime: watchedEpisode.watchedTime }); // Trả về thời gian đã xem
        } else {
            res.status(404).json({ success: false, message: 'Episode not found in watchedShows' }); // Nếu không tìm thấy
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message }); // Xử lý lỗi
    }
});


router.delete('/remove-watched-show/:episodeID', isLoggedIn, async (req, res) => {
    try {
        const user = req.user; // Lấy thông tin người dùng
        const episodeID = req.params.episodeID; // Lấy ID tập từ URL

        // Tìm vị trí của tập trong danh sách watchedShows
        const indexToRemove = user.watchedShows.findIndex(item => item.episode.equals(episodeID));

        if (indexToRemove !== -1) {
            user.watchedShows.splice(indexToRemove, 1); // Xóa tập khỏi danh sách
            await user.save(); // Lưu thông tin người dùng vào MongoDB
            res.json({ success: true, user }); // Trả về người dùng đã cập nhật
        } else {
            res.status(404).json({ success: false, message: 'Episode not found in watchedShows' }); // Nếu không tìm thấy
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message }); // Xử lý lỗi
    }
});



router.get('/episode-info/:episodeId', async (req, res) => {
    try {
        const episodeId = req.params.episodeId; // Lấy ID tập từ URL
        const shows = await Shows.find(); // Lấy tất cả chương trình từ MongoDB
        let seasonArray = null; // Mảng chứa danh sách tập của mùa
        let showID = null; // ID chương trình chứa tập

        // Tìm tập trong các chương trình và mùa
        for (const show of shows) {
            for (const season of show.seasons) {
                const foundEpisode = season.episodes.find(ep => ep._id.toString() === episodeId);

                if (foundEpisode) {
                    seasonArray = season.episodes; // Lấy danh sách tập của mùa
                    showID = show._id; // Lấy ID chương trình
                    break;
                }
            }
            if (seasonArray) break; // Thoát khỏi vòng lặp nếu tìm thấy
        }

        if (seasonArray) {
            res.json({ success: true, showID, seasonArray }); // Trả về danh sách tập và ID chương trình
        } else {
            res.status(404).json({ success: false, message: 'Episode not found' }); // Nếu không tìm thấy
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message }); // Xử lý lỗi
    }
});


// This will generate the latest episode ID watched by the user from a particular show
router.get('/get-latest-watched-episodeID/:showID', isLoggedIn, async (req, res) => {
    try {
        const { showID } = req.params; // Lấy ID chương trình từ URL
        const user = req.user; // Lấy thông tin người dùng
        const watchedShows = user.watchedShows.filter(show => show.showID.toString() === showID); // Lọc tập thuộc chương trình

        if (watchedShows.length === 0) {
            return res.json({ episodeID: null }); // Nếu không có tập đã xem
        }

        // Sắp xếp tập đã xem theo thời gian tải lên (mới nhất trước)
        watchedShows.sort((a, b) => b.uploadTime - a.uploadTime);

        const latestEpisodeID = watchedShows[0].episode; // Lấy ID tập mới nhất
        res.json({ episodeID: latestEpisodeID }); // Trả về ID tập mới nhất
    } catch (error) {
        res.status(500).json({ success: false, error: error.message }); // Xử lý lỗi
    }
});


module.exports = router;