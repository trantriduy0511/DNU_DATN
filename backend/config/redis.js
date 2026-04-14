import IORedis from 'ioredis';

const isRedisEnabled = process.env.REDIS_ENABLED === 'true';
if (!isRedisEnabled) {
  console.log('ℹ️ Redis queue is disabled (REDIS_ENABLED != true)');
}

const redisUrl = process.env.REDIS_URL?.trim();
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const redisConnection = isRedisEnabled
  ? (redisUrl
  ? new IORedis(redisUrl, { maxRetriesPerRequest: null })
  : new IORedis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: null,
    }))
  : null;

if (redisConnection) {
  redisConnection.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redisConnection.on('error', (error) => {
    console.error('❌ Redis error:', error.message);
  });
}

export default redisConnection;
export { isRedisEnabled };
