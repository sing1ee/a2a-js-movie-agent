declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENROUTER_API_KEY: string;
      TMDB_API_KEY: string;
      NODE_ENV?: 'development' | 'test' | 'production';
      PORT?: string;
    }
  }
}

export {};
