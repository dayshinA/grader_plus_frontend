import * as React from "react"
import { Resizable, type ResizeCallbackData } from "react-resizable"
import "react-resizable/css/styles.css"
import {
  Activity,
  ArrowUpDown,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  Download,
  Filter,
  Mail,
  Search,
} from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination"

export interface Employee {
  id: string
  name: string
  email: string
  department: string
  position: string
  salary: number
  hireDate: string
  status: "active" | "inactive" | "on-leave"
}

interface ResizableTableProps {
  title?: string
  employees?: Employee[]
  onEmployeeSelect?: (employeeId: string) => void
  onColumnResize?: (columnKey: string, newWidth: number) => void
  className?: string
}

const defaultEmployees: Employee[] = [
  { id: "1", name: "Sarah Chen", email: "sarah.chen@company.com", department: "Engineering", position: "Senior Software Engineer", salary: 125000, hireDate: "2022-03-15", status: "active" },
  { id: "2", name: "Michael Rodriguez", email: "michael.rodriguez@company.com", department: "Marketing", position: "Marketing Manager", salary: 95000, hireDate: "2021-08-22", status: "active" },
  { id: "3", name: "Emily Watson", email: "emily.watson@company.com", department: "Design", position: "UX Designer", salary: 88000, hireDate: "2023-01-10", status: "active" },
  { id: "4", name: "David Kim", email: "david.kim@company.com", department: "Engineering", position: "Tech Lead", salary: 145000, hireDate: "2020-11-05", status: "active" },
  { id: "5", name: "Lisa Anderson", email: "lisa.anderson@company.com", department: "HR", position: "HR Director", salary: 110000, hireDate: "2019-06-12", status: "on-leave" },
  { id: "6", name: "James Mitchell", email: "james.mitchell@company.com", department: "Sales", position: "Sales Director", salary: 130000, hireDate: "2021-02-28", status: "active" },
  { id: "7", name: "Jennifer Lee", email: "jennifer.lee@company.com", department: "Finance", position: "Financial Analyst", salary: 75000, hireDate: "2023-04-18", status: "active" },
  { id: "8", name: "Robert Chang", email: "robert.chang@company.com", department: "Engineering", position: "DevOps Engineer", salary: 105000, hireDate: "2022-09-14", status: "active" },
  { id: "9", name: "Amanda Pierce", email: "amanda.pierce@company.com", department: "Marketing", position: "Content Manager", salary: 72000, hireDate: "2023-07-03", status: "inactive" },
  { id: "10", name: "Christopher Hayes", email: "chris.hayes@company.com", department: "Operations", position: "Operations Manager", salary: 98000, hireDate: "2021-12-01", status: "active" },
  { id: "11", name: "Victoria Moore", email: "victoria.moore@company.com", department: "Design", position: "Product Designer", salary: 92000, hireDate: "2022-05-20", status: "active" },
  { id: "12", name: "Nicholas Brown", email: "nicholas.brown@company.com", department: "Engineering", position: "Frontend Developer", salary: 85000, hireDate: "2023-03-08", status: "active" },
  { id: "13", name: "Rebecca Sullivan", email: "rebecca.sullivan@company.com", department: "Sales", position: "Account Executive", salary: 78000, hireDate: "2022-11-15", status: "active" },
  { id: "14", name: "Thomas Wright", email: "thomas.wright@company.com", department: "Finance", position: "Senior Financial Analyst", salary: 95000, hireDate: "2021-04-30", status: "active" },
  { id: "15", name: "Maria Garcia", email: "maria.garcia@company.com", department: "HR", position: "HR Specialist", salary: 68000, hireDate: "2023-08-12", status: "active" },
]

type SortField = "name" | "department" | "salary" | "hireDate"
type SortOrder = "asc" | "desc"

const SORT_FIELDS: { field: SortField; label: string }[] = [
  { field: "name", label: "Name" },
  { field: "department", label: "Department" },
  { field: "salary", label: "Salary" },
  { field: "hireDate", label: "Hire Date" },
]

const STATUS_OPTIONS: { status: Employee["status"]; label: string }[] = [
  { status: "active", label: "Active" },
  { status: "inactive", label: "Inactive" },
  { status: "on-leave", label: "On leave" },
]

const STATUS_BADGE: Record<Employee["status"], string> = {
  active: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
  inactive: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  "on-leave": "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400",
}

const STATUS_DOT: Record<Employee["status"], string> = {
  active: "bg-green-600 dark:bg-green-400",
  inactive: "bg-red-600 dark:bg-red-400",
  "on-leave": "bg-yellow-600 dark:bg-yellow-400",
}

const CHECKBOX_COLUMN_WIDTH = 50
const STATUS_COLUMN_WIDTH = 100
const ITEMS_PER_PAGE = 10

type ResizableColumn = "name" | "email" | "department" | "position" | "salary" | "hireDate"

function getPaginationRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "ellipsis")[] = [1]
  if (current > 3) pages.push("ellipsis")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let page = start; page <= end; page++) pages.push(page)
  if (current < total - 2) pages.push("ellipsis")
  pages.push(total)
  return pages
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function ResizableTable({
  title = "Employee",
  employees = defaultEmployees,
  onEmployeeSelect,
  onColumnResize,
  className,
}: ResizableTableProps) {
  const [selectedEmployees, setSelectedEmployees] = React.useState<string[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [sortField, setSortField] = React.useState<SortField | null>(null)
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("asc")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<Employee["status"][]>([])
  const [departmentFilter, setDepartmentFilter] = React.useState<string[]>([])

  const [columnWidths, setColumnWidths] = React.useState<Record<ResizableColumn, number>>({
    name: 200,
    email: 220,
    department: 140,
    position: 180,
    salary: 120,
    hireDate: 120,
  })

  const departments = React.useMemo(
    () => Array.from(new Set(employees.map((e) => e.department))).sort(),
    [employees]
  )

  const filteredEmployees = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return employees.filter((e) => {
      const matchesQuery =
        !query ||
        e.name.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query) ||
        e.department.toLowerCase().includes(query) ||
        e.position.toLowerCase().includes(query)
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(e.status)
      const matchesDepartment =
        departmentFilter.length === 0 || departmentFilter.includes(e.department)
      return matchesQuery && matchesStatus && matchesDepartment
    })
  }, [employees, searchQuery, statusFilter, departmentFilter])

  const sortedEmployees = React.useMemo(() => {
    if (!sortField) return filteredEmployees
    return [...filteredEmployees].sort((a, b) => {
      const aVal = sortField === "hireDate" ? new Date(a.hireDate).getTime() : a[sortField]
      const bVal = sortField === "hireDate" ? new Date(b.hireDate).getTime() : b[sortField]
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [filteredEmployees, sortField, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sortedEmployees.length / ITEMS_PER_PAGE))

  const paginatedEmployees = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedEmployees.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedEmployees, currentPage])

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    )
    onEmployeeSelect?.(employeeId)
  }

  const handleSelectAll = () => {
    setSelectedEmployees((prev) =>
      prev.length === paginatedEmployees.length ? [] : paginatedEmployees.map((e) => e.id)
    )
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((order) => (order === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
    setCurrentPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const toggleStatusFilter = (status: Employee["status"]) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
    setCurrentPage(1)
  }

  const toggleDepartmentFilter = (department: string) => {
    setDepartmentFilter((prev) =>
      prev.includes(department) ? prev.filter((d) => d !== department) : [...prev, department]
    )
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setStatusFilter([])
    setDepartmentFilter([])
    setCurrentPage(1)
  }

  const activeFilterCount = statusFilter.length + departmentFilter.length

  const handleResize = (column: ResizableColumn) => (
    _event: React.SyntheticEvent,
    { size }: ResizeCallbackData
  ) => {
    const newWidth = Math.max(80, Math.min(400, size.width))
    setColumnWidths((prev) => ({ ...prev, [column]: newWidth }))
    onColumnResize?.(column, newWidth)
  }

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Department", "Position", "Salary", "Hire Date", "Status"]
    const rows = sortedEmployees.map((e) => [
      e.name,
      e.email,
      e.department,
      e.position,
      e.salary,
      e.hireDate,
      e.status,
    ])
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `employees-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(sortedEmployees, null, 2)], {
      type: "application/json;charset=utf-8;",
    })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `employees-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const resizeHandle = (
    <div className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize bg-transparent transition-all hover:w-1.5 hover:bg-primary/40" />
  )

  const columns: {
    key: ResizableColumn
    label: string
    icon?: React.ComponentType<{ className?: string }>
  }[] = [
    { key: "name", label: title },
    { key: "email", label: "Email", icon: Mail },
    { key: "department", label: "Department", icon: Building2 },
    { key: "position", label: "Position", icon: Briefcase },
    { key: "salary", label: "Salary", icon: DollarSign },
    { key: "hireDate", label: "Hire Date", icon: Calendar },
  ]

  return (
    <div className={cn("mx-auto w-full max-w-7xl animate-in fade-in-0 duration-200", className)}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name, email, department, position..."
            className="pl-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter />
                Filter
                {activeFilterCount > 0 && (
                  <span className="ml-1 rounded-sm bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              {STATUS_OPTIONS.map(({ status, label }) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter.includes(status)}
                  onCheckedChange={() => toggleStatusFilter(status)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Department</DropdownMenuLabel>
              {departments.map((department) => (
                <DropdownMenuCheckboxItem
                  key={department}
                  checked={departmentFilter.includes(department)}
                  onCheckedChange={() => toggleDepartmentFilter(department)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {department}
                </DropdownMenuCheckboxItem>
              ))}
              {activeFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={clearFilters}>Clear filters</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown />
                Sort
                {sortField && (
                  <span className="ml-1 rounded-sm bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                    1
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_FIELDS.map(({ field, label }) => (
                <DropdownMenuItem key={field} onSelect={() => handleSort(field)}>
                  {label}
                  {sortField === field && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {sortOrder === "asc" ? "A–Z" : "Z–A"}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={exportToCSV}>CSV</DropdownMenuItem>
              <DropdownMenuItem onSelect={exportToJSON}>JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-border/50 bg-background">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            <div className="flex border-b border-border bg-muted/5 py-3 text-xs font-medium text-muted-foreground/60">
              <div
                className="flex items-center justify-center border-r border-border pr-3"
                style={{ width: CHECKBOX_COLUMN_WIDTH }}
              >
                <Checkbox
                  aria-label="Select all rows on this page"
                  checked={
                    paginatedEmployees.length > 0 &&
                    selectedEmployees.length === paginatedEmployees.length
                  }
                  onCheckedChange={handleSelectAll}
                />
              </div>

              {columns.map(({ key, label, icon: Icon }) => (
                <Resizable
                  key={key}
                  width={columnWidths[key]}
                  height={0}
                  onResize={handleResize(key)}
                  minConstraints={[80, 0]}
                  maxConstraints={[400, 0]}
                  handle={resizeHandle}
                >
                  <div
                    className="relative flex items-center gap-1.5 border-r border-border px-3"
                    style={{ width: columnWidths[key] }}
                  >
                    {Icon && <Icon className="size-3.5 opacity-40" />}
                    <span>{label}</span>
                  </div>
                </Resizable>
              ))}

              <div
                className="flex items-center gap-1.5 px-3"
                style={{ width: STATUS_COLUMN_WIDTH }}
              >
                <Activity className="size-3.5 opacity-40" />
                <span>Status</span>
              </div>
            </div>

            {paginatedEmployees.length === 0 && (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                No employees match your search or filters.
              </div>
            )}

            {paginatedEmployees.map((employee) => (
              <div
                key={employee.id}
                className={cn(
                  "flex border-b border-border py-3.5 transition-colors",
                  selectedEmployees.includes(employee.id)
                    ? "bg-muted/30"
                    : "bg-muted/5 hover:bg-muted/20"
                )}
              >
                <div
                  className="flex items-center justify-center border-r border-border pr-3"
                  style={{ width: CHECKBOX_COLUMN_WIDTH }}
                >
                  <Checkbox
                    aria-label={`Select ${employee.name}`}
                    checked={selectedEmployees.includes(employee.id)}
                    onCheckedChange={() => handleEmployeeSelect(employee.id)}
                  />
                </div>

                <div
                  className="flex min-w-0 items-center border-r border-border px-3"
                  style={{ width: columnWidths.name }}
                >
                  <span className="truncate text-sm text-foreground">{employee.name}</span>
                </div>

                <div
                  className="flex min-w-0 items-center border-r border-border px-3"
                  style={{ width: columnWidths.email }}
                >
                  <a
                    href={`mailto:${employee.email}`}
                    className="truncate text-sm text-blue-500 hover:text-blue-600"
                  >
                    {employee.email}
                  </a>
                </div>

                <div
                  className="flex items-center border-r border-border px-3"
                  style={{ width: columnWidths.department }}
                >
                  <span className="truncate text-sm text-foreground/80">
                    {employee.department}
                  </span>
                </div>

                <div
                  className="flex min-w-0 items-center border-r border-border px-3"
                  style={{ width: columnWidths.position }}
                >
                  <span className="truncate text-sm text-foreground/80">{employee.position}</span>
                </div>

                <div
                  className="flex items-center border-r border-border px-3"
                  style={{ width: columnWidths.salary }}
                >
                  <span className="text-sm font-semibold text-foreground/90">
                    {formatCurrency(employee.salary)}
                  </span>
                </div>

                <div
                  className="flex items-center border-r border-border px-3"
                  style={{ width: columnWidths.hireDate }}
                >
                  <span className="text-sm text-foreground/80">{formatDate(employee.hireDate)}</span>
                </div>

                <div className="flex items-center px-3" style={{ width: STATUS_COLUMN_WIDTH }}>
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                      STATUS_BADGE[employee.status]
                    )}
                  >
                    <div className={cn("size-1.5 rounded-full", STATUS_DOT[employee.status])} />
                    {employee.status.charAt(0).toUpperCase() +
                      employee.status.slice(1).replace("-", " ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground/70">
            Page {currentPage} of {totalPages} · {sortedEmployees.length} employees
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }}
                />
              </PaginationItem>
              {getPaginationRange(currentPage, totalPages).map((page, idx) =>
                page === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === currentPage}
                      onClick={(e) => {
                        e.preventDefault()
                        setCurrentPage(page)
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  className={
                    currentPage === totalPages ? "pointer-events-none opacity-50" : undefined
                  }
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}
