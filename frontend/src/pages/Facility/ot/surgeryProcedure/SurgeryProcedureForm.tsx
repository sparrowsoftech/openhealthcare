import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { navigate } from "raviger";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import Loading from "@/components/Common/Loading";
import Page from "@/components/Common/Page";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";

import FacilityOrganizationSelector from "@/pages/Facility/settings/organizations/components/FacilityOrganizationSelector";

import surgeryProcedureApi, {
  SurgeryProcedure,
  SurgeryProcedureWrite,
} from "@/types/ot/surgeryProcedureApi";

interface Props {
  facilityId: string;
  procedureId?: string;
}

const initialForm: SurgeryProcedureWrite = {
  procedure_name: "",
  procedure_code: "",
  department: "",
  duration_minutes: 30,
  description: "",
  status: "active",
};

export default function SurgeryProcedureForm({
  facilityId,
  procedureId,
}: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(procedureId);

  const [form, setForm] = useState<SurgeryProcedureWrite>(initialForm);

  const listPath = `/facility/${facilityId}/ot/surgery-procedures`;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["surgery-procedure", facilityId, procedureId],
    queryFn: query(surgeryProcedureApi.get, {
      pathParams: { facilityId, id: procedureId! },
    }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (data) {
      const record = data as SurgeryProcedure;
      setForm({
        procedure_name: record.procedure_name,
        procedure_code: record.procedure_code,
        department: record.department,
        duration_minutes: record.duration_minutes,
        description: record.description ?? "",
        status: record.status,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: SurgeryProcedureWrite) => {
      if (isEdit) {
        return mutate(surgeryProcedureApi.update, {
          pathParams: { facilityId, id: procedureId! },
        })(payload);
      }

      return mutate(surgeryProcedureApi.create, {
        pathParams: { facilityId },
      })(payload);
    },
    onSuccess: async () => {
      toast.success(
        isEdit
          ? "Surgery procedure updated successfully"
          : "Surgery procedure created successfully",
      );

      await queryClient.invalidateQueries({
        queryKey: ["surgery-procedures", facilityId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["surgery-procedure", facilityId, procedureId],
      });

      navigate(listPath);
    },
    onError: () => {
      toast.error(
        isEdit
          ? "Unable to update surgery procedure."
          : "Unable to create procedure. Please check the details.",
      );
    },
  });

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
      toast.error("Please select an organization.");
      return;
    }

    if (
      !Number.isInteger(payload.duration_minutes) ||
      payload.duration_minutes < 1
    ) {
      toast.error("Duration must be at least 1 minute.");
      return;
    }

    saveMutation.mutate(payload);
  };

  if (isEdit && isLoading) {
    return <Loading />;
  }

  if (isEdit && (isError || !data)) {
    return (
      <Page title="Surgery / Procedure Master">
        <div className="p-4">
          <p className="mb-4 text-red-600">
            Unable to load this surgery procedure.
          </p>
          <Button variant="outline" onClick={() => navigate(listPath)}>
            <ArrowLeft className="mr-2 size-4" />
            Back to Procedures
          </Button>
        </div>
      </Page>
    );
  }

  return (
    <Page title={isEdit ? "Edit Surgery Procedure" : "Add Surgery Procedure"}>
      <div className="space-y-6 p-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(listPath)}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Procedures
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>
              {isEdit ? "Edit Surgery / Procedure" : "Add Surgery / Procedure"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
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
                  Department / Organization *
                </label>

                <FacilityOrganizationSelector
                  value={form.department ? [form.department] : null}
                  currentOrganizations={
                    data
                      ? [
                          {
                            id: (data as SurgeryProcedure).department,
                            name: (data as SurgeryProcedure).department_name,
                          } as any,
                        ]
                      : []
                  }
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
                    Select the organization responsible for this procedure.
                  </p>
                )}
              </div>

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
                      duration_minutes:
                        event.target.value === ""
                          ? 0
                          : Number(event.target.value),
                    }))
                  }
                  required
                />
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
                  rows={4}
                />
              </div>

              <div>
                <label
                  htmlFor="procedure-status"
                  className="mb-1 block text-sm font-medium"
                >
                  Status *
                </label>
                <select
                  id="procedure-status"
                  value={form.status}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      status: event.target
                        .value as SurgeryProcedureWrite["status"],
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(listPath)}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending
                    ? "Saving..."
                    : isEdit
                      ? "Update Procedure"
                      : "Save Procedure"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
