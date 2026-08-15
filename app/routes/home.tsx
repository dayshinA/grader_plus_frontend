import { HomePage } from "~/features/dashboard/components/home-page";

export function meta() {
  return [{ title: "Home | GraderPlus" }];
}

export default function HomeRoute() {
  return <HomePage />;
}
