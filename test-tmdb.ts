import { searchTmdb, getMovieDetails, searchAndGetMovieDetails } from "./src/movie-agent/tmdb.js";

async function testTmdbFeatures() {
  console.log("🎬 Testing Enhanced TMDB API Features\n");

  try {
    // Test 1: Basic movie search
    console.log("1️⃣ Testing basic movie search:");
    const searchResults = await searchTmdb("movie", "The Dark Knight", { year: 2008 });
    console.log(`Found ${searchResults.results.length} movies`);
    const firstMovie = searchResults.results[0];
    if (firstMovie) {
      console.log(`- ${firstMovie.title} (${firstMovie.release_date}) - ID: ${firstMovie.id}`);
    }
    console.log("");

    // Test 2: Get movie details
    if (firstMovie) {
      console.log("2️⃣ Testing movie details with append_to_response:");
      const movieDetails = await getMovieDetails(firstMovie.id, ['videos', 'credits']);
      console.log(`- Title: ${movieDetails.title}`);
      console.log(`- Runtime: ${movieDetails.runtime} minutes`);
      console.log(`- Budget: $${movieDetails.budget?.toLocaleString()}`);
      console.log(`- Cast count: ${movieDetails.credits?.cast?.length || 0}`);
      console.log(`- Video count: ${movieDetails.videos?.results?.length || 0}`);
      console.log("");
    }

    // Test 3: Combined search + details
    console.log("3️⃣ Testing combined search with details:");
    const detailedMovies = await searchAndGetMovieDetails("Inception", { maxResults: 2 });
    console.log(`Found ${detailedMovies.length} movies with full details`);
    detailedMovies.forEach((movie, index) => {
      console.log(`- ${index + 1}. ${movie.title} (${movie.release_date})`);
      console.log(`  Runtime: ${movie.runtime} min, Cast: ${movie.credits?.cast?.length || 0}`);
    });
    console.log("");

    // Test 4: Multi-search
    console.log("4️⃣ Testing multi-search:");
    const multiResults = await searchTmdb("multi", "Christopher Nolan");
    console.log(`Multi-search found ${multiResults.results.length} results`);
    multiResults.results.slice(0, 3).forEach((result, index) => {
      const type = result.media_type;
      const name = result.title || result.name || 'Unknown';
      console.log(`- ${index + 1}. ${name} (${type})`);
    });

    console.log("\n✅ All tests completed successfully!");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  testTmdbFeatures();
} 