import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";
import otPatientTransferApi, {
  type OTPatientTransferInput,
  type OTPatientTransferRecord,
  type OTTransferDestination,
  type OTTransferStatus,
} from "@/types/ot/otPatientTransferApi";

interface Props {
  facilityId: string;
  scheduleId?: string;
}

const initialForm = {
  destination_type: "icu" as OTTransferDestination,
  destination_name: "",
  transfer_status: "planned" as OTTransferStatus,
  transfer_time: "",
  patient_condition: "",
  receiving_staff: "",
  handover_notes: "",
  recorded_by: "",
};

type TransferForm = typeof initialForm;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function destinationLabel(value: OTTransferDestination) {
  return {
    icu: "ICU",
    inpatient_ward: "Inpatient Ward",
    recovery_room: "Recovery Room",
    other: "Other",
  }[value];
}

function transferStatusLabel(value: OTTransferStatus) {
  return {
    planned: "Planned",
    transferred: "Transferred",
    cancelled: "Cancelled",
  }[value];
}

export default function OTPatientTransferForm({
  facilityId,
  scheduleId,
}: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TransferForm>(initialForm);

  const recordsQuery = useQuery({
    queryKey: ["ot-patient-transfer", facilityId, scheduleId],
    queryFn: query(otPatientTransferApi.list, {
      pathParams: { facilityId },
    }),
    enabled: !!facilityId && !!scheduleId,
  });

  const records = (recordsQuery.data?.results ?? []).filter(
    (record: OTPatientTransferRecord) => record.schedule_id === scheduleId,
  );

  const saveMutation = useMutation({
    mutationFn: (payload: OTPatientTransferInput) =>
      mutate(otPatientTransferApi.save, {
        pathParams: { facilityId },
      })(payload),

    onSuccess: async (result) => {
      toast.success(result.message || "Transfer record saved.");
      setForm(initialForm);

      await queryClient.invalidateQueries({
        queryKey: ["ot-patient-transfer", facilityId],
      });

      await recordsQuery.refetch();
    },

    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save the transfer record.",
      );
    },
  });

  const updateField = <K extends keyof TransferForm>(
    field: K,
    value: TransferForm[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!scheduleId) {
      toast.error("Select a scheduled surgery first.");
      return;
    }

    if (
      form.transfer_status === "transferred" &&
      form.destination_type === "other" &&
      !form.destination_name.trim()
    ) {
      toast.error("Specify the destination when destination type is Other.");
      return;
    }

    let transferTime: string | null = null;

    if (form.transfer_time) {
      const date = new Date(form.transfer_time);

      if (Number.isNaN(date.getTime())) {
        toast.error("Enter a valid transfer date and time.");
        return;
      }

      transferTime = date.toISOString();
    }

    saveMutation.mutate({
      schedule_id: scheduleId,
      destination_type: form.destination_type,
      destination_name: form.destination_name.trim(),
      transfer_status: form.transfer_status,
      transfer_time: transferTime,
      patient_condition: form.patient_condition.trim(),
      receiving_staff: form.receiving_staff.trim(),
      handover_notes: form.handover_notes.trim(),
      recorded_by: form.recorded_by.trim(),
    });
  };

  if (!scheduleId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ICU / Inpatient Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          Select a patient with a scheduled surgery before recording a transfer.
        </CardContent>
      </Card>
    );
  }

  if (recordsQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading patient transfer records...
      </p>
    );
  }

  if (recordsQuery.isError) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-destructive">
            Unable to load patient transfer records.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void recordsQuery.refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Patient Transfer & Handover</CardTitle>
          <p className="text-sm text-muted-foreground">
            Record the destination, transfer status and clinical handover for
            the selected surgery.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Destination Type">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.destination_type}
                  onChange={(event) =>
                    updateField(
                      "destination_type",
                      event.target.value as OTTransferDestination,
                    )
                  }
                >
                  <option value="icu">ICU</option>
                  <option value="inpatient_ward">Inpatient Ward</option>
                  <option value="recovery_room">Recovery Room</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label="Destination Name / Ward / Bed">
                <Input
                  value={form.destination_name}
                  onChange={(event) =>
                    updateField("destination_name", event.target.value)
                  }
                  placeholder="e.g. ICU-1, Ward A, Bed 12"
                  maxLength={255}
                />
              </Field>

              <Field label="Transfer Status">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.transfer_status}
                  onChange={(event) =>
                    updateField(
                      "transfer_status",
                      event.target.value as OTTransferStatus,
                    )
                  }
                >
                  <option value="planned">Planned</option>
                  <option value="transferred">Transferred</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>

              <Field label="Transfer Date & Time">
                <Input
                  type="datetime-local"
                  value={form.transfer_time}
                  onChange={(event) =>
                    updateField("transfer_time", event.target.value)
                  }
                />
              </Field>

              <Field label="Receiving Staff">
                <Input
                  value={form.receiving_staff}
                  onChange={(event) =>
                    updateField("receiving_staff", event.target.value)
                  }
                  placeholder="Receiving nurse / doctor"
                  maxLength={255}
                />
              </Field>

              <Field label="Recorded By">
                <Input
                  value={form.recorded_by}
                  onChange={(event) =>
                    updateField("recorded_by", event.target.value)
                  }
                  placeholder="Staff member's name"
                  maxLength={255}
                />
              </Field>
            </div>

            <Field label="Patient Condition at Transfer">
              <Textarea
                value={form.patient_condition}
                onChange={(event) =>
                  updateField("patient_condition", event.target.value)
                }
                placeholder="Document the patient's condition at handover"
                rows={4}
              />
            </Field>

            <Field label="Handover Notes">
              <Textarea
                value={form.handover_notes}
                onChange={(event) =>
                  updateField("handover_notes", event.target.value)
                }
                placeholder="Include relevant clinical handover details and instructions"
                rows={4}
              />
            </Field>

            <div className="flex justify-end">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Transfer Record"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
          <p className="text-sm text-muted-foreground">
            {records.length} transfer record(s) for this surgery.
          </p>
        </CardHeader>

        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transfer records have been recorded yet.
            </p>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="space-y-2 rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {destinationLabel(record.destination_type)}
                      {record.destination_name
                        ? ` — ${record.destination_name}`
                        : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {transferStatusLabel(record.transfer_status)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <p>
                      <span className="text-muted-foreground">
                        Transfer Time:{" "}
                      </span>
                      {formatDateTime(record.transfer_time)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Receiving Staff:{" "}
                      </span>
                      {record.receiving_staff || "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Recorded By:{" "}
                      </span>
                      {record.recorded_by || "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Created: </span>
                      {formatDateTime(record.created_date)}
                    </p>
                  </div>

                  {record.patient_condition && (
                    <div className="text-sm">
                      <p className="font-medium">Patient Condition</p>
                      <p className="whitespace-pre-wrap">
                        {record.patient_condition}
                      </p>
                    </div>
                  )}

                  {record.handover_notes && (
                    <div className="text-sm">
                      <p className="font-medium">Handover Notes</p>
                      <p className="whitespace-pre-wrap">
                        {record.handover_notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
