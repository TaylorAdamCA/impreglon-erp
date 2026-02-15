"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Tool {
  id: string;
  toolNo: number;
  description: string;
  toolType: string | null;
  status: string;
  price: string | null;
  owner: string | null;
  location: string | null;
  isProprietary: boolean;
}

interface ToolListProps {
  tools: Tool[];
  canCreate: boolean;
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Received", value: "RECEIVED" },
  { label: "In Use", value: "IN_USE" },
  { label: "Retired", value: "RETIRED" },
];

const PROPRIETARY_FILTERS = [
  { label: "All", value: "" },
  { label: "Proprietary", value: "yes" },
  { label: "Standard", value: "no" },
];

function statusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge variant="outline" className="border-green-500 text-green-600">
          Active
        </Badge>
      );
    case "RECEIVED":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          Received
        </Badge>
      );
    case "IN_USE":
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-600">
          In Use
        </Badge>
      );
    case "RETIRED":
      return <Badge variant="secondary">Retired</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatPrice(price: string | null) {
  if (!price) return "\u2014";
  const num = parseFloat(price);
  return `$${num.toFixed(2)}`;
}

export function ToolList({ tools, canCreate }: ToolListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [proprietaryFilter, setProprietaryFilter] = useState("");

  const filtered = useMemo(() => {
    return tools.filter((tool) => {
      if (statusFilter && tool.status !== statusFilter) return false;

      if (proprietaryFilter === "yes" && !tool.isProprietary) return false;
      if (proprietaryFilter === "no" && tool.isProprietary) return false;

      if (search) {
        const term = search.toLowerCase();
        const matchesToolNo = String(tool.toolNo).includes(term);
        const matchesDescription = tool.description
          .toLowerCase()
          .includes(term);
        const matchesOwner = tool.owner
          ? tool.owner.toLowerCase().includes(term)
          : false;

        if (!matchesToolNo && !matchesDescription && !matchesOwner)
          return false;
      }

      return true;
    });
  }, [tools, search, statusFilter, proprietaryFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tools</h1>
          <p className="mt-1 text-muted-foreground">
            {tools.length} tool{tools.length !== 1 ? "s" : ""} in inventory
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => router.push("/tools/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Tool
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tool #, description, or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value || "all-status"}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {PROPRIETARY_FILTERS.map((filter) => (
            <Button
              key={filter.value || "all-prop"}
              variant={
                proprietaryFilter === filter.value ? "default" : "outline"
              }
              size="sm"
              onClick={() => setProprietaryFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Tool #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-28">Type</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-32">Owner</TableHead>
              <TableHead className="w-32">Location</TableHead>
              <TableHead className="w-20">Prop.</TableHead>
              <TableHead className="w-24 text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {search || statusFilter || proprietaryFilter ? (
                    <div className="flex flex-col items-center gap-1">
                      <Search className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No tools found</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No tools in inventory
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tool) => (
                <TableRow
                  key={tool.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/tools/${tool.id}`)}
                >
                  <TableCell className="font-mono font-medium">
                    {tool.toolNo}
                  </TableCell>
                  <TableCell>{tool.description}</TableCell>
                  <TableCell>{tool.toolType ?? "\u2014"}</TableCell>
                  <TableCell>{statusBadge(tool.status)}</TableCell>
                  <TableCell>{tool.owner ?? "\u2014"}</TableCell>
                  <TableCell>{tool.location ?? "\u2014"}</TableCell>
                  <TableCell>
                    {tool.isProprietary ? (
                      <Badge
                        variant="outline"
                        className="border-purple-500 text-purple-600"
                      >
                        Yes
                      </Badge>
                    ) : (
                      "\u2014"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPrice(tool.price)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
