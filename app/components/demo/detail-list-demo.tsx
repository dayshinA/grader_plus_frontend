import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { DetailList, type DetailListItem } from "~/components/ui/detail-list";

const items: DetailListItem[] = [
  { label: "Client ID", value: <span className="tabular-nums">1</span> },
  { label: "Name", value: "OAA 16" },
  { label: "Slug", value: <code className="font-mono text-xs">oaa-16</code> },
  { label: "Email", value: "info@oaa2016.org" },
  { label: "Status", value: <Badge variant="success">Active</Badge> },
  { label: "Onboarded", value: "7 Aug 2026, 12:48" },
  {
    label: "Note",
    wide: true,
    value: (
      <span className="text-muted-foreground">
        A wide row spans both columns — for values that need the full width, like an address or a
        long reference.
      </span>
    ),
  },
];

export function DetailListDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Client details</CardTitle>
      </CardHeader>
      <CardContent>
        <DetailList items={items} />
      </CardContent>
    </Card>
  );
}
