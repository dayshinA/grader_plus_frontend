import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { JsonViewer } from "~/components/ui/json-viewer";

const bulkImportRow = {
  data: {
    row: 14,
    email: "j.smith@lboro.ac.uk",
    status: "error",
    error: "INVALID_SCOPE_FOR_ROLE_TEMPLATE",
    roleTemplateKey: "project_coordinator",
    scopeType: "school",
    scopeId: "6f9c1c2a-1f47-4d1b-9a03-4b2b5f2c7e11",
  },
  success: false,
  statusCode: 422,
  message: "A Project Coordinator can only be assigned at department or module scope.",
};

export function JsonViewerDemo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Technical record</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <JsonViewer value={bulkImportRow} label="API response" />
        <JsonViewer value={null} label="Metadata" emptyText="No metadata was attached." />
      </CardContent>
    </Card>
  );
}
