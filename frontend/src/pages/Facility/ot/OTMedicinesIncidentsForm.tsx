import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";
import otMedicinesIncidentsApi, {
  type OTIncidentRecord,
  type OTMedicinesIncidentsInput,
  type OTMedicineUsage,
} from "@/types/ot/otMedicinesIncidentsApi";

interface Props {
  facilityId: string;
  scheduleId?: string;
}

const initialMedicineForm = {
  item_name: "",
  dose: "",
  quantity: "1",
  unit: "",
  batch_number: "",
  used_at: "",
  remarks: "",
};

const initialIncidentForm = {
  incident_type: "",
  occurred_at: "",
  description: "",
  immediate_action: "",
  reported_by: "",
  follow_up: "",
};

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

function toISOStringOrNull(value: string) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function OTMedicinesIncidentsForm({
  facilityId,
  scheduleId,
}: Props) {
  const queryClient = useQueryClient();

  const [medicineForm, setMedicineForm] = useState(initialMedicineForm);
  const [incidentForm, setIncidentForm] = useState(initialIncidentForm);

  const recordsQuery = useQuery({
    queryKey: ["ot-medicines-incidents", facilityId],
    queryFn: query(otMedicinesIncidentsApi.list, {
      pathParams: { facilityId },
    }),
    enabled: !!facilityId,
  });

  const medicines = (recordsQuery.data?.medicines?.results ?? []).filter(
    (item: OTMedicineUsage) => item.schedule_id === scheduleId,
  );

  const incidents = (recordsQuery.data?.incidents?.results ?? []).filter(
    (item: OTIncidentRecord) => item.schedule_id === scheduleId,
  );

  const saveMutation = useMutation({
    mutationFn: (payload: OTMedicinesIncidentsInput) =>
      mutate(otMedicinesIncidentsApi.save, {
        pathParams: { facilityId },
      })(payload),

    onSuccess: async (result) => {
      toast.success(result.message || "Record saved successfully.");

      setMedicineForm(initialMedicineForm);
      setIncidentForm(initialIncidentForm);

      await queryClient.invalidateQueries({
        queryKey: ["ot-medicines-incidents", facilityId],
      });

      await recordsQuery.refetch();
    },

    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to save the record.",
      );
    },
  });

  const handleMedicineSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!scheduleId) {
      toast.error("Select a scheduled surgery first.");
      return;
    }

    const quantity = Number(medicineForm.quantity);

    if (!medicineForm.item_name.trim()) {
      toast.error("Enter the medicine or consumable name.");
      return;
    }

    if (!medicineForm.unit.trim()) {
      toast.error("Enter the quantity unit.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }

    saveMutation.mutate({
      record_type: "medicine",
      schedule_id: scheduleId,
      item_name: medicineForm.item_name.trim(),
      dose: medicineForm.dose.trim(),
      quantity,
      unit: medicineForm.unit.trim(),
      batch_number: medicineForm.batch_number.trim(),
      used_at: toISOStringOrNull(medicineForm.used_at),
      remarks: medicineForm.remarks.trim(),
    });
  };

  const handleIncidentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!scheduleId) {
      toast.error("Select a scheduled surgery first.");
      return;
    }

    if (!incidentForm.incident_type.trim()) {
      toast.error("Select or enter the incident type.");
      return;
    }

    if (!incidentForm.description.trim()) {
      toast.error("Enter the incident description.");
      return;
    }

    saveMutation.mutate({
      record_type: "incident",
      schedule_id: scheduleId,
      incident_type: incidentForm.incident_type.trim(),
      occurred_at: toISOStringOrNull(incidentForm.occurred_at),
      description: incidentForm.description.trim(),
      immediate_action: incidentForm.immediate_action.trim(),
      reported_by: incidentForm.reported_by.trim(),
      follow_up: incidentForm.follow_up.trim(),
    });
  };

  if (!scheduleId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Medicines & Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          Select a patient with a scheduled surgery before recording medicine
          usage or incidents.
        </CardContent>
      </Card>
    );
  }

  if (recordsQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading medicines and incident records...
      </p>
    );
  }

  if (recordsQuery.isError) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-destructive">
            Unable to load medicines and incident records.
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
          <CardTitle>Medicines & Consumables</CardTitle>
          <p className="text-sm text-muted-foreground">
            Record items used during this surgery. Saving this form does not
            deduct stock from inventory.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleMedicineSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Medicine / Consumable Name *">
                <Input
                  required
                  maxLength={255}
                  value={medicineForm.item_name}
                  placeholder="e.g. Normal Saline"
                  onChange={(event) =>
                    setMedicineForm({
                      ...medicineForm,
                      item_name: event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Dose">
                <Input
                  maxLength={100}
                  value={medicineForm.dose}
                  placeholder="e.g. 500 ml or 1 vial"
                  onChange={(event) =>
                    setMedicineForm({
                      ...medicineForm,
                      dose: event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Quantity *">
                <Input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={medicineForm.quantity}
                  onChange={(event) =>
                    setMedicineForm({
                      ...medicineForm,
                      quantity: event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Unit *">
                <Input
                  required
                  maxLength={50}
                  value={medicineForm.unit}
                  placeholder="e.g. vial, bottle, piece"
                  onChange={(event) =>
                    setMedicineForm({
                      ...medicineForm,
                      unit: event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Batch Number">
                <Input
                  maxLength={100}
                  value={medicineForm.batch_number}
                  onChange={(event) =>
                    setMedicineForm({
                      ...medicineForm,
                      batch_number: event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Used At">
                <Input
                  type="datetime-local"
                  value={medicineForm.used_at}
                  onChange={(event) =>
                    setMedicineForm({
                      ...medicineForm,
                      used_at: event.target.value,
                    })
                  }
                />
              </Field>
            </div>

            <Field label="Remarks">
              <Textarea
                value={medicineForm.remarks}
                onChange={(event) =>
                  setMedicineForm({
                    ...medicineForm,
                    remarks: event.target.value,
                  })
                }
                placeholder="Additional details"
              />
            </Field>

            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Medicine Usage"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medicine Usage History ({medicines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {medicines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No medicine or consumable entries recorded for this surgery.
            </p>
          ) : (
            <div className="space-y-3">
              {medicines.map((item: OTMedicineUsage) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold">{item.item_name}</p>
                    <span className="text-sm text-muted-foreground">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  {item.dose && (
                    <p className="mt-1 text-sm">Dose: {item.dose}</p>
                  )}
                  {item.batch_number && (
                    <p className="text-sm">Batch: {item.batch_number}</p>
                  )}
                  {item.used_at && (
                    <p className="text-sm text-muted-foreground">
                      Used at: {formatDateTime(item.used_at)}
                    </p>
                  )}
                  {item.remarks && (
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      {item.remarks}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Incident Reporting</CardTitle>
          <p className="text-sm text-muted-foreground">
            Document incidents and immediate actions taken during the operation.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleIncidentSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Incident Type *">
                <select
                  required
                  value={incidentForm.incident_type}
                  onChange={(event) =>
                    setIncidentForm({
                      ...incidentForm,
                      incident_type: event.target.value,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select incident type</option>
                  <option value="equipment">Equipment</option>
                  <option value="medication">Medication</option>
                  <option value="patient_safety">Patient Safety</option>
                  <option value="anaesthesia">Anaesthesia</option>
                  <option value="surgical">Surgical</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label="Occurred At">
                <Input
                  type="datetime-local"
                  value={incidentForm.occurred_at}
                  onChange={(event) =>
                    setIncidentForm({
                      ...incidentForm,
                      occurred_at: event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Reported By">
                <Input
                  maxLength={255}
                  value={incidentForm.reported_by}
                  placeholder="Staff member name"
                  onChange={(event) =>
                    setIncidentForm({
                      ...incidentForm,
                      reported_by: event.target.value,
                    })
                  }
                />
              </Field>
            </div>

            <Field label="Incident Description *">
              <Textarea
                required
                value={incidentForm.description}
                onChange={(event) =>
                  setIncidentForm({
                    ...incidentForm,
                    description: event.target.value,
                  })
                }
                placeholder="Describe what happened"
              />
            </Field>

            <Field label="Immediate Action Taken">
              <Textarea
                value={incidentForm.immediate_action}
                onChange={(event) =>
                  setIncidentForm({
                    ...incidentForm,
                    immediate_action: event.target.value,
                  })
                }
                placeholder="Describe the immediate response"
              />
            </Field>

            <Field label="Follow-up Required">
              <Textarea
                value={incidentForm.follow_up}
                onChange={(event) =>
                  setIncidentForm({
                    ...incidentForm,
                    follow_up: event.target.value,
                  })
                }
                placeholder="Follow-up actions or recommendations"
              />
            </Field>

            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Incident"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Incident History ({incidents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No incidents recorded for this surgery.
            </p>
          ) : (
            <div className="space-y-3">
              {incidents.map((item: OTIncidentRecord) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold">
                      {item.incident_type.replaceAll("_", " ")}
                    </p>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(item.occurred_at)}
                    </span>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {item.description}
                  </p>

                  {item.immediate_action && (
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      <span className="font-medium">Immediate action: </span>
                      {item.immediate_action}
                    </p>
                  )}

                  {item.reported_by && (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Reported by: </span>
                      {item.reported_by}
                    </p>
                  )}

                  {item.follow_up && (
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      <span className="font-medium">Follow-up: </span>
                      {item.follow_up}
                    </p>
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
