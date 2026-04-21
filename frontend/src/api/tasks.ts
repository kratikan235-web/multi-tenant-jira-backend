import { http } from "./http";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | string;

export type Task = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  project: { id: number; name: string } | null;
  assigned_to: { id: number; email: string } | null;
  created_by: { id: number; email: string } | null;
};

export type TaskCreate = {
  title: string;
  description?: string;
  project_id: number;
  assigned_to?: number | null;
};

export async function getTasks(projectId: number) {
  const { data } = await http.get<Task[]>("/tasks/", { params: { project_id: projectId } });
  return data;
}

export async function getTaskDetail(taskId: number) {
  const { data } = await http.get<Task>(`/tasks/${taskId}`);
  return data;
}

export async function createTask(payload: TaskCreate) {
  const { data } = await http.post<Task>("/tasks/", payload);
  return data;
}

export async function updateTask(taskId: number, patch: { title?: string; description?: string; status?: TaskStatus }) {
  const { data } = await http.put<Task>(`/tasks/${taskId}`, patch);
  return data;
}

export async function assignTask(taskId: number, userId: number) {
  const { data } = await http.patch<Task>(`/tasks/${taskId}/assign`, null, { params: { user_id: userId } });
  return data;
}

export async function changeStatus(taskId: number, status: TaskStatus) {
  const { data } = await http.patch<Task>(`/tasks/${taskId}/status`, null, { params: { status } });
  return data;
}

