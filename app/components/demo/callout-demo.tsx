import { Callout } from "~/components/ui/callout";

/** The four standing-context notes: info, success, warning, error. */
export function CalloutDemo() {
  return (
    <div className="space-y-3">
      <Callout title="Showing existing Coordinators only">
        Your account can list Project Coordinators, not every user. Create the account first if the
        person you want isn't one yet.
      </Callout>

      <Callout variant="success" title="Import finished">
        48 accounts created, 0 failed, out of 48 rows.
      </Callout>

      <Callout variant="warning" title="Marking deadline approaching">
        COP511's marking deadline is 12 Aug 2026. Incomplete marking should be chased up now.
      </Callout>

      <Callout variant="error" title="Couldn't change the extra permissions">
        You can only grant permissions you hold yourself at a scope covering this user.
      </Callout>
    </div>
  );
}
