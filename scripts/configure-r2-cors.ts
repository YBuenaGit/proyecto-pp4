import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable ${name}.`);
  return value;
}

const origins = required("R2_ALLOWED_ORIGINS")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!origins.length || origins.some((origin) => !/^https?:\/\/[^/]+$/i.test(origin))) {
  throw new Error("R2_ALLOWED_ORIGINS debe contener origenes completos separados por coma y sin ruta.");
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  },
});

await client.send(new PutBucketCorsCommand({
  Bucket: required("R2_BUCKET"),
  CORSConfiguration: {
    CORSRules: [{
      AllowedOrigins: origins,
      AllowedMethods: ["PUT"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    }],
  },
}));

console.log(`CORS de R2 configurado para ${origins.length} origen(es).`);
