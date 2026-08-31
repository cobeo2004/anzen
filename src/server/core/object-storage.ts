export type PutObjectInput = {
  key: string;
  body: Uint8Array;
  contentType?: string;
};

export type StoredObject = {
  body: Uint8Array;
  contentType?: string;
};

export type ListedObject = {
  key: string;
  contentType?: string;
  updatedAt?: string;
};

export interface ObjectStorage {
  put(input: PutObjectInput): Promise<{ key: string }>;
  get(key: string): Promise<StoredObject | null>;
  list(prefix: string): Promise<ListedObject[]>;
  delete(key: string): Promise<void>;
  url(key: string): Promise<string>;
}
