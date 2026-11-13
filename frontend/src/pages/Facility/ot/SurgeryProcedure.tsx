import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import Loading from "@/components/Common/Loading";
import Page from "@/components/Common/Page";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";

import FacilityOrganizationSelector from "@/pages/Facility/settings/organizations/components/FacilityOrganizationSelector";

import surgeryProcedureApi, {
  SurgeryProcedure as SurgeryProcedureRecord,
  SurgeryProcedureWrite,
} from "@/types/ot/surgeryProcedureApi";

interface Props {
  facilityId: string;
}

const initialForm: SurgeryProcedureWrite = {
  procedure_name: "",
  procedure_code: "",
  department: "",
  duration_minutes: 30,
  description: "",
  status: "active",
};

export default function SurgeryProcedure({ facilityId }: Props) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<SurgeryProcedureWrite>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const queryKey = ["surgery-procedures", facilityId];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: query(surgeryProcedureApi.list, {
      pathParams: { facilityId },
    }),
  });

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const refreshList = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const createMutation = useMutation({
    mutationFn: mutate(surgeryProcedureApi.create, {
      pathParams: { facilityId },
    }),
    onSuccess: async () => {
      toast.success("Surgery procedure created successfully");
      resetForm();
      await refreshList();
    },
    onError: () => {
      toast.error("Unable to create procedure. Please check the details.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: SurgeryProcedureWrite;
    }) =>
      mutate(surgeryProcedureApi.update, {
        pathParams: { facilityId, id },
      })(payload),
    onSuccess: async () => {
      toast.success("Surgery procedure updated successfully");
      resetForm();
      await refreshList();
    },
    onError: () => {
      toast.error("Unable to update surgery procedure.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      mutate(surgeryProcedureApi.delete, {
        pathParams: { facilityId, id },
      })(),
    onSuccess: async () => {
      toast.success("Surgery procedure deleted successfully");
      resetForm();
      await refreshList();
    },
    onError: () => {
      toast.error("Unable to delete surgery procedure.");
    },
  });

  const handleEdit = (record: SurgeryProcedureRecord) => {
    setEditingId(record.id);
    setForm({
      procedure_name: record.procedure_name,
      procedure_code: record.procedure_code,
      department: record.department,
      duration_minutes: record.duration_minutes,
      description: record.description ?? "",
      status: record.status,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: SurgeryProcedureWrite = {
      procedure_name: form.procedure_name.trim(),
      procedure_code: form.procedure_code.trim(),
      department: form.department,
      duration_minutes: Number(form.duration_minutes),
      description: form.description.trim(),
      status: form.status,
    };

    if (!payload.procedure_name || !payload.procedure_code) {
      toast.error("Procedure name and code are required.");
      return;
    }

    if (!payload.department) {
      toast.error("Please select a department.");
      return;
    }

    if (
      !Number.isInteger(payload.duration_minutes) ||
      payload.duration_minutes < 1
    ) {
      toast.error("Duration must be at least 1 minute.");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

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
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Page title="Surgery / Procedure Master">
      <div className="space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Surgery / Procedure Master</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure surgical procedures, departments and expected duration.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Edit Surgery Procedure" : "Add Surgery Procedure"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="procedure-name"
                    className="mb-1 block text-sm font-medium"
                  >
                    Procedure Name *
                  </label>
                  <Input
                    id="procedure-name"
                    value={form.procedure_name}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        procedure_name: event.target.value,
                      }))
                    }
                    placeholder="e.g. Appendectomy"
                    maxLength={255}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="procedure-code"
                    className="mb-1 block text-sm font-medium"
                  >
                    Procedure Code *
                  </label>
                  <Input
                    id="procedure-code"
                    value={form.procedure_code}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        procedure_code: event.target.value,
                      }))
                    }
                    placeholder="e.g. SURG-001"
                    maxLength={100}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Department *
                </label>
                <FacilityOrganizationSelector
                  value={form.department ? [form.department] : null}
                  onChange={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      department: value?.[0] ?? "",
                    }))
                  }
                  facilityId={facilityId}
                  singleSelection={true}
                />
                {!form.department && (
                  <p className="mt-1 text-xs text-gray-500">
                    Select the department responsible for this procedure.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="procedure-duration"
                    className="mb-1 block text-sm font-medium"
                  >
                    Duration (minutes) *
                  </label>
                  <Input
                    id="procedure-duration"
                    type="number"
                    min={1}
                    step={1}
                    value={form.duration_minutes}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        duration_minutes: Number(event.target.value),
                      }))
                    }
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="procedure-status"
                    className="mb-1 block text-sm font-medium"
                  >
                    Status
                  </label>
                  <select
                    id="procedure-status"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.status}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        status: event.target
                          .value as SurgeryProcedureWrite["status"],
                      }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="procedure-description"
                  className="mb-1 block text-sm font-medium"
                >
                  Description
                </label>
                <Textarea
                  id="procedure-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Enter procedure details"
                  rows={3}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={isSaving || deleteMutation.isPending}
                >
                  {editingId ? (
                    <Pencil className="mr-2 size-4" />
                  ) : (
                    <Plus className="mr-2 size-4" />
                  )}
                  {isSaving
                    ? "Saving..."
                    : editingId
                      ? "Update Procedure"
                      : "Save Procedure"}
                </Button>

                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={isSaving}
                  >
                    <X className="mr-2 size-4" />
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Configured Surgery Procedures ({records.length})
            </CardTitle>
          </CardHeader>

          <CardContent>
            {records.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                No surgery procedures found. Add your first procedure above.
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
                              onClick={() => handleEdit(record)}
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
