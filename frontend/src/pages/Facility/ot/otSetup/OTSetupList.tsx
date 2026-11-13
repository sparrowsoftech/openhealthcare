import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { navigate } from "raviger";
import { toast } from "sonner";

import Loading from "@/components/Common/Loading";
import Page from "@/components/Common/Page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";

import otApi, { OTRoomStatus } from "@/types/ot/otApi";
import surgeryProcedureApi from "@/types/ot/surgeryProcedureApi";

interface Props {
  facilityId: string;
}

const statusLabels: Record<OTRoomStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  maintenance: "Maintenance",
  inactive: "Inactive",
};

export default function OTSetupList({ facilityId }: Props) {
  const queryClient = useQueryClient();
  const roomsQueryKey = ["otRooms", facilityId];

  const {
    data: roomsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: roomsQueryKey,
    queryFn: query(otApi.list, {
      pathParams: { facilityId },
    }),
  });

  const proceduresQuery = useQuery({
    queryKey: ["surgery-procedures", facilityId],
    queryFn: query(surgeryProcedureApi.list, {
      pathParams: { facilityId },
    }),
  });

  const procedureNames = new Map(
    (proceduresQuery.data?.results ?? []).map((procedure) => [
      procedure.id,
      procedure.procedure_name,
    ]),
  );

  const deleteRoom = useMutation({
    mutationFn: (roomId: string) =>
      mutate(otApi.delete, {
        pathParams: { facilityId, roomId },
      })(),
    onSuccess: async () => {
      toast.success("OT Room deleted successfully");
      await queryClient.invalidateQueries({
        queryKey: roomsQueryKey,
      });
    },
    onError: () => {
      toast.error("Unable to delete OT Room.");
    },
  });

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return (
      <Page title="OT Setup">
        <div className="p-4 text-red-600">
          Unable to load OT Rooms. Please refresh the page or check your
          permissions.
        </div>
      </Page>
    );
  }

  const rooms = roomsData?.results ?? [];

  return (
    <Page title="OT Setup">
      <div className="space-y-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Operation Theatre Setup</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage configured operation theatre rooms.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => navigate(`/facility/${facilityId}/ot/setup/new`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add OT Setup
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configured OT Rooms ({rooms.length})</CardTitle>
          </CardHeader>

          <CardContent>
            {rooms.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <p>No OT rooms configured yet.</p>
                <p className="mt-1 text-sm">
                  Add an OT room using the existing Location Master.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-3">OT Room</th>
                      <th className="p-3">Surgery Procedures</th>
                      <th className="p-3">Equipment</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rooms.map((room) => (
                      <tr key={room.id} className="border-b">
                        <td className="p-3 font-medium">
                          <div>{room.location_name || "OT Room"}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            OT Room ID: {room.id}
                          </div>
                        </td>

                        <td className="p-3">
                          {room.surgery_procedures?.length ? (
                            <div className="flex max-w-sm flex-wrap gap-1">
                              {room.surgery_procedures.map((procedureId) => (
                                <span
                                  key={procedureId}
                                  className="rounded-full border px-2 py-1 text-xs"
                                >
                                  {procedureNames.get(procedureId) ??
                                    "Procedure"}
                                </span>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="p-3">
                          {room.equipment_details?.join(", ") || "—"}
                        </td>

                        <td className="p-3">
                          <span className="rounded-full border px-2 py-1">
                            {statusLabels[room.status] ?? room.status}
                          </span>
                        </td>

                        <td className="p-3">{room.description || "—"}</td>

                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/facility/${facilityId}/ot/setup/${room.id}/edit`,
                                )
                              }
                            >
                              <Pencil className="mr-1 h-4 w-4" />
                              Edit
                            </Button>

                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={deleteRoom.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete OT Setup for ${room.location_name}?`,
                                  )
                                ) {
                                  deleteRoom.mutate(room.id);
                                }
                              }}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
