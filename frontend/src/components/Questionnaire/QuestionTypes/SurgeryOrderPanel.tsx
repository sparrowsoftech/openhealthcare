import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";

import surgeryOrderApi, {
  SurgeryOrderCreate,
  SurgeryOrderPriority,
} from "@/types/ot/surgeryOrderApi";
import surgeryProcedureApi from "@/types/ot/surgeryProcedureApi";

interface Props {
  facilityId: string;
  encounterId: string;
  disabled?: boolean;
}

export default function SurgeryOrderPanel({
  facilityId,
  encounterId,
  disabled,
}: Props) {
  const queryClient = useQueryClient();

  const [procedureId, setProcedureId] = useState("");
  const [priority, setPriority] = useState<SurgeryOrderPriority>("routine");
  const [note, setNote] = useState("");
  const [patientInstruction, setPatientInstruction] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["surgery-procedures", facilityId],
    queryFn: query(surgeryProcedureApi.list, {
      pathParams: { facilityId },
    }),
  });

  const procedures =
    data?.results?.filter((item) => item.status === "active") ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: SurgeryOrderCreate) =>
      mutate(surgeryOrderApi.create, {
        pathParams: { facilityId },
      })(payload),

    onSuccess: async () => {
      toast.success("Surgery order created successfully.");

      setProcedureId("");
      setPriority("routine");
      setNote("");
      setPatientInstruction("");

      await queryClient.invalidateQueries({
        queryKey: ["ot-waiting-list", facilityId],
      });
    },

    onError: (error: any) => {
      toast.error(error?.message || "Unable to create surgery order.");
    },
  });

  const handleSubmit = () => {
    if (!procedureId) {
      toast.error("Please select a surgery procedure.");
      return;
    }

    createMutation.mutate({
      surgery_procedure: procedureId,
      encounter: encounterId,
      priority,
      note: note.trim() || null,
      patient_instruction: patientInstruction.trim() || null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Surgery Order</CardTitle>
        <p className="text-sm text-gray-500">
          Create a surgery order for this patient encounter.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Surgery / Procedure *</Label>

          <Select
            value={procedureId}
            onValueChange={setProcedureId}
            disabled={disabled || isLoading || createMutation.isPending}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  isLoading
                    ? "Loading procedures..."
                    : "Select surgery procedure"
                }
              />
            </SelectTrigger>

            <SelectContent>
              {procedures.map((procedure) => (
                <SelectItem key={procedure.id} value={procedure.id}>
                  {procedure.procedure_name} ({procedure.procedure_code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isLoading && procedures.length === 0 && (
            <p className="text-xs text-red-500">
              No active surgery procedures found in Surgery Master.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>

          <Select
            value={priority}
            onValueChange={(value) =>
              setPriority(value as SurgeryOrderPriority)
            }
            disabled={disabled || createMutation.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="routine">Routine</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="asap">ASAP</SelectItem>
              <SelectItem value="stat">STAT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Doctor's Note</Label>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Enter clinical notes..."
            disabled={disabled || createMutation.isPending}
          />
        </div>

        <div className="space-y-2">
          <Label>Patient Instructions</Label>
          <Textarea
            value={patientInstruction}
            onChange={(event) => setPatientInstruction(event.target.value)}
            placeholder="Enter pre-surgery instructions..."
            disabled={disabled || createMutation.isPending}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={
              disabled ||
              createMutation.isPending ||
              !procedureId ||
              procedures.length === 0
            }
          >
            {createMutation.isPending
              ? "Creating Order..."
              : "Create Surgery Order"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
