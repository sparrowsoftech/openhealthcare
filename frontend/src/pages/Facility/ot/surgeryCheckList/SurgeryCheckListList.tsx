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

import surgeryCheckListApi from "@/types/ot/surgeryCheckListApi";

interface Props {
  facilityId: string;
}

export default function SurgeryCheckListList({ facilityId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["surgery-checklists"];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: query.paginated(surgeryCheckListApi.list),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      mutate(surgeryCheckListApi.delete, {
        pathParams: { id: String(id) },
      })(),
    onSuccess: async () => {
      toast.success("Surgery checklist deleted successfully");
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      toast.error("Unable to delete surgery checklist.");
    },
  });

  if (isLoading) return <Loading />;

  if (isError) {
    return (
      <Page title="Day Before Surgery Checklist">
        <div className="p-4 text-red-600">
          Unable to load surgery checklists. Please refresh or check your
          permissions.
        </div>
      </Page>
    );
  }

  const records = data?.results ?? [];

  return (
    <Page title="Day Before Surgery Checklist">
      <div className="space-y-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Surgery Check List</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage common pre-operative surgery checklist items.
            </p>
          </div>

          <Button
            onClick={() =>
              navigate(`/facility/${facilityId}/ot/surgery-checklist/new`)
            }
          >
            <Plus className="mr-2 size-4" />
            Add Checklist
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configured Checklist Items ({records.length})</CardTitle>
          </CardHeader>

          <CardContent>
            {records.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                No checklist items found. Add your first checklist item.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold">Sequence</TableHead>
                      <TableHead className="font-bold">
                        Checklist Name
                      </TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="font-bold text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.sequence}</TableCell>
                        <TableCell className="font-medium">
                          {record.checklist_name}
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
                                  `/facility/${facilityId}/ot/surgery-checklist/${record.id}/edit`,
                                )
                              }
                              disabled={deleteMutation.isPending}
                              aria-label={`Edit ${record.checklist_name}`}
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
                                    `Delete "${record.checklist_name}"?`,
                                  )
                                ) {
                                  deleteMutation.mutate(record.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              aria-label={`Delete ${record.checklist_name}`}
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
