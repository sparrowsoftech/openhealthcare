import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";
import otPostOperativeApi, {
  type OTPostOperativeInput,
  type OTPostOperativeRecord,
  type OTRecoveryStatus,
} from "@/types/ot/otPostOperativeApi";

interface Props {
  facilityId: string;
  scheduleId?: string;
}

const initialForm = {
  recovery_status: "recovering" as OTRecoveryStatus,
  consciousness_level: "",
  temperature: "",
  blood_pressure: "",
  pulse: "",
  respiratory_rate: "",
  oxygen_saturation: "",
  pain_score: "",
  oxygen_support: "",
  recovery_notes: "",
  doctor_instructions: "",
  recorded_by: "",
};

type RecoveryForm = typeof initialForm;

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

function statusLabel(status: OTRecoveryStatus) {
  return {
    recovering: "Recovering",
    stable: "Stable",
    needs_attention: "Needs Attention",
    transferred: "Transferred",
  }[status];
}

export default function OTPostOperativeForm({ facilityId, scheduleId }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RecoveryForm>(initialForm);

  const recordsQuery = useQuery({
    queryKey: ["ot-postoperative", facilityId, scheduleId],
    queryFn: query(otPostOperativeApi.list, {
      pathParams: { facilityId },
    }),
    enabled: !!facilityId && !!scheduleId,
  });

  const records = (recordsQuery.data?.results ?? []).filter(
    (record: OTPostOperativeRecord) => record.schedule_id === scheduleId,
  );

  const saveMutation = useMutation({
    mutationFn: (payload: OTPostOperativeInput) =>
      mutate(otPostOperativeApi.save, {
        pathParams: { facilityId },
      })(payload),

    onSuccess: async (result) => {
      toast.success(result.message || "Recovery assessment saved.");
      setForm(initialForm);

      await queryClient.invalidateQueries({
        queryKey: ["ot-postoperative", facilityId],
      });

      await recordsQuery.refetch();
    },

    onError: (error: unknown) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save recovery assessment.",
      );
    },
  });

  const updateField = <K extends keyof RecoveryForm>(
    field: K,
    value: RecoveryForm[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!scheduleId) {
      toast.error("Select a scheduled surgery first.");
      return;
    }

    let painScore: number | null = null;

    if (form.pain_score.trim() !== "") {
      painScore = Number(form.pain_score);

      if (!Number.isInteger(painScore) || painScore < 0 || painScore > 10) {
        toast.error("Pain score must be an integer between 0 and 10.");
        return;
      }
    }

    const vitals: Record<string, string | number> = {};

    if (form.temperature.trim()) {
      vitals.temperature = form.temperature.trim();
    }

    if (form.blood_pressure.trim()) {
      vitals.blood_pressure = form.blood_pressure.trim();
    }

    if (form.pulse.trim()) {
      vitals.pulse = form.pulse.trim();
    }

    if (form.respiratory_rate.trim()) {
      vitals.respiratory_rate = form.respiratory_rate.trim();
    }

    if (form.oxygen_saturation.trim()) {
      vitals.oxygen_saturation = form.oxygen_saturation.trim();
    }

    saveMutation.mutate({
      schedule_id: scheduleId,
      recovery_status: form.recovery_status,
      consciousness_level: form.consciousness_level.trim(),
      vitals,
      pain_score: painScore,
      oxygen_support: form.oxygen_support.trim(),
      recovery_notes: form.recovery_notes.trim(),
      doctor_instructions: form.doctor_instructions.trim(),
      recorded_by: form.recorded_by.trim(),
    });
  };

  if (!scheduleId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Post-Operative Recovery</CardTitle>
        </CardHeader>
        <CardContent>
          Select a patient with a scheduled surgery before recording recovery
          observations.
        </CardContent>
      </Card>
    );
  }

  if (recordsQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading recovery records...
      </p>
    );
  }

  if (recordsQuery.isError) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-destructive">Unable to load recovery records.</p>
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
          <CardTitle>Post-Operative Recovery Assessment</CardTitle>
          <p className="text-sm text-muted-foreground">
            Record postoperative condition, vital signs and recovery
            instructions for the selected surgery.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Recovery Status">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.recovery_status}
                  onChange={(event) =>
                    updateField(
                      "recovery_status",
                      event.target.value as OTRecoveryStatus,
                    )
                  }
                >
                  <option value="recovering">Recovering</option>
                  <option value="stable">Stable</option>
                  <option value="needs_attention">Needs Attention</option>
                  <option value="transferred">Transferred</option>
                </select>
              </Field>

              <Field label="Consciousness Level">
                <Input
                  value={form.consciousness_level}
                  onChange={(event) =>
                    updateField("consciousness_level", event.target.value)
                  }
                  placeholder="e.g. Alert, Drowsy"
                  maxLength={255}
                />
              </Field>

              <Field label="Temperature">
                <Input
                  value={form.temperature}
                  onChange={(event) =>
                    updateField("temperature", event.target.value)
                  }
                  placeholder="e.g. 37 °C"
                />
              </Field>

              <Field label="Blood Pressure">
                <Input
                  value={form.blood_pressure}
                  onChange={(event) =>
                    updateField("blood_pressure", event.target.value)
                  }
                  placeholder="e.g. 120/80 mmHg"
                />
              </Field>

              <Field label="Pulse">
                <Input
                  value={form.pulse}
                  onChange={(event) => updateField("pulse", event.target.value)}
                  placeholder="e.g. 78 bpm"
                />
              </Field>

              <Field label="Respiratory Rate">
                <Input
                  value={form.respiratory_rate}
                  onChange={(event) =>
                    updateField("respiratory_rate", event.target.value)
                  }
                  placeholder="e.g. 16/min"
                />
              </Field>

              <Field label="Oxygen Saturation">
                <Input
                  value={form.oxygen_saturation}
                  onChange={(event) =>
                    updateField("oxygen_saturation", event.target.value)
                  }
                  placeholder="e.g. 98%"
                />
              </Field>

              <Field label="Pain Score (0–10)">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={form.pain_score}
                  onChange={(event) =>
                    updateField("pain_score", event.target.value)
                  }
                  placeholder="0 to 10"
                />
              </Field>

              <Field label="Oxygen Support">
                <Input
                  value={form.oxygen_support}
                  onChange={(event) =>
                    updateField("oxygen_support", event.target.value)
                  }
                  placeholder="e.g. Room air, Nasal cannula"
                />
              </Field>

              <Field label="Recorded By">
                <Input
                  value={form.recorded_by}
                  onChange={(event) =>
                    updateField("recorded_by", event.target.value)
                  }
                  placeholder="Nurse / Doctor name"
                  maxLength={255}
                />
              </Field>
            </div>

            <Field label="Recovery Notes">
              <Textarea
                value={form.recovery_notes}
                onChange={(event) =>
                  updateField("recovery_notes", event.target.value)
                }
                placeholder="Document the patient's postoperative condition"
                rows={4}
              />
            </Field>

            <Field label="Doctor Instructions">
              <Textarea
                value={form.doctor_instructions}
                onChange={(event) =>
                  updateField("doctor_instructions", event.target.value)
                }
                placeholder="Enter instructions provided by the treating doctor"
                rows={3}
              />
            </Field>

            <div className="flex justify-end">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending
                  ? "Saving..."
                  : "Save Recovery Assessment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recovery Observation History</CardTitle>
          <p className="text-sm text-muted-foreground">
            {records.length} observation(s) recorded for this surgery.
          </p>
        </CardHeader>

        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recovery observations have been recorded yet.
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
                      {statusLabel(record.recovery_status)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(record.assessed_at)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <p>
                      <span className="text-muted-foreground">
                        Consciousness:{" "}
                      </span>
                      {record.consciousness_level || "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Pain Score:{" "}
                      </span>
                      {record.pain_score ?? "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Oxygen Support:{" "}
                      </span>
                      {record.oxygen_support || "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Recorded By:{" "}
                      </span>
                      {record.recorded_by || "—"}
                    </p>
                  </div>

                  {Object.keys(record.vitals ?? {}).length > 0 && (
                    <div className="text-sm">
                      <p className="font-medium">Vital Signs</p>
                      <p className="text-muted-foreground">
                        {Object.entries(record.vitals)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(" · ")}
                      </p>
                    </div>
                  )}

                  {record.recovery_notes && (
                    <div className="text-sm">
                      <p className="font-medium">Recovery Notes</p>
                      <p className="whitespace-pre-wrap">
                        {record.recovery_notes}
                      </p>
                    </div>
                  )}

                  {record.doctor_instructions && (
                    <div className="text-sm">
                      <p className="font-medium">Doctor Instructions</p>
                      <p className="whitespace-pre-wrap">
                        {record.doctor_instructions}
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
