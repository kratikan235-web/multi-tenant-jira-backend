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

