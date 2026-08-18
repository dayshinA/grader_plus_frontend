import { BackLink } from "~/components/ui/back-link";
import { Card, CardContent } from "~/components/ui/card";
import { PageHeader } from "~/components/ui/page-header";
import { ChangePasswordForm } from "~/features/auth/components/change-password-form";

export function meta() {
  return [{ title: "Change password | GraderPlus" }];
}

export default function ChangePasswordRoute() {
  return (
    <div className="space-y-6">
      <BackLink />
      <PageHeader
        title="Change password"
        description="Sets a new password and signs you out everywhere, including here."
      />
      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
