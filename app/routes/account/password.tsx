import { Card, CardContent } from "~/components/ui/card";
import { PageHeader } from "~/components/ui/page-header";
import { ChangePasswordForm } from "~/features/auth/components/change-password-form";

export function meta() {
  return [{ title: "Change password | GraderPlus" }];
}

export default function ChangePasswordRoute() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Change password"
        description="Sets a new password and ends every session on the account, including this one."
      />
      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
