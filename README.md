# A2A JS Movie Agent

A movie information agent powered by TMDB API and AI.

## Features

- **Enhanced TMDB Integration**: Modern API implementation with Bearer token authentication
- **Comprehensive Movie Search**: Search with filters like year, adult content, etc.
- **Detailed Movie Information**: Get complete movie details including cast, crew, videos, and more
- **Multi-Search**: Search across movies, TV shows, and people simultaneously
- **Smart API Usage**: Efficient search + details combination following TMDB best practices
- **AI-Powered**: Uses OpenRouter for intelligent movie queries

## Environment Setup

Create a `.env` file with the following variables:

```bash
# TMDB API Key (can be used as Bearer token)
TMDB_API_TOKEN=your_TMDB_API_TOKEN_here

# OpenRouter API Key for AI features
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional
NODE_ENV=development
PORT=3000
```

## TMDB API Features

The project now includes enhanced TMDB API features based on official documentation:

### Available Tools

1. **searchMovies**: Basic movie search with optional filters
2. **searchPeople**: Search for actors, directors, etc.
3. **getMovieDetails**: Get detailed information about a specific movie
4. **searchMoviesWithDetails**: Combined search + details in one call (recommended)
5. **multiSearch**: Search across all content types simultaneously

### Key Improvements

- ✅ **Bearer Token Authentication**: Modern authentication method
- ✅ **Type Safety**: Full TypeScript definitions for all API responses
- ✅ **Append to Response**: Get additional data (videos, credits) in single requests
- ✅ **Image URL Optimization**: Automatic full URL generation for all images
- ✅ **Error Handling**: Comprehensive error handling and logging
- ✅ **Backward Compatibility**: Legacy API functions still work with deprecation warnings

## Development

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Build project
bun run build
```
