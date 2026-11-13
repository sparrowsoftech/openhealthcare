import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { navigate } from "raviger";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import Loading from "@/components/Common/Loading";
import Page from "@/components/Common/Page";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";

import anaesthesiaApi from "@/types/ot/anaesthesiaApi";

interface Props {
  facilityId: string;
}

export default function AnaesthesiaList({ facilityId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["anaesthesia", facilityId];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: query(anaesthesiaApi.list, {
      pathParams: { facilityId },
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      mutate(anaesthesiaApi.delete, {
        pathParams: { facilityId, id },
      })(),
    onSuccess: async () => {
      toast.success("Anaesthesia method deleted successfully");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      toast.error("Unable to delete anaesthesia method.");
    },
  });

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <Page title="Anaesthesia Master">
        <div className="p-4 text-red-600">
          Unable to load anaesthesia methods. Please refresh the page or check
          your permissions.
        </div>
      </Page>
    );
  }

  const records = data?.results ?? [];

  return (
    <Page title="Anaesthesia Master">
      <div className="space-y-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Anaesthesia Master</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage anaesthesia methods used during surgical procedures.
            </p>
          </div>

          <Button
            onClick={() =>
              navigate(`/facility/${facilityId}/ot/anaesthesia/new`)
            }
          >
            <Plus className="mr-2 size-4" />
            Add Anaesthesia
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Configured Anaesthesia Methods ({records.length})
            </CardTitle>
          </CardHeader>

          <CardContent>
            {records.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                No anaesthesia methods found. Add your first method.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.anaesthesia_name}
                        </TableCell>

                        <TableCell>{record.anaesthesia_code}</TableCell>

                        <TableCell className="max-w-xs whitespace-normal">
                          {record.description || "—"}
                        </TableCell>

                        <TableCell>
                          <span
                            className={
                              record.status === "active"
                                ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800"
                                : "rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                            }
                          >
                            {record.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/facility/${facilityId}/ot/anaesthesia/${record.id}/edit`,
                                )
                              }
                              disabled={deleteMutation.isPending}
                              aria-label={`Edit ${record.anaesthesia_name}`}
                            >
                              <Pencil className="size-4" />
                            </Button>

                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete "${record.anaesthesia_name}"?`,
                                  )
                                ) {
                                  deleteMutation.mutate(record.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              aria-label={`Delete ${record.anaesthesia_name}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
