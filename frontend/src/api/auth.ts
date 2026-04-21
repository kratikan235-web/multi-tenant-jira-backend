import { http } from "./http";

export type LoginRequest = {
  email: string;
  password: string;
  tenant: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: "bearer" | string;
};

export async function login(req: LoginRequest) {
  const { data } = await http.post<LoginResponse>("/auth/login", req);
  return data;
}

export type UserRow = { id: number; email: string; role: string };

export async function listUsers() {
  const { data } = await http.get<UserRow[]>("/auth/users");
  return data;
}

