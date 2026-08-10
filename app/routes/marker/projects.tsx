import { MyProjectsPage } from "~/features/grading/components/my-projects-page";

export function meta() {
  return [{ title: "My Projects — GraderPlus" }];
}

export default function MarkerProjects() {
  return <MyProjectsPage />;
}
