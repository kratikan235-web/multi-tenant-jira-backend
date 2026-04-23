import { http } from "./http";

export type UserDetail = {
  id: number;
  email: string;
  role: string;
  activated: boolean;
};

export async function getUserDetail(userId: number) {
  const { data } = await http.get<UserDetail>(`/users/${userId}`);
  return data;
}

export async function updateUser(userId: number, patch: { email?: string; role?: string }) {
  const { data } = await http.put<UserDetail>(`/users/${userId}`, patch);
  return data;
}

export async function deleteUser(userId: number) {
  const { data } = await http.delete<{ message: string }>(`/users/${userId}`);
  return data;
}

