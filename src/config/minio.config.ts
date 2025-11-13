export const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT!,        // 'storage.centi.space' или IP
  port: Number(process.env.MINIO_PORT ?? 9000), // 443 если TLS на MinIO
  useSSL: process.env.MINIO_SSL === 'true',     // true если MinIO с https
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
  // опционально: регион, sessionToken и т.д.
};
