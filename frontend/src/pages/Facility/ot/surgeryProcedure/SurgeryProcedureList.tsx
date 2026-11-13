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

import surgeryProcedureApi from "@/types/ot/surgeryProcedureApi";

interface Props {
  facilityId: string;
}

export default function SurgeryProcedureList({ facilityId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["surgery-procedures", facilityId];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: query.paginated(surgeryProcedureApi.list, {
      pathParams: { facilityId },
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      mutate(surgeryProcedureApi.delete, {
        pathParams: { facilityId, id },
      })(),
    onSuccess: async () => {
      toast.success("Surgery procedure deleted successfully");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      toast.error("Unable to delete surgery procedure.");
    },
  });

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <Page title="Surgery / Procedure Master">
        <div className="p-4 text-red-600">
          Unable to load surgery procedures. Please refresh the page or check
          your permissions.
        </div>
      </Page>
    );
  }

  const records = data?.results ?? [];

  return (
    <Page title="Surgery / Procedure Master">
      <div className="space-y-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              Surgery / Procedure Master
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage surgical procedures, departments and expected duration.
            </p>
          </div>

          <Button
            onClick={() =>
              navigate(`/facility/${facilityId}/ot/surgery-procedures/new`)
            }
          >
            <Plus className="mr-2 size-4" />
            Add Procedure
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Configured Surgery Procedures ({records.length})
            </CardTitle>
          </CardHeader>

          <CardContent>
            {records.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                No surgery procedures found. Add your first procedure.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Procedure</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          <div>{record.procedure_name}</div>
                          {record.description && (
                            <div className="mt-1 max-w-xs whitespace-normal text-xs text-gray-500">
                              {record.description}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>{record.procedure_code}</TableCell>
                        <TableCell>{record.department_name || "—"}</TableCell>
                        <TableCell>{record.duration_minutes} min</TableCell>

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
                                  `/facility/${facilityId}/ot/surgery-procedures/${record.id}/edit`,
                                )
                              }
                              disabled={deleteMutation.isPending}
                              aria-label={`Edit ${record.procedure_name}`}
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
                                    `Delete "${record.procedure_name}"?`,
                                  )
                                ) {
                                  deleteMutation.mutate(record.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              aria-label={`Delete ${record.procedure_name}`}
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
