import { config as dotenvConfig } from 'dotenv';

// detect if running in Cloudflare Worker
const isCloudflareWorker = typeof globalThis !== 'undefined' && 'cloudflare' in (globalThis as any);
const isBrowser = typeof window !== 'undefined';

// load .env file only in Node.js environment
if (!isBrowser && !isCloudflareWorker) {
  dotenvConfig();
}

/**
 * get environment variable, support Node.js and Cloudflare Worker
 * @param key environment variable name
 * @param defaultValue default value
 * @param env Cloudflare Worker environment object
 */
function getEnvVar(key: string, defaultValue?: string, env?: any): string | undefined {
  if (isCloudflareWorker && env) {
    return env[key] ?? defaultValue;
  }
  return process.env[key] ?? defaultValue;
}

// validate required env for Node.js
function validateEnv(): void {
  if (isCloudflareWorker) {
    return; // Skip validation for Cloudflare Worker
  }
  
  const requiredVars = ['OPENROUTER_API_KEY', 'TMDB_API_TOKEN'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`❌ missing required env: ${missing.join(', ')}\nplease check .env file`);
  }
  
  console.log('✅ env validated');
}

/**
 * create config object
 * @param env Cloudflare Worker environment object (optional)
 */
export function createConfig(env?: any) {
  return {
    // API keys
    openRouterApiKey: getEnvVar('OPENROUTER_API_KEY', undefined, env) || '',
    tmdbApiToken: getEnvVar('TMDB_API_TOKEN', undefined, env) || '',
    
    // app config
    nodeEnv: getEnvVar('NODE_ENV', 'development', env) || 'development',
    port: parseInt(getEnvVar('PORT', '3000', env) || '3000', 10),
    
    // proxy config
    proxyUrl: getEnvVar('PROXY_URL', 'http://127.0.0.1:7890', env) || 'http://127.0.0.1:7890',
    useProxy: getEnvVar('USE_PROXY', 'true', env) === 'true',
  } as const;
}

// default config for Node.js environment
export const config = createConfig();

// validate env for Node.js
validateEnv();
