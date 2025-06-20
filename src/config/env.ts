import { config as dotenvConfig } from 'dotenv';

// load env
dotenvConfig();

// validate required env
function validateEnv(): void {
  const requiredVars = ['OPENROUTER_API_KEY', 'TMDB_API_TOKEN'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`❌ missing required env: ${missing.join(', ')}\nplease check .env file`);
  }
  
  console.log('✅ env validated');
}

// config object
export const config = {
  // API keys
  openRouterApiKey: process.env.OPENROUTER_API_KEY!,
  tmdbApiToken: process.env.TMDB_API_TOKEN!,
  
  // app config
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  // proxy config
  proxyUrl: process.env.PROXY_URL || 'http://127.0.0.1:7890',
  useProxy: process.env.USE_PROXY === 'true' || true, // 默认开启代理
} as const;

// validate env
validateEnv();
