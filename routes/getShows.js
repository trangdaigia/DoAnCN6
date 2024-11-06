// routes/movies.js
const express = require('express');
const router = express.Router();
const Shows = require('../models/Shows')

// Endpoint to get all movies
router.get('/getAllShows', async (req, res) => {
  try {
    const allShows = await Shows.find();
    res.json(allShows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

const getUniqueGenres = (shows) => {
  const genresSet = new Set();

  // Iterate through each show and add its genres to the set
  shows.forEach((show) => {
    show.genres.forEach((genre) => {
      genresSet.add(genre);
    });
  });

  // Convert the set to an array to get unique genres
  const uniqueGenres = [...genresSet];

  return uniqueGenres;
};

router.get('/getAllShowsGenres', async (req, res) => {
  try {
    // Retrieve all shows from the database
    const allShows = await Shows.find();

    // Extract unique genres from the shows data
    const uniqueGenres = getUniqueGenres(allShows);

    // Send the unique genres as a response
    res.json(uniqueGenres);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/getAllShowsByGenre', async (req, res) => {
  try {
    // Step 1: Fetch all distinct genres
    const distinctGenres = await Shows.distinct('genres');

    // Step 2: For each genre, fetch shows
    const showsByGenre = await Promise.all(
      distinctGenres.map(async (genre) => {
        const shows = await Shows.find({ genres: genre });
        return { genre, shows };
      })
    );

    res.json(showsByGenre);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/searchShows/:showName', async (req, res) => {
  try {
    const { showName } = req.params;

    // Use a case-insensitive regular expression to perform a partial match on show names
    const matchingShows = await Shows.find({ name: { $regex: new RegExp(showName, 'i') } });

    res.json(matchingShows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;