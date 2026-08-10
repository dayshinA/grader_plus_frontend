import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { SecretField } from "~/components/ui/secret-field";

export function SecretFieldDemo() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Masked (default)</CardTitle>
        </CardHeader>
        <CardContent>
          <SecretField
            value="bpk_VlnSH9dwcgVVo39IXzANx3Aragt7wRUFSpo24Dcs5AT4pbDA"
            label="API key"
            copyLabel="Copy key"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revealed, and empty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SecretField
            value="bpk_VlnSH9dwcgVVo39IXzANx3Aragt7wRUFSpo24Dcs5AT4pbDA"
            label="API key"
            maskable={false}
            copyLabel="Copy key"
          />
          <SecretField value={undefined} label="API key" emptyText="No key on this record." />
        </CardContent>
      </Card>
    </div>
  );
}
