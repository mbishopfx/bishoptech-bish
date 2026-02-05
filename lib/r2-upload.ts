import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

let r2Client: S3Client | null = null;

const getR2Client = (): S3Client => {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return r2Client;
};

const toBuffer = (body: Uint8Array | Buffer | ArrayBuffer): Buffer => {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  return Buffer.from(body);
};

export const buildR2PublicUrl = (fileKey: string): string =>
  `${process.env.R2_PUBLIC_BASE_URL}/${fileKey}`;

export const uploadObjectToR2 = async (params: {
  fileKey: string;
  body: Uint8Array | Buffer | ArrayBuffer;
  contentType: string;
  contentDisposition?: string;
}): Promise<string> => {
  const uploadCommand = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: params.fileKey,
    Body: toBuffer(params.body),
    ContentType: params.contentType,
    ...(params.contentDisposition
      ? { ContentDisposition: params.contentDisposition }
      : {}),
  });

  await getR2Client().send(uploadCommand);
  return buildR2PublicUrl(params.fileKey);
};

export const generateR2FileKey = (params: {
  userId: string;
  fileName: string;
  prefix?: string;
}): string => {
  const fileExtension = params.fileName.split(".").pop() || "bin";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const prefix = params.prefix ?? "uploads";
  return `${prefix}/${params.userId}/${timestamp}-${random}.${fileExtension}`;
};
