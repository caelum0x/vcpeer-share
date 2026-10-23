import api from "./api.service";
import { ApiKey, CreatedApiKey } from "../types/apiKey.type";

const list = async (): Promise<ApiKey[]> => {
  return (await api.get("apiKeys")).data;
};

const create = async (
  name: string,
  expiresInDays?: number,
): Promise<CreatedApiKey> => {
  return (await api.post("apiKeys", { name, expiresInDays })).data;
};

const revoke = async (id: string): Promise<void> => {
  await api.delete(`apiKeys/${id}`);
};

export default { list, create, revoke };
