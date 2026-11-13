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

import surgeryAnaesthesiaConfigApi, {
  SurgeryAnaesthesiaConfigWrite,
} from "@/types/ot/surgeryAnaesthesiaConfigApi";
import surgeryProcedureApi from "@/types/ot/surgeryProcedureApi";

interface Props {
  facilityId: string;
  configId?: string;
}

const initialForm: SurgeryAnaesthesiaConfigWrite = {
  surgery_procedure: "",
  anaesthesia_format: "",
  age_range: "",
  gender: "",
  weight: null,
  condition: "",
  dose: "",
  status: "active",
};

export default function SurgeryAnaesthesiaConfigForm({
  facilityId,
  configId,
}: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(configId);
  const listPath = `/facility/${facilityId}/ot/surgery-anaesthesia-config`;
  const [form, setForm] = useState<SurgeryAnaesthesiaConfigWrite>(initialForm);

  const proceduresQuery = useQuery({
    queryKey: ["surgery-procedures", facilityId],
    queryFn: query.paginated(surgeryProcedureApi.list, {
      pathParams: { facilityId },
    }),
  });

  const configQuery = useQuery({
    queryKey: ["surgery-anaesthesia-config-record", facilityId, configId],
    queryFn: query(surgeryAnaesthesiaConfigApi.get, {
      pathParams: { facilityId, id: configId! },
    }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (configQuery.data) {
      const record = configQuery.data;
      setForm({
        id: record.id,
        surgery_procedure: record.surgery_procedure,
        anaesthesia_format: record.anaesthesia_format,
        age_range: record.age_range ?? "",
        gender: record.gender ?? "",
        weight:
          record.weight === null || record.weight === ""
            ? null
            : Number(record.weight),
        condition: record.condition ?? "",
        dose: record.dose ?? "",
        status: record.status,
      });
    }
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload: SurgeryAnaesthesiaConfigWrite) =>
      mutate(surgeryAnaesthesiaConfigApi.upsert, {
        pathParams: { facilityId },
      })({
        datapoints: [payload],
      }),
    onSuccess: async () => {
      toast.success(
        isEdit
          ? "Configuration updated successfully"
          : "Configuration saved successfully",
      );
      await queryClient.invalidateQueries({
        queryKey: ["surgery-anaesthesia-config", facilityId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["surgery-anaesthesia-config-record", facilityId, configId],
      });
      navigate(listPath);
    },
    onError: () => {
      toast.error(
        "Unable to save configuration. Please check the fields and permissions.",
      );
    },
  });

  const handleChange = (
    field: keyof SurgeryAnaesthesiaConfigWrite,
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.surgery_procedure) {
      toast.error("Please select a surgery procedure.");
      return;
    }

    if (!form.anaesthesia_format.trim()) {
      toast.error("Please enter anaesthesia format.");
      return;
    }

    if (
      form.weight !== null &&
      (!Number.isFinite(Number(form.weight)) || Number(form.weight) < 0)
    ) {
      toast.error("Weight must be a valid non-negative number.");
      return;
    }

    const payload: SurgeryAnaesthesiaConfigWrite = {
      ...(isEdit && configId ? { id: configId } : {}),
      surgery_procedure: form.surgery_procedure,
      anaesthesia_format: form.anaesthesia_format.trim(),
      age_range: form.age_range.trim(),
      gender: form.gender,
      weight:
        form.weight === null || form.weight === ("" as unknown as number)
          ? null
          : Number(form.weight),
      condition: form.condition.trim(),
      dose: form.dose.trim(),
      status: form.status,
    };

    saveMutation.mutate(payload);
  };

  if (proceduresQuery.isLoading || (isEdit && configQuery.isLoading)) {
    return <Loading />;
  }

  if (proceduresQuery.isError || (isEdit && configQuery.isError)) {
    return (
      <Page title="Surgery–Anaesthesia Configuration">
        <p className="p-4 text-red-600">
          Unable to load the procedure list or configuration.
        </p>
      </Page>
    );
  }

  const procedures = (proceduresQuery.data?.results ?? []).filter(
    (procedure) => procedure.status === "active",
  );

  return (
    <Page title={isEdit ? "Edit Configuration" : "Add Configuration"}>
      <div className="mx-auto max-w-4xl space-y-6 p-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(listPath)}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Configurations
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>
              {isEdit
                ? "Edit Surgery–Anaesthesia Configuration"
                : "Add Surgery–Anaesthesia Configuration"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="surgery_procedure"
                    className="text-sm font-medium"
                  >
                    Surgery / Procedure <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="surgery_procedure"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.surgery_procedure}
                    onChange={(event) =>
                      handleChange("surgery_procedure", event.target.value)
                    }
                    required
                  >
                    <option value="">Select surgery / procedure</option>
                    {procedures.map((procedure) => (
                      <option key={procedure.id} value={procedure.id}>
                        {procedure.procedure_name}
                      </option>
                    ))}
                  </select>
                  {procedures.length === 0 && (
                    <p className="text-xs text-amber-600">
                      Add an active procedure in Surgery / Procedure Master
                      first.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="anaesthesia_format"
                    className="text-sm font-medium"
                  >
                    Anaesthesia Format <span className="text-red-600">*</span>
                  </label>
                  <Input
                    id="anaesthesia_format"
                    value={form.anaesthesia_format}
                    onChange={(event) =>
                      handleChange("anaesthesia_format", event.target.value)
                    }
                    placeholder="Enter anaesthesia format"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="age_range" className="text-sm font-medium">
                    Age Range (Year)
                  </label>
                  <Input
                    id="age_range"
                    value={form.age_range}
                    onChange={(event) =>
                      handleChange("age_range", event.target.value)
                    }
                    placeholder="e.g. 18-60"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="gender" className="text-sm font-medium">
                    Gender
                  </label>
                  <select
                    id="gender"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.gender}
                    onChange={(event) =>
                      handleChange("gender", event.target.value)
                    }
                  >
                    <option value="">Select gender</option>
                    <option value="Any">Any</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="weight" className="text-sm font-medium">
                    Weight (Kg)
                  </label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.weight ?? ""}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        weight:
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                      }))
                    }
                    placeholder="Enter weight in Kg"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="status" className="text-sm font-medium">
                    Status
                  </label>
                  <select
                    id="status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(event) =>
                      handleChange("status", event.target.value)
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="condition" className="text-sm font-medium">
                    Condition
                  </label>
                  <Textarea
                    id="condition"
                    value={form.condition}
                    onChange={(event) =>
                      handleChange("condition", event.target.value)
                    }
                    placeholder="Enter condition or clinical criteria"
                    rows={3}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="dose" className="text-sm font-medium">
                    Dose
                  </label>
                  <Textarea
                    id="dose"
                    value={form.dose}
                    onChange={(event) =>
                      handleChange("dose", event.target.value)
                    }
                    placeholder="Enter dose details"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(listPath)}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending || procedures.length === 0}
                >
                  {saveMutation.isPending
                    ? "Saving..."
                    : isEdit
                      ? "Update Configuration"
                      : "Save Configuration"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
