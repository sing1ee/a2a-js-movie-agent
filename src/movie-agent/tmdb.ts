import { config } from "../config/env.js";

// Type definitions for TMDB API responses
export interface TmdbSearchResult {
  id: number;
  title?: string; // for movies
  name?: string; // for TV shows and persons
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  popularity: number;
  vote_average?: number;
  vote_count?: number;
  adult?: boolean;
  video?: boolean;
  original_language?: string;
  media_type?: string;
}

export interface TmdbSearchResponse {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TmdbMovieDetails extends TmdbSearchResult {
  budget?: number;
  revenue?: number;
  runtime?: number;
  status?: string;
  tagline?: string;
  genres?: Array<{ id: number; name: string }>;
  production_companies?: Array<{ id: number; name: string; logo_path?: string }>;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  spoken_languages?: Array<{ iso_639_1: string; english_name: string; name: string }>;
  videos?: {
    results: Array<{
      id: string;
      key: string;
      name: string;
      site: string;
      type: string;
      official: boolean;
    }>;
  };
  credits?: {
    cast: Array<{
      id: number;
      name: string;
      character: string;
      profile_path?: string;
    }>;
    crew: Array<{
      id: number;
      name: string;
      job: string;
      department: string;
    }>;
  };
}

/**
 * Create headers for TMDB API requests
 * @returns Headers object with Bearer token authorization
 */
function createTmdbHeaders(): Headers {
  const apiToken = config.tmdbApiToken;
  if (!apiToken) {
    throw new Error("TMDB_API_TOKEN environment variable is not set");
  }

  return new Headers({
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  });
}

/**
 * Search for movies, TV shows, or persons on TMDB
 * @param endpoint The search endpoint ('movie', 'tv', 'person', 'multi')
 * @param query The search query
 * @param options Additional search options
 * @returns Promise that resolves to the search response
 */
export async function searchTmdb(
  endpoint: 'movie' | 'tv' | 'person' | 'multi',
  query: string,
  options: {
    includeAdult?: boolean;
    language?: string;
    page?: number;
    region?: string;
    year?: number;
    primaryReleaseYear?: number;
  } = {}
): Promise<TmdbSearchResponse> {
  try {
    const url = new URL(`https://api.themoviedb.org/3/search/${endpoint}`);
    url.searchParams.append("query", query);
    url.searchParams.append("include_adult", String(options.includeAdult ?? false));
    url.searchParams.append("language", options.language ?? "en-US");
    url.searchParams.append("page", String(options.page ?? 1));
    
    if (options.region) {
      url.searchParams.append("region", options.region);
    }
    if (options.year) {
      url.searchParams.append("year", String(options.year));
    }
    if (options.primaryReleaseYear) {
      url.searchParams.append("primary_release_year", String(options.primaryReleaseYear));
    }

    const response = await fetch(url.toString(), {
      headers: createTmdbHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `TMDB search API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Error searching TMDB (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Get detailed information for a movie by ID
 * @param movieId The movie ID
 * @param appendToResponse Additional data to include (e.g., 'videos', 'credits', 'images')
 * @returns Promise that resolves to detailed movie information
 */
export async function getMovieDetails(
  movieId: number,
  appendToResponse?: string[]
): Promise<TmdbMovieDetails> {
  try {
    const url = new URL(`https://api.themoviedb.org/3/movie/${movieId}`);
    url.searchParams.append("language", "en-US");
    
    if (appendToResponse && appendToResponse.length > 0) {
      url.searchParams.append("append_to_response", appendToResponse.join(","));
    }

    const response = await fetch(url.toString(), {
      headers: createTmdbHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `TMDB movie details API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching movie details (ID: ${movieId}):`, error);
    throw error;
  }
}

/**
 * Search for a movie and get its detailed information
 * This is a convenience function that combines search and details query as recommended by TMDB docs
 * @param query The movie search query
 * @param options Search options
 * @param appendToResponse Additional data to include in details
 * @returns Promise that resolves to an array of detailed movie information
 */
export async function searchAndGetMovieDetails(
  query: string,
  options: {
    includeAdult?: boolean;
    language?: string;
    year?: number;
    primaryReleaseYear?: number;
    maxResults?: number;
  } = {},
  appendToResponse: string[] = ['videos', 'credits']
): Promise<TmdbMovieDetails[]> {
  try {
    // First, search for movies
    const searchResults = await searchTmdb('movie', query, {
      includeAdult: options.includeAdult,
      language: options.language,
      year: options.year,
      primaryReleaseYear: options.primaryReleaseYear,
    });

    if (searchResults.results.length === 0) {
      return [];
    }

    // Get the top results (limited by maxResults)
    const maxResults = options.maxResults ?? 5;
    const topResults = searchResults.results.slice(0, maxResults);

    // Fetch detailed information for each movie
    const detailsPromises = topResults.map(movie => 
      getMovieDetails(movie.id, appendToResponse)
    );

    return await Promise.all(detailsPromises);
  } catch (error) {
    console.error(`Error in searchAndGetMovieDetails for query "${query}":`, error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use searchTmdb instead
 */
export async function callTmdbApi(endpoint: string, query: string) {
  console.warn('callTmdbApi is deprecated. Use searchTmdb instead.');
  return searchTmdb(endpoint as any, query);
}
