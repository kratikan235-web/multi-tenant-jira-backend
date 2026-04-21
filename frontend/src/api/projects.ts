import { http } from "./http";

export type Project = {
  id: number;
  name: string;
  created_by: number;
  created_at: string;
};

export async function getProjects() {
  const { data } = await http.get<{ projects: Project[] }>("/projects/");
  return data.projects;
}

export async function createProject(name: string) {
  const { data } = await http.post<{ message: string }>("/projects/", { name });
  return data;
}

export async function getProjectDetail(projectId: number) {
  const { data } = await http.get<Project>(`/projects/${projectId}`);
  return data;
}

