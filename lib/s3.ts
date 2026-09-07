import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

function getEnv(name: string): string | undefined {
  return process.env[name] ?? process.env[`NEXT_PUBLIC_${name}`];
}

function getS3Config() {
  const endpointRaw = getEnv('MINIO_ENDPOINT') ?? getEnv('S3_ENDPOINT');
  const port = getEnv('MINIO_PORT');
  const useSsl = (getEnv('MINIO_USE_SSL') ?? 'true').toLowerCase() !== 'false';
  const accessKey = getEnv('MINIO_ACCESS_KEY') ?? getEnv('AWS_ACCESS_KEY_ID') ?? getEnv('S3_ACCESS_KEY');
  const secretKey = getEnv('MINIO_SECRET_KEY') ?? getEnv('AWS_SECRET_ACCESS_KEY') ?? getEnv('S3_SECRET_KEY');
  const region = getEnv('AWS_REGION') ?? getEnv('S3_REGION') ?? 'us-east-1';
  const bucket = getEnv('MINIO_BUCKET') ?? getEnv('S3_BUCKET');

  if (!endpointRaw || !accessKey || !secretKey || !bucket) return null;

  let endpoint = endpointRaw;
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = `${useSsl ? 'https' : 'http'}://${endpoint}`;
  }
  if (port && !endpoint.includes(`:${port}`) && !endpoint.endsWith(`:${port}`)) {
    const u = new URL(endpoint);
    if (!u.port) endpoint = `${endpoint}:${port}`;
  }

  return { endpoint, accessKey, secretKey, region, bucket };
}

let client: S3Client | null = null;
let cachedBucket: string | null = null;

function getClient(): { client: S3Client; bucket: string } | null {
  const cfg = getS3Config();
  if (!cfg) return null;
  if (client && cachedBucket === cfg.bucket) return { client, bucket: cfg.bucket };
  client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
  });
  cachedBucket = cfg.bucket;
  return { client, bucket: cfg.bucket };
}

export async function s3Put(key: string, body: Buffer | Uint8Array | string, contentType = 'application/octet-stream'): Promise<string> {
  const c = getClient();
  if (!c) throw new Error('S3/MinIO not configured');
  await c.client.send(new PutObjectCommand({ Bucket: c.bucket, Key: key, Body: body as any, ContentType: contentType }));
  return key;
}

export async function s3Get(key: string): Promise<Buffer | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const res = await c.client.send(new GetObjectCommand({ Bucket: c.bucket, Key: key }));
    const body = res.Body as any;
    if (!body) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export async function s3Exists(key: string): Promise<boolean> {
  const c = getClient();
  if (!c) return false;
  try {
    await c.client.send(new HeadObjectCommand({ Bucket: c.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export function isS3Configured(): boolean {
  return getS3Config() !== null;
}

export function s3KeyForDay(day: string, pairId: string, intervalMs: number): string {
  return `candles/day=${day}/pair=${pairId}/interval=${intervalMs}.json`;
}
