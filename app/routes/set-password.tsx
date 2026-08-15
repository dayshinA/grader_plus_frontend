import { SetPasswordPage } from "~/features/auth/components/set-password-page";

export function meta() {
  return [{ title: "Set your password | GraderPlus" }];
}

export default function SetPasswordRoute() {
  return <SetPasswordPage />;
}
