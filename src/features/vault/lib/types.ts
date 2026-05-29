export type VaultEntry = {
  id: number;
  service: string;
  login: string;
  password: string;
  createdAt: number;
  updatedAt: number;
};

export type CreateEntryInput = {
  service: string;
  login: string;
  password: string;
};
