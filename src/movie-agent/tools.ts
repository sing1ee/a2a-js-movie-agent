import { registerTool, type ToolDefinition } from "./openai.js";
import { searchTmdb, getMovieDetails, searchAndGetMovieDetails } from "./tmdb.js";

/**
 * Helper function to add full URLs to image paths
 */
function addImageUrls<T extends { poster_path?: string; backdrop_path?: string; profile_path?: string }>(item: T): T {
  const result = { ...item };
  
  if (result.poster_path) {
    result.poster_path = `https://image.tmdb.org/t/p/w500${result.poster_path}`;
  }
  if (result.backdrop_path) {
    result.backdrop_path = `https://image.tmdb.org/t/p/w500${result.backdrop_path}`;
  }
  if (result.profile_path) {
    result.profile_path = `https://image.tmdb.org/t/p/w500${result.profile_path}`;
  }
  
  return result;
}

// search movies tool implementation
async function searchMoviesImpl({ 
  query, 
  year, 
  includeAdult = false 
}: { 
  query: string; 
  year?: number; 
  includeAdult?: boolean; 
}) {
  console.log("[tmdb:searchMovies]", JSON.stringify({ query, year, includeAdult }));
  try {
    const data = await searchTmdb("movie", query, {
      year,
      includeAdult,
    });

    // Add full URLs to image paths
    const results = data.results.map(addImageUrls);

    return {
      ...data,
      results,
    };
  } catch (error) {
    console.error("Error searching movies:", error);
    throw error;
  }
}

// search people tool implementation
async function searchPeopleImpl({ query }: { query: string }) {
  console.log("[tmdb:searchPeople]", JSON.stringify({ query }));
  try {
    const data = await searchTmdb("person", query);

    // Add full URLs to image paths
    const results = data.results.map((person: any) => {
      const updatedPerson = addImageUrls(person);

      // Also update poster paths in known_for works
      if (updatedPerson.known_for && Array.isArray(updatedPerson.known_for)) {
        updatedPerson.known_for = updatedPerson.known_for.map(addImageUrls);
      }

      return updatedPerson;
    });

    return {
      ...data,
      results,
    };
  } catch (error) {
    console.error("Error searching people:", error);
    throw error;
  }
}

// get movie details tool implementation
async function getMovieDetailsImpl({ 
  movieId, 
  includeVideos = true, 
  includeCredits = true 
}: { 
  movieId: number; 
  includeVideos?: boolean; 
  includeCredits?: boolean; 
}) {
  console.log("[tmdb:getMovieDetails]", JSON.stringify({ movieId, includeVideos, includeCredits }));
  try {
    const appendToResponse: string[] = [];
    if (includeVideos) appendToResponse.push('videos');
    if (includeCredits) appendToResponse.push('credits');

    const movieDetails = await getMovieDetails(movieId, appendToResponse);

    // Add full URLs to image paths
    const result = addImageUrls(movieDetails);

    // Update cast profile images if credits are included
    if (result.credits?.cast) {
      result.credits.cast = result.credits.cast.map(addImageUrls);
    }

    return result;
  } catch (error) {
    console.error("Error fetching movie details:", error);
    throw error;
  }
}

// search and get detailed movie information
async function searchMoviesWithDetailsImpl({ 
  query, 
  year, 
  maxResults = 3 
}: { 
  query: string; 
  year?: number; 
  maxResults?: number; 
}) {
  console.log("[tmdb:searchMoviesWithDetails]", JSON.stringify({ query, year, maxResults }));
  try {
    const movies = await searchAndGetMovieDetails(
      query, 
      { year, maxResults },
      ['videos', 'credits']
    );

    // Add full URLs to image paths for movies and cast
    const results = movies.map(movie => {
      const updatedMovie = addImageUrls(movie);
      
      // Update cast profile images
      if (updatedMovie.credits?.cast) {
        updatedMovie.credits.cast = updatedMovie.credits.cast.map(addImageUrls);
      }
      
      return updatedMovie;
    });

    return results;
  } catch (error) {
    console.error("Error searching movies with details:", error);
    throw error;
  }
}

// multi search tool implementation (searches across movies, TV shows, and people)
async function multiSearchImpl({ query }: { query: string }) {
  console.log("[tmdb:multiSearch]", JSON.stringify({ query }));
  try {
    const data = await searchTmdb("multi", query);

    // Add full URLs to image paths
    const results = data.results.map((item: any) => {
      const updatedItem = addImageUrls(item);
      
      // Handle known_for for people
      if (updatedItem.known_for && Array.isArray(updatedItem.known_for)) {
        updatedItem.known_for = updatedItem.known_for.map(addImageUrls);
      }
      
      return updatedItem;
    });

    return {
      ...data,
      results,
    };
  } catch (error) {
    console.error("Error in multi search:", error);
    throw error;
  }
}

// register tool functions
registerTool("searchMovies", searchMoviesImpl);
registerTool("searchPeople", searchPeopleImpl);
registerTool("getMovieDetails", getMovieDetailsImpl);
registerTool("searchMoviesWithDetails", searchMoviesWithDetailsImpl);
registerTool("multiSearch", multiSearchImpl);

// export tool definitions
export const searchMoviesTool: ToolDefinition = {
  type: "function",
  function: {
    name: "searchMovies",
    description: "Search TMDB for movies by title with optional filters",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The movie title to search for"
        },
        year: {
          type: "number",
          description: "Filter by release year (optional)"
        },
        includeAdult: {
          type: "boolean",
          description: "Whether to include adult content (default: false)"
        }
      },
      required: ["query"]
    }
  }
};

export const searchPeopleTool: ToolDefinition = {
  type: "function",
  function: {
    name: "searchPeople",
    description: "Search TMDB for people by name",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The person's name to search for"
        }
      },
      required: ["query"]
    }
  }
};

export const getMovieDetailsTool: ToolDefinition = {
  type: "function",
  function: {
    name: "getMovieDetails",
    description: "Get detailed information about a specific movie by ID, including cast, crew, videos, etc.",
    parameters: {
      type: "object",
      properties: {
        movieId: {
          type: "number",
          description: "The TMDB movie ID"
        },
        includeVideos: {
          type: "boolean",
          description: "Whether to include videos (trailers, etc.) - default: true"
        },
        includeCredits: {
          type: "boolean",
          description: "Whether to include cast and crew information - default: true"
        }
      },
      required: ["movieId"]
    }
  }
};

export const searchMoviesWithDetailsTool: ToolDefinition = {
  type: "function",
  function: {
    name: "searchMoviesWithDetails",
    description: "Search for movies and get detailed information including cast, crew, and videos in one call",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The movie title to search for"
        },
        year: {
          type: "number",
          description: "Filter by release year (optional)"
        },
        maxResults: {
          type: "number",
          description: "Maximum number of detailed results to return (default: 3, max recommended: 5)"
        }
      },
      required: ["query"]
    }
  }
};

export const multiSearchTool: ToolDefinition = {
  type: "function",
  function: {
    name: "multiSearch",
    description: "Search TMDB across movies, TV shows, and people simultaneously",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query (can be movie title, TV show name, or person name)"
        }
      },
      required: ["query"]
    }
  }
};

// export all tools
export const allTools: ToolDefinition[] = [
  searchMoviesTool,
  searchPeopleTool,
  getMovieDetailsTool,
  searchMoviesWithDetailsTool,
  multiSearchTool
];
