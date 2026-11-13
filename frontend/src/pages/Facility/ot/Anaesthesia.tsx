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

import anaesthesiaApi, {
  Anaesthesia as AnaesthesiaRecord,
  AnaesthesiaWrite,
} from "@/types/ot/anaesthesiaApi";

interface Props {
  facilityId: string;
}

const initialForm: AnaesthesiaWrite = {
  anaesthesia_name: "",
  anaesthesia_code: "",
  description: "",
  status: "active",
};

export default function Anaesthesia({ facilityId }: Props) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<AnaesthesiaWrite>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const queryKey = ["anaesthesia", facilityId];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: query(anaesthesiaApi.list, {
      pathParams: { facilityId },
    }),
  });

  const refreshList = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const createMutation = useMutation({
    mutationFn: mutate(anaesthesiaApi.create, {
      pathParams: { facilityId },
    }),
    onSuccess: async () => {
      toast.success("Anaesthesia method created successfully");
      resetForm();
      await refreshList();
    },
    onError: () => {
      toast.error(
        "Unable to create anaesthesia method. Please check the details.",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnaesthesiaWrite }) =>
      mutate(anaesthesiaApi.update, {
        pathParams: { facilityId, id },
      })(payload),
    onSuccess: async () => {
      toast.success("Anaesthesia method updated successfully");
      resetForm();
      await refreshList();
    },
    onError: () => {
      toast.error("Unable to update anaesthesia method.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      mutate(anaesthesiaApi.delete, {
        pathParams: { facilityId, id },
      })(),
    onSuccess: async () => {
      toast.success("Anaesthesia method deleted successfully");

      if (editingId) {
        resetForm();
      }

      await refreshList();
    },
    onError: () => {
      toast.error("Unable to delete anaesthesia method.");
    },
  });

  const handleEdit = (record: AnaesthesiaRecord) => {
    setEditingId(record.id);
    setForm({
      anaesthesia_name: record.anaesthesia_name,
      anaesthesia_code: record.anaesthesia_code,
      description: record.description ?? "",
      status: record.status,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: AnaesthesiaWrite = {
      anaesthesia_name: form.anaesthesia_name.trim(),
      anaesthesia_code: form.anaesthesia_code.trim(),
      description: form.description.trim(),
      status: form.status,
    };

    if (!payload.anaesthesia_name || !payload.anaesthesia_code) {
      toast.error("Anaesthesia name and code are required.");
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
      <Page title="Anaesthesia Master">
        <div className="p-4 text-red-600">
          Unable to load anaesthesia methods. Please refresh the page or check
          your permissions.
        </div>
      </Page>
    );
  }

  const records = data?.results ?? [];
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Page title="Anaesthesia Master">
      <div className="space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Anaesthesia Master</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage anaesthesia methods used during surgical procedures.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Edit Anaesthesia Method" : "Add Anaesthesia Method"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="anaesthesia-name"
                    className="mb-1 block text-sm font-medium"
                  >
                    Anaesthesia Name *
                  </label>
                  <Input
                    id="anaesthesia-name"
                    value={form.anaesthesia_name}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        anaesthesia_name: event.target.value,
                      }))
                    }
                    placeholder="e.g. General Anaesthesia"
                    maxLength={255}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="anaesthesia-code"
                    className="mb-1 block text-sm font-medium"
                  >
                    Anaesthesia Code *
                  </label>
                  <Input
                    id="anaesthesia-code"
                    value={form.anaesthesia_code}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        anaesthesia_code: event.target.value,
                      }))
                    }
                    placeholder="e.g. GA"
                    maxLength={100}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="anaesthesia-description"
                  className="mb-1 block text-sm font-medium"
                >
                  Description
                </label>
                <Textarea
                  id="anaesthesia-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              <div>
                <label
                  htmlFor="anaesthesia-status"
                  className="mb-1 block text-sm font-medium"
                >
                  Status
                </label>
                <select
                  id="anaesthesia-status"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      status: event.target.value as AnaesthesiaWrite["status"],
                    }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
                      ? "Update Anaesthesia"
                      : "Save Anaesthesia"}
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
              Configured Anaesthesia Methods ({records.length})
            </CardTitle>
          </CardHeader>

          <CardContent>
            {records.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                No anaesthesia methods found. Add your first method above.
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
                              onClick={() => handleEdit(record)}
                              disabled={deleteMutation.isPending}
                            >
                              <Pencil className="mr-1 size-4" />
                              Edit
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
                            >
                              <Trash2 className="mr-1 size-4" />
                              Delete
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
