import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";
import otOperationApi, {
  type OTOperationInput,
  type OTOperationRecord,
} from "@/types/ot/otOperationApi";

interface Props {
  facilityId: string;
  scheduleId?: string;
}

const emptyForm = {
  procedure_details: "",
  operative_findings: "",
  surgeon_name: "",
  complications: "",
  operation_outcome: "",
  additional_remarks: "",
  anaesthesia: "",
  preoperative_medication: "",
  incision: "",
  surgery_notes: "",
  pathology: "",
  closure: "",
  drainage_tube: "",
  ryles_tube: "",
  biopsy: "",
  postoperative_advice: "",
};

type NotesForm = typeof emptyForm;

function NotesField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

export default function OTOperationNotesForm({
  facilityId,
  scheduleId,
}: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NotesForm>(emptyForm);

  const operationQuery = useQuery({
    queryKey: ["ot-operation", facilityId, scheduleId],
    queryFn: query(otOperationApi.list, {
      pathParams: { facilityId },
    }),
    enabled: !!scheduleId,
  });

  const operation = operationQuery.data?.results?.find(
    (item: OTOperationRecord) => item.schedule_id === scheduleId,
  );

  useEffect(() => {
    setForm({
      procedure_details: operation?.procedure_details ?? "",
      operative_findings: operation?.operative_findings ?? "",
      surgeon_name: operation?.surgeon_name ?? "",
      complications: operation?.complications ?? "",
      operation_outcome: operation?.operation_outcome ?? "",
      additional_remarks: operation?.additional_remarks ?? "",
      anaesthesia: operation?.anaesthesia ?? "",
      preoperative_medication: operation?.preoperative_medication ?? "",
      incision: operation?.incision ?? "",
      surgery_notes: operation?.surgery_notes ?? "",
      pathology: operation?.pathology ?? "",
      closure: operation?.closure ?? "",
      drainage_tube: operation?.drainage_tube ?? "",
      ryles_tube: operation?.ryles_tube ?? "",
      biopsy: operation?.biopsy ?? "",
      postoperative_advice: operation?.postoperative_advice ?? "",
    });
  }, [operation]);

  const saveMutation = useMutation({
    mutationFn: (payload: OTOperationInput) =>
      mutate(otOperationApi.save, {
        pathParams: { facilityId },
      })(payload),

    onSuccess: async () => {
      toast.success("Operation notes saved successfully.");
      await queryClient.invalidateQueries({
        queryKey: ["ot-operation", facilityId],
      });
      await operationQuery.refetch();
    },

    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save operation notes.",
      );
    },
  });

  const updateField = (field: keyof NotesForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!scheduleId) {
      toast.error("Please select a scheduled surgery first.");
      return;
    }

    const payload: OTOperationInput = {
      schedule_id: scheduleId,
      status: operation?.status ?? "not_started",
      team_attendance: operation?.team_attendance ?? [],
      intraoperative_notes: operation?.intraoperative_notes ?? "",
      incident_report: operation?.incident_report ?? "",
      ...form,
    };

    saveMutation.mutate(payload);
  };

  if (!scheduleId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Operation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          Select a patient with a scheduled surgery to record operation notes.
        </CardContent>
      </Card>
    );
  }

  if (operationQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading operation notes...
      </p>
    );
  }

  if (operationQuery.isError) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-destructive">Unable to load operation notes.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void operationQuery.refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operation Notes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Record operative details for the selected surgery.
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <NotesField label="Surgeon Name">
            <Input
              value={form.surgeon_name}
              onChange={(event) =>
                updateField("surgeon_name", event.target.value)
              }
              placeholder="Enter surgeon name"
              maxLength={255}
            />
          </NotesField>

          <NotesField label="Procedure Details">
            <Textarea
              value={form.procedure_details}
              onChange={(event) =>
                updateField("procedure_details", event.target.value)
              }
              placeholder="Describe the procedure performed"
              rows={4}
            />
          </NotesField>

          <NotesField label="Operative Findings">
            <Textarea
              value={form.operative_findings}
              onChange={(event) =>
                updateField("operative_findings", event.target.value)
              }
              placeholder="Document findings observed during surgery"
              rows={4}
            />
          </NotesField>

          <NotesField label="Complications">
            <Textarea
              value={form.complications}
              onChange={(event) =>
                updateField("complications", event.target.value)
              }
              placeholder="Record complications, or explicitly document none"
              rows={3}
            />
          </NotesField>

          <NotesField label="Operation Outcome">
            <Textarea
              value={form.operation_outcome}
              onChange={(event) =>
                updateField("operation_outcome", event.target.value)
              }
              placeholder="Document the outcome of the operation"
              rows={3}
            />
          </NotesField>

          <NotesField label="Additional Remarks">
            <Textarea
              value={form.additional_remarks}
              onChange={(event) =>
                updateField("additional_remarks", event.target.value)
              }
              placeholder="Additional clinical notes"
              rows={3}
            />
          </NotesField>

          <NotesField label="Anaesthesia">
            <Input
              value={form.anaesthesia}
              onChange={(event) =>
                updateField("anaesthesia", event.target.value)
              }
              placeholder="Enter anaesthesia used"
            />
          </NotesField>

          <NotesField label="Preoperative Medication">
            <Textarea
              value={form.preoperative_medication}
              onChange={(event) =>
                updateField("preoperative_medication", event.target.value)
              }
              rows={3}
              placeholder="Record preoperative medication"
            />
          </NotesField>

          <NotesField label="Incision">
            <Textarea
              value={form.incision}
              onChange={(event) => updateField("incision", event.target.value)}
              rows={3}
              placeholder="Describe incision"
            />
          </NotesField>

          <NotesField label="Surgery">
            <Textarea
              value={form.surgery_notes}
              onChange={(event) =>
                updateField("surgery_notes", event.target.value)
              }
              rows={4}
              placeholder="Describe the surgery performed"
            />
          </NotesField>

          <NotesField label="Pathology">
            <Textarea
              value={form.pathology}
              onChange={(event) => updateField("pathology", event.target.value)}
              rows={3}
              placeholder="Record pathology details"
            />
          </NotesField>

          <NotesField label="Closure">
            <Textarea
              value={form.closure}
              onChange={(event) => updateField("closure", event.target.value)}
              rows={3}
              placeholder="Describe wound closure"
            />
          </NotesField>

          <NotesField label="Drainage Tube">
            <Input
              value={form.drainage_tube}
              onChange={(event) =>
                updateField("drainage_tube", event.target.value)
              }
              placeholder="Enter drainage tube details or None"
            />
          </NotesField>

          <NotesField label="Ryles Tube">
            <Input
              value={form.ryles_tube}
              onChange={(event) =>
                updateField("ryles_tube", event.target.value)
              }
              placeholder="Enter Ryles tube details or None"
            />
          </NotesField>

          <NotesField label="Biopsy of Set">
            <Textarea
              value={form.biopsy}
              onChange={(event) => updateField("biopsy", event.target.value)}
              rows={3}
              placeholder="Record biopsy details"
            />
          </NotesField>

          <NotesField label="Post Operative Advice">
            <Textarea
              value={form.postoperative_advice}
              onChange={(event) =>
                updateField("postoperative_advice", event.target.value)
              }
              rows={4}
              placeholder="Record postoperative advice"
            />
          </NotesField>

          <div className="flex justify-end">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Operation Notes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
