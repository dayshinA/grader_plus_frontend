import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

const rows = [
  { id: 1, marker: "Dr Helen Ashcroft", role: "marker", submitted: "4 Aug 2026" },
  { id: 2, marker: "Prof. Ibrahim Sallah", role: "marker", submitted: "6 Aug 2026" },
  { id: 3, marker: "Dr Nina Kowalski", role: "moderator", submitted: "—" },
];

export function TableDemo() {
  return (
    <div className="rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 text-xs font-medium text-muted-foreground">Marker</TableHead>
            <TableHead className="px-4 text-xs font-medium text-muted-foreground">Role</TableHead>
            <TableHead className="px-4 text-right text-xs font-medium text-muted-foreground">
              Submitted
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="px-4 py-3 font-medium">{row.marker}</TableCell>
              <TableCell className="px-4 py-3 capitalize text-muted-foreground">
                {row.role}
              </TableCell>
              <TableCell className="px-4 py-3 text-right tabular-nums">{row.submitted}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
