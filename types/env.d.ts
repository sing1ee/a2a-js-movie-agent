declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENROUTER_API_KEY: string;
      TMDB_API_TOKEN: string;
      NODE_ENV?: 'development' | 'test' | 'production';
      PORT?: string;
      PROXY_URL?: string;
      USE_PROXY?: string;
    }
  }
}

export {};
