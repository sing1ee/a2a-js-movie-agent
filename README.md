# A2A JS Movie Agent

A movie information agent powered by TMDB API and AI.

## Features

- **Enhanced TMDB Integration**: Modern API implementation with Bearer token authentication
- **Comprehensive Movie Search**: Search with filters like year, adult content, etc.
- **Detailed Movie Information**: Get complete movie details including cast, crew, videos, and more
- **Multi-Search**: Search across movies, TV shows, and people simultaneously
- **Smart API Usage**: Efficient search + details combination following TMDB best practices
- **AI-Powered**: Uses OpenRouter for intelligent movie queries
- **Proxy Support**: Built-in SOCKS5/HTTP proxy support for network requests

## Environment Setup

Create a `.env` file with the following variables:

```bash
# TMDB API Key (can be used as Bearer token)
TMDB_API_TOKEN=your_TMDB_API_TOKEN_here

# OpenRouter API Key for AI features
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Proxy Configuration (Optional)
# Set USE_PROXY=true to enable proxy, default is true
USE_PROXY=true

# Proxy URL - supports socks5, http, https protocols
# Default: socks5://127.0.0.1:7890
PROXY_URL=socks5://127.0.0.1:7890

# Optional
NODE_ENV=development
PORT=3000
```

### Proxy Configuration

The application supports proxy connections for TMDB API requests:

- **Supported Protocols**: SOCKS5, HTTP, HTTPS
- **Default Setting**: Proxy is enabled by default with `socks5://127.0.0.1:7890`
- **Environment Variables**:
  - `USE_PROXY`: Set to `true` or `false` to enable/disable proxy
  - `PROXY_URL`: Proxy server URL (e.g., `socks5://127.0.0.1:7890`, `http://proxy.example.com:8080`)

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
