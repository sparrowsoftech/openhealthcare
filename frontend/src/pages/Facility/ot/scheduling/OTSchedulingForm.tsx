import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { navigate } from "raviger";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import UserSelector from "@/components/Common/UserSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";

import otApi from "@/types/ot/otApi";
import otSchedulingApi from "@/types/ot/otSchedulingApi";
import otWaitingListApi from "@/types/ot/otWaitingListApi";
import surgeryAnaesthesiaConfigApi from "@/types/ot/surgeryAnaesthesiaConfigApi";
import type { UserReadMinimal } from "@/types/user/user";

interface Props {
  facilityId: string;
}

export default function OTSchedulingForm({ facilityId }: Props) {
  const queryClient = useQueryClient();

  const params = new URLSearchParams(window.location.search);
  const initialOrderId = params.get("service_request_id") || "";

  const [serviceRequestId, setServiceRequestId] = useState(initialOrderId);
  const [roomId, setRoomId] = useState("");
  const [anaesthesiaConfigId, setAnaesthesiaConfigId] = useState("");
  const [surgeon, setSurgeon] = useState<UserReadMinimal | undefined>();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  const ordersQuery = useQuery({
    queryKey: ["ot-waiting-list", facilityId],
    queryFn: query(otWaitingListApi.list, {
      pathParams: { facilityId },
    }),
  });

  const roomsQuery = useQuery({
    queryKey: ["ot-rooms", facilityId],
    queryFn: query(otApi.list, {
      pathParams: { facilityId },
    }),
  });

  const configsQuery = useQuery({
    queryKey: ["surgery-anaesthesia-config", facilityId],
    queryFn: query(surgeryAnaesthesiaConfigApi.list, {
      pathParams: { facilityId },
    }),
  });

  const orders = ordersQuery.data?.results ?? [];
  const rooms = (roomsQuery.data?.results ?? []).filter(
    (room) => room.status === "available",
  );
  const configs = (configsQuery.data?.results ?? []).filter(
    (config) => config.status === "active",
  );

  const selectedOrder = orders.find(
    (order) => order.service_request_id === serviceRequestId,
  );

  const matchingConfigs = useMemo(
    () =>
      configs.filter(
        (config) =>
          config.surgery_procedure === selectedOrder?.surgery_procedure ||
          config.surgery_procedure_name === selectedOrder?.surgery_procedure,
      ),
    [configs, selectedOrder],
  );

  const createMutation = useMutation({
    mutationFn: () =>
      mutate(otSchedulingApi.create, {
        pathParams: { facilityId },
      })({
        service_request_id: serviceRequestId,
        ot_room_id: roomId,
        ...(anaesthesiaConfigId
          ? { anaesthesia_config_id: anaesthesiaConfigId }
          : {}),
        ...(surgeon ? { surgeon_id: surgeon.id } : {}),
        scheduled_start: new Date(start).toISOString(),
        scheduled_end: new Date(end).toISOString(),
        notes,
      }),
    onSuccess: () => {
      toast.success("Surgery scheduled successfully.");
      queryClient.invalidateQueries({
        queryKey: ["ot-schedules", facilityId],
      });
      queryClient.invalidateQueries({
        queryKey: ["ot-waiting-list", facilityId],
      });
      if (selectedOrder?.patient_id) {
        navigate(
          `/facility/${facilityId}/ot/patient/${encodeURIComponent(selectedOrder.patient_id)}?service_request_id=${encodeURIComponent(serviceRequestId)}`,
        );
      } else {
        navigate(`/facility/${facilityId}/ot/waiting-list`);
      }
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to schedule surgery.";
      toast.error(message);
    },
  });

  const loading =
    ordersQuery.isLoading || roomsQuery.isLoading || configsQuery.isLoading;

  const hasError =
    ordersQuery.isError || roomsQuery.isError || configsQuery.isError;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!serviceRequestId || !roomId || !start || !end) {
      toast.error(
        "Please select Surgery Order, OT Room, start time and end time.",
      );
      return;
    }

    if (new Date(end).getTime() <= new Date(start).getTime()) {
      toast.error("End time must be later than start time.");
      return;
    }

    createMutation.mutate();
  }

  if (loading) {
    return <div className="p-6">Loading OT scheduling details...</div>;
  }

  if (hasError) {
    return (
      <div className="p-6 text-destructive">
        Unable to load scheduling details. Please refresh and try again.
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Schedule Surgery</h1>
        <p className="mt-1 text-sm text-gray-500">
          Select an existing surgery order and assign an OT room and schedule.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Surgery Scheduling Details</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Surgery Order *</Label>
              <select
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={serviceRequestId}
                onChange={(event) => {
                  setServiceRequestId(event.target.value);
                  setAnaesthesiaConfigId("");
                }}
                required
              >
                <option value="">Select Surgery Order</option>
                {orders.map((order) => (
                  <option
                    key={order.service_request_id}
                    value={order.service_request_id}
                  >
                    {order.patient_name} — {order.surgery_procedure}
                    {order.procedure_code ? ` (${order.procedure_code})` : ""}
                  </option>
                ))}
              </select>
              {orders.length === 0 && (
                <p className="text-sm text-amber-600">
                  No pending surgery orders found in the OT Waiting List.
                </p>
              )}
            </div>

            {selectedOrder && (
              <div className="rounded-md border bg-muted/30 p-4">
                <h3 className="mb-3 font-medium">Patient & Surgery Details</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">Patient</p>
                    <p className="font-medium">{selectedOrder.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Age / Gender</p>
                    <p>
                      {selectedOrder.age ?? "—"} / {selectedOrder.gender || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Surgery</p>
                    <p>{selectedOrder.surgery_procedure}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ordering Doctor</p>
                    <p>{selectedOrder.doctor_name || "—"}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>OT Room *</Label>
              <select
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
                required
              >
                <option value="">Select Available OT Room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.location_name || room.description || room.id}
                  </option>
                ))}
              </select>
              {rooms.length === 0 && (
                <p className="text-sm text-amber-600">
                  No available OT rooms found. Check OT Setup.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Anaesthesia Configuration</Label>
              <select
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={anaesthesiaConfigId}
                onChange={(event) => setAnaesthesiaConfigId(event.target.value)}
                disabled={!selectedOrder}
              >
                <option value="">
                  Select Anaesthesia Configuration (Optional)
                </option>
                {matchingConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.anaesthesia_format}
                    {config.dose ? ` — ${config.dose}` : ""}
                  </option>
                ))}
              </select>
              {selectedOrder && matchingConfigs.length === 0 && (
                <p className="text-xs text-gray-500">
                  No active anaesthesia configuration found for this surgery.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Surgeon</Label>
              <UserSelector
                facilityId={facilityId}
                selected={surgeon}
                onChange={setSurgeon}
                placeholder="Select Surgeon (Optional)"
                onClear={() => setSurgeon(undefined)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Scheduled Start *</Label>
                <Input
                  type="datetime-local"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Scheduled End *</Label>
                <Input
                  type="datetime-local"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="min-h-20 w-full rounded-md border bg-background p-3 text-sm"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Pre-operative instructions or scheduling notes"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? "Scheduling..."
                  : "Confirm Schedule"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate(`/facility/${facilityId}/ot/scheduling`)
                }
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
