"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { internal } from "./_generated/api";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const deleteAttachmentsFromR2 = internalAction({
  args: {
    items: v.array(
      v.object({ id: v.id("attachments"), fileKey: v.string() })
    ),
  },
  returns: v.object({
    success: v.array(v.id("attachments")),
    failed: v.array(v.id("attachments")),
  }),
  handler: async (ctx, args) => {
    const successIds: string[] = [];
    const failedIds: string[] = [];

    for (const { id, fileKey } of args.items) {
      try {
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: fileKey,
          })
        );
        successIds.push(id);
      } catch (error) {
        console.error("R2 delete failed", { id, fileKey, error });
        failedIds.push(id);
      }
    }

    if (successIds.length > 0) {
      await ctx.runMutation((internal as any).users.finalizeAttachmentDeletion, {
        ids: successIds as any,
      });
    }

    return { success: successIds as any, failed: failedIds as any };
  },
});


