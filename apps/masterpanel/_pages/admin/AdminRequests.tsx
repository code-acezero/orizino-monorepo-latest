"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabParam } from "@/hooks/use-tab-param";
import { TabsWithParam } from "@/components/admin/TabsWithParam";
import { toast } from "@/lib/app-toast";
import { format } from "date-fns";
import { ExternalLink, Image as ImageIcon } from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  approved: "bg-green-500/10 text-green-600 border-green-500/30",
  rejected: "bg-red-500/10 text-red-600 border-red-500/30",
  sourcing: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  completed: "bg-green-500/10 text-green-600 border-green-500/30",
};

const AdminRequests = () => {
  const qc = useQueryClient();

  // Product requests (general requests for any product)
  const { data: productRequests = [], isLoading: loadingPR } = useQuery({
    queryKey: ["admin-product-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Import requests (specific URL-based imports)
  const { data: importRequests = [], isLoading: loadingIR } = useQuery({
    queryKey: ["admin-import-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_import_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updatePRStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("product_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-product-requests"] }); toast.success("Updated"); },
    onError: (e) => toast.error(e.message),
  });

  const updateIRStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("product_import_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-import-requests"] }); toast.success("Updated"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold">Product Requests</h1>

      <TabsWithParam defaultTab="requests" basePath="/admin/requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">
            Product Requests
            {productRequests.filter(r => r.status === "pending").length > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px] px-1.5">{productRequests.filter(r => r.status === "pending").length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="imports">
            Import Requests
            {importRequests.filter(r => r.status === "pending").length > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px] px-1.5">{importRequests.filter(r => r.status === "pending").length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Product Requests Tab */}
        <TabsContent value="requests">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPR ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : productRequests.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No product requests yet</TableCell></TableRow>
                ) : productRequests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.product_name}</TableCell>
                    <TableCell>{r.category || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{r.description || "—"}</TableCell>
                    <TableCell>
                      {r.reference_url ? (
                        <a href={r.reference_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                          <ExternalLink className="w-3 h-3" /> Link
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updatePRStatus.mutate({ id: r.id, status: v })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="sourcing">Sourcing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Import Requests Tab */}
        <TabsContent value="imports">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product URL</TableHead>
                  <TableHead>Images</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingIR ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : importRequests.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No import requests yet</TableCell></TableRow>
                ) : importRequests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <a href={r.product_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs max-w-[200px] truncate">
                        <ExternalLink className="w-3 h-3 shrink-0" /> {r.product_url}
                      </a>
                    </TableCell>
                    <TableCell>
                      {r.product_images && r.product_images.length > 0 ? (
                        <div className="flex gap-1">
                          {(r.product_images as string[]).slice(0, 3).map((img, i) => (
                            <img key={i} src={img} alt="" className="w-8 h-8 rounded object-cover border border-border" />
                          ))}
                          {(r.product_images as string[]).length > 3 && (
                            <span className="text-xs text-muted-foreground flex items-center">+{(r.product_images as string[]).length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><ImageIcon className="w-3 h-3" /> None</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{r.notes || "—"}</TableCell>
                    <TableCell className="text-xs">{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updateIRStatus.mutate({ id: r.id, status: v })}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="sourcing">Sourcing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </TabsWithParam>
    </div>
  );
};

export default AdminRequests;
