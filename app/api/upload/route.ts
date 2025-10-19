import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { logAttachmentUploaded } from "@/actions/audit";

export const runtime = "nodejs";
export const maxDuration = 30;

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// R2 S3 client
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Allowed file types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg", 
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

interface UploadResponse {
  success: boolean;
  attachmentId?: string;
  url?: string;
  error?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // Authenticate user
    const auth = await withAuth();
    if (!auth.accessToken || !auth.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "File type not supported. Only images and PDFs are allowed." },
        { status: 400 }
      );
    }

    // Generate unique file key for R2
    const fileExtension = file.name.split('.').pop();
    const fileKey = `uploads/${auth.user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    
    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileKey,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
      ContentDisposition: `inline; filename="${file.name}"`,
    });

    await r2Client.send(uploadCommand);

    // Generate public URL using the configured R2.dev subdomain
    const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${fileKey}`;

    // Create attachment record with R2 URL
    const attachmentId = await fetchMutation(
      api.threads.createAttachment,
      {
        dataUrl: publicUrl, // Store R2 URL instead of base64
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size.toString(),
      },
      { token: auth.accessToken }
    );

    await logAttachmentUploaded(String(attachmentId), file.name, file.type, file.size);

    return NextResponse.json({
      success: true,
      attachmentId,
      url: publicUrl,
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
