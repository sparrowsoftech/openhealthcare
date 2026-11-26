import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { navigate } from "raviger";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import Loading from "@/components/Common/Loading";
import Page from "@/components/Common/Page";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";

import surgeryCheckListApi, {
  SurgeryCheckList,
  SurgeryCheckListWrite,
} from "@/types/ot/surgeryCheckListApi";

interface Props {
  facilityId: string;
  checklistId?: string;
}

const initialForm: SurgeryCheckListWrite = {
  checklist_name: "",
  sequence: 1,
  status: "active",
};

export default function SurgeryCheckListForm({
  facilityId,
  checklistId,
}: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(checklistId);

  const [form, setForm] = useState<SurgeryCheckListWrite>(initialForm);

  const listPath = `/facility/${facilityId}/ot/surgery-checklist`;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["surgery-checklist", checklistId],
    queryFn: query(surgeryCheckListApi.get, {
      pathParams: { id: checklistId! },
    }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (data) {
      const record = data as SurgeryCheckList;
      setForm({
        checklist_name: record.checklist_name,
        sequence: record.sequence,
        status: record.status,
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: SurgeryCheckListWrite) => {
      if (isEdit) {
        return mutate(surgeryCheckListApi.update, {
          pathParams: { id: checklistId! },
        })(payload);
      }

      return mutate(surgeryCheckListApi.create, {})(payload);
    },
    onSuccess: async () => {
      toast.success(
        isEdit
          ? "Surgery checklist updated successfully"
          : "Surgery checklist created successfully",
      );

      await queryClient.invalidateQueries({
        queryKey: ["surgery-checklists"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["surgery-checklist", checklistId],
      });

      navigate(listPath);
    },
    onError: () => {
      toast.error(
        isEdit
          ? "Unable to update surgery checklist."
          : "Unable to create surgery checklist.",
      );
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: SurgeryCheckListWrite = {
      checklist_name: form.checklist_name.trim(),
      sequence: Number(form.sequence),
      status: form.status,
    };

    if (!payload.checklist_name) {
      toast.error("Checklist name is required.");
      return;
    }

    if (!Number.isInteger(payload.sequence) || payload.sequence < 1) {
      toast.error("Sequence must be a positive whole number.");
      return;
    }

    saveMutation.mutate(payload);
  };

  if (isEdit && isLoading) return <Loading />;

  if (isEdit && (isError || !data)) {
    return (
      <Page title="Surgery Check List Master">
        <div className="p-4">
          <p className="mb-4 text-red-600">
            Unable to load this checklist item.
          </p>
          <Button variant="outline" onClick={() => navigate(listPath)}>
            <ArrowLeft className="mr-2 size-4" />
            Back to Checklist
          </Button>
        </div>
      </Page>
    );
  }

  return (
    <Page
      title={
        isEdit ? "Edit Surgery Check List" : "Add Day Before Surgery Check List"
      }
    >
      <div className="space-y-6 p-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(listPath)}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Checklist
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>
              {isEdit ? "Edit Checklist Item" : "Add Checklist Item"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="checklist-name"
                  className="mb-1 block text-sm font-medium"
                >
                  Checklist Name *
                </label>
                <Input
                  id="checklist-name"
                  value={form.checklist_name}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      checklist_name: event.target.value,
                    }))
                  }
                  placeholder="Enter surgery checklist item"
                  maxLength={255}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="checklist-sequence"
                  className="mb-1 block text-sm font-medium"
                >
                  Sequence *
                </label>
                <Input
                  id="checklist-sequence"
                  type="number"
                  min={1}
                  step={1}
                  value={form.sequence}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      sequence:
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
                  htmlFor="checklist-status"
                  className="mb-1 block text-sm font-medium"
                >
                  Status *
                </label>
                <select
                  id="checklist-status"
                  value={form.status}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      status: event.target
                        .value as SurgeryCheckListWrite["status"],
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
                      ? "Update Checklist"
                      : "Save Checklist"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
