export type ApiKey = {
  id: string;
  name: string;
  keyId: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
};

export type CreatedApiKey = {
  id: string;
  name: string;
  createdAt: Date;
  expiresAt: Date | null;
  // Only ever present in the response right after creation — the backend
  // never returns it again afterwards.
  token: string;
};
