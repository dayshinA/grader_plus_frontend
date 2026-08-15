import { AccountPage } from "~/features/users/components/account-page";

export function meta() {
  return [{ title: "Account | GraderPlus" }];
}

export default function AccountRoute() {
  return <AccountPage />;
}
