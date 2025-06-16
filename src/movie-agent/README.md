# Movie Agent

A movie expert agent that can answer questions about movies and film industry personalities using TMDB (The Movie Database) API.

## Features

- Search for movies by title
- Search for people (actors, directors, etc.) by name
- Get detailed information about movies and cast
- Powered by OpenAI-compatible models via OpenRouter

## Setup

1. Get your API keys:
   - **OpenRouter API Key**: Sign up at [OpenRouter](https://openrouter.ai/) and get your API key
   - **TMDB API Key**: Get your API key from [TMDB API](https://www.themoviedb.org/settings/api)

2. Set environment variables:
   ```bash
   export OPENROUTER_API_KEY=your_openrouter_api_key_here
   export TMDB_API_KEY=your_tmdb_api_key_here
   ```

## Usage

The agent uses OpenAI-compatible chat completion API via OpenRouter to provide intelligent responses about movies and entertainment industry topics.

```bash
npm run agents:movie-agent
```

The agent will start on `http://localhost:41241`.
