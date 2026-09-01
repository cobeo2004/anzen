import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type {
  ListedObject,
  ObjectStorage,
  StoredObject,
} from "@/server/core/object-storage";

export type S3ObjectStorageOptions = {
  endpoint?: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  forcePathStyle: boolean;
};

function assertSafeKey(key: string) {
  if (
    key.length === 0 ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.split("/").some((part) => part === ".." || part === "")
  ) {
    throw new Error("Invalid object storage key");
  }
}

function isMissing(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const name = "name" in error ? String(error.name) : "";
  const status =
    "$metadata" in error &&
    typeof error.$metadata === "object" &&
    error.$metadata &&
    "httpStatusCode" in error.$metadata
      ? Number(error.$metadata.httpStatusCode)
      : undefined;
  return (
    name === "NoSuchKey" ||
    name === "NoSuchBucket" ||
    name === "NotFound" ||
    name === "NotFoundException" ||
    status === 404
  );
}

function isBucketAlreadyThere(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const name = "name" in error ? String(error.name) : "";
  return name === "BucketAlreadyOwnedByYou" || name === "BucketAlreadyExists";
}

export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private ensureBucketPromise?: Promise<void>;

  constructor(options: S3ObjectStorageOptions) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
      credentials: {
        accessKeyId: options.accessKey,
        secretAccessKey: options.secretKey,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  private ensureBucket() {
    this.ensureBucketPromise ??= this.createBucketIfMissing();
    return this.ensureBucketPromise;
  }

  private async createBucketIfMissing() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (!isMissing(error)) {
        throw error;
      }
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
      } catch (createError) {
        if (!isBucketAlreadyThere(createError)) {
          throw createError;
        }
      }
    }
  }

  async put(input: {
    key: string;
    body: Uint8Array;
    contentType?: string;
  }): Promise<{ key: string }> {
    assertSafeKey(input.key);
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
    return { key: input.key };
  }

  async get(key: string): Promise<StoredObject | null> {
    assertSafeKey(key);
    await this.ensureBucket();
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      const bytes = response.Body
        ? await response.Body.transformToByteArray()
        : new Uint8Array();
      return {
        body: bytes,
        contentType: response.ContentType,
      };
    } catch (error) {
      if (isMissing(error)) {
        return null;
      }
      throw error;
    }
  }

  async list(prefix: string): Promise<ListedObject[]> {
    assertSafeKey(prefix);
    await this.ensureBucket();
    const items: ListedObject[] = [];
    let continuationToken: string | undefined;

    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: `${prefix}/`,
          ContinuationToken: continuationToken,
        }),
      );
      for (const object of page.Contents ?? []) {
        const key = object.Key;
        if (!key || key.endsWith("/")) {
          continue;
        }
        let contentType: string | undefined;
        try {
          const head = await this.client.send(
            new HeadObjectCommand({
              Bucket: this.bucket,
              Key: key,
            }),
          );
          contentType = head.ContentType;
        } catch {
          contentType = undefined;
        }
        items.push({
          key,
          contentType,
          updatedAt: object.LastModified?.toISOString(),
        });
      }
      continuationToken = page.IsTruncated
        ? page.NextContinuationToken
        : undefined;
    } while (continuationToken);

    items.sort((left, right) =>
      (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""),
    );
    return items;
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    await this.ensureBucket();
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async url(key: string): Promise<string> {
    assertSafeKey(key);
    return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
}
