import { http } from "./http";

export type SignupRequest = {
  email: string;
  password: string;
  tenant_name: string;
};

export type SignupResponse = {
  message: string;
  tenant_url?: string;
};

export async function signup(req: SignupRequest) {
  const { data } = await http.post<SignupResponse>("/users/signup", req);
  return data;
}

export async function inviteUser(email: string, role: string) {
  const { data } = await http.post<{ message: string }>(
    "/users/invite",
    null,
    { params: { email, role } }
  );
  return data;
}

export async function acceptInvite(email: string, password: string) {
  const { data } = await http.post<{ message: string; tenant: string; email: string }>(
    "/users/accept-invite",
    { email, password }
  );
  return data;
}

