import { config } from "../config/env.js";
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

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
 * Verify proxy connectivity by testing a simple HTTP request
 * @param proxyUrl The proxy URL to test
 * @returns Promise that resolves to true if proxy is working
 */
async function verifyProxyConnectivity(proxyUrl: string): Promise<boolean> {
  try {
    console.log(`🔍 Verifying proxy connectivity: ${proxyUrl}`);
    
    const agent = new HttpsProxyAgent(proxyUrl);
    const testAxios = axios.create({
      timeout: 10000,
      httpsAgent: agent,
      httpAgent: agent,
    });

    // Test proxy with a simple request to a reliable endpoint
    const response = await testAxios.get('https://httpbin.org/ip', {
      timeout: 5000,
    });

    if (response.status === 200) {
      console.log(`✅ Proxy verification successful. Proxy IP: ${response.data.origin}`);
      return true;
    }
    
    console.warn(`⚠️ Proxy responded with status: ${response.status}`);
    return false;
  } catch (error) {
    console.error(`❌ Proxy verification failed:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Create axios instance with proper configuration
 * @returns Configured axios instance
 */
async function createAxiosInstance(): Promise<AxiosInstance> {
  const apiToken = config.tmdbApiToken;
  if (!apiToken) {
    throw new Error("TMDB_API_TOKEN environment variable is not set");
  }

  const axiosConfig: AxiosRequestConfig = {
    timeout: 5000,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
  };

  // Configure proxy if enabled
  if (config.useProxy && config.proxyUrl) {
    // Verify proxy connectivity first
    const isProxyWorking = await verifyProxyConnectivity(config.proxyUrl);
    
    if (isProxyWorking) {
      try {
        const agent = new HttpsProxyAgent(config.proxyUrl);
        axiosConfig.httpsAgent = agent;
        axiosConfig.httpAgent = agent;
        console.log(`🌐 Using verified proxy: ${config.proxyUrl}`);
      } catch (error) {
        console.warn('Failed to create proxy agent:', error);
        console.log('🌐 Proceeding without proxy');
      }
    } else {
      console.warn('🌐 Proxy verification failed, proceeding without proxy');
    }
  } else {
    console.log('🌐 Proxy disabled or not configured');
  }

  return axios.create(axiosConfig);
}

// Global axios instance
let tmdbAxios: AxiosInstance | null = null;

/**
 * Get or create TMDB axios instance
 * @returns Promise that resolves to configured axios instance
 */
async function getTmdbAxios(): Promise<AxiosInstance> {
  if (!tmdbAxios) {
    tmdbAxios = await createAxiosInstance();
  }
  return tmdbAxios;
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
    const axiosInstance = await getTmdbAxios();
    
    const params: Record<string, string | number | boolean> = {
      query,
      include_adult: options.includeAdult ?? false,
      language: options.language ?? "en-US",
      page: options.page ?? 1,
    };
    
    if (options.region) {
      params.region = options.region;
    }
    if (options.year) {
      params.year = options.year;
    }
    if (options.primaryReleaseYear) {
      params.primary_release_year = options.primaryReleaseYear;
    }

    const response = await axiosInstance.get(`/3/search/${endpoint}`, {
      baseURL: 'https://api.themoviedb.org',
      params,
    });

    return response.data as TmdbSearchResponse;
  } catch (error) {
    console.error(`Error searching TMDB (${endpoint}):`, error);
    if (axios.isAxiosError(error)) {
      throw new Error(
        `TMDB search API error: ${error.response?.status} ${error.response?.statusText}`
      );
    }
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
    const axiosInstance = await getTmdbAxios();
    
    const params: Record<string, string> = {
      language: "en-US",
    };
    
    if (appendToResponse && appendToResponse.length > 0) {
      params.append_to_response = appendToResponse.join(",");
    }

    const response = await axiosInstance.get(`/3/movie/${movieId}`, {
      baseURL: 'https://api.themoviedb.org',
      params,
    });

    return response.data as TmdbMovieDetails;
  } catch (error) {
    console.error(`Error fetching movie details (ID: ${movieId}):`, error);
    if (axios.isAxiosError(error)) {
      throw new Error(
        `TMDB movie details API error: ${error.response?.status} ${error.response?.statusText}`
      );
    }
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

/**
 * Reset the axios instance (useful for testing or when configuration changes)
 */
export function resetTmdbAxios(): void {
  tmdbAxios = null;
}
