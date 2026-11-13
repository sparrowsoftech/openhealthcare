import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import Loading from "@/components/Common/Loading";
import Page from "@/components/Common/Page";
import { LocationSearch } from "@/components/Location/LocationSearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";

import otApi, { OTRoom, OTRoomStatus, OTRoomWrite } from "@/types/ot/otApi";

import { LocationRead } from "@/types/location/location";

interface Props {
  facilityId: string;
}

const initialForm: OTRoomWrite = {
  location: "",
  description: "",
  equipment_details: [],
  status: "available",
  surgery_procedures: [],
};

const statusLabels: Record<OTRoomStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  maintenance: "Maintenance",
  inactive: "Inactive",
};

export default function OTSetup({ facilityId }: Props) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<OTRoomWrite>(initialForm);
  const [selectedLocation, setSelectedLocation] = useState<LocationRead | null>(
    null,
  );
  const [equipmentText, setEquipmentText] = useState("");
  const [editingRoom, setEditingRoom] = useState<string | null>(null);

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

  const refreshRooms = async () => {
    await queryClient.invalidateQueries({
      queryKey: roomsQueryKey,
    });
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedLocation(null);
    setEquipmentText("");
    setEditingRoom(null);
  };

  const createRoom = useMutation({
    mutationFn: mutate(otApi.create, {
      pathParams: { facilityId },
    }),
    onSuccess: async () => {
      toast.success("OT Room created successfully");
      resetForm();
      await refreshRooms();
    },
    onError: () => {
      toast.error("Unable to create OT Room. Please check the details.");
    },
  });

  const updateRoom = useMutation({
    mutationFn: ({ roomId, data }: { roomId: string; data: OTRoomWrite }) =>
      mutate(otApi.update, {
        pathParams: { facilityId, roomId },
      })(data),
    onSuccess: async () => {
      toast.success("OT Room updated successfully");
      resetForm();
      await refreshRooms();
    },
    onError: () => {
      toast.error("Unable to update OT Room.");
    },
  });

  const deleteRoom = useMutation({
    mutationFn: (roomId: string) =>
      mutate(otApi.delete, {
        pathParams: { facilityId, roomId },
      })(),
    onSuccess: async () => {
      toast.success("OT Room deleted successfully");

      if (editingRoom) {
        resetForm();
      }

      await refreshRooms();
    },
    onError: () => {
      toast.error("Unable to delete OT Room.");
    },
  });

  const handleEdit = (room: OTRoom) => {
    setEditingRoom(room.id);

    /*
     * OT Room API supplies the selected Location Master UUID and name.
     * Construct a LocationRead-shaped value for the search component.
     */
    const location = {
      id: room.location,
      name: room.location_name,
      form: "ro",
      mode: "instance",
      status: "active",
    } as LocationRead;

    setSelectedLocation(location);

    setForm({
      location: room.location,
      description: room.description ?? "",
      equipment_details: room.equipment_details ?? [],
      status: room.status,
      surgery_procedures: room.surgery_procedures ?? [],
    });

    setEquipmentText((room.equipment_details ?? []).join(", "));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCancel = () => {
    resetForm();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedLocation || !form.location) {
      toast.error("Please select an OT room from Location Master.");
      return;
    }

    const payload: OTRoomWrite = {
      location: form.location,
      description: form.description.trim(),
      equipment_details: equipmentText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      status: form.status,
      surgery_procedures: form.surgery_procedures ?? [],
    };

    if (editingRoom) {
      updateRoom.mutate({
        roomId: editingRoom,
        data: payload,
      });
    } else {
      createRoom.mutate(payload);
    }
  };

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
  const isSaving = createRoom.isPending || updateRoom.isPending;

  return (
    <Page title="OT Setup">
      <div className="space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Operation Theatre Setup</h1>

          <p className="mt-1 text-sm text-gray-500">
            Configure operation theatre rooms using the existing Location
            Master.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {editingRoom ? "Edit OT Setup" : "Add OT Setup"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  OT Room from Location Master *
                </label>

                <LocationSearch
                  facilityId={facilityId}
                  mode="instance"
                  form="ro"
                  value={selectedLocation}
                  disabled={Boolean(editingRoom)}
                  onSelect={(location) => {
                    setSelectedLocation(location);

                    setForm((previous) => ({
                      ...previous,
                      location: location.id,
                    }));
                  }}
                />

                <p className="mt-1 text-xs text-gray-500">
                  Select an existing room configured in Location Master.
                </p>

                {editingRoom && (
                  <p className="mt-1 text-xs text-gray-500">
                    Room selection is locked while editing this setup.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="ot-room-status"
                    className="mb-1 block text-sm font-medium"
                  >
                    Status
                  </label>

                  <select
                    id="ot-room-status"
                    className="w-full rounded-md border p-2"
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value as OTRoomStatus,
                      })
                    }
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ot-room-equipment"
                    className="mb-1 block text-sm font-medium"
                  >
                    Equipment Details
                  </label>

                  <input
                    id="ot-room-equipment"
                    className="w-full rounded-md border p-2"
                    placeholder="OT Table, Monitor, Ventilator"
                    value={equipmentText}
                    onChange={(event) => setEquipmentText(event.target.value)}
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Separate equipment names with commas.
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="ot-room-description"
                  className="mb-1 block text-sm font-medium"
                >
                  Description
                </label>

                <textarea
                  id="ot-room-description"
                  className="min-h-24 w-full rounded-md border p-2"
                  placeholder="Enter OT room details"
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving
                    ? "Saving..."
                    : editingRoom
                      ? "Update OT Setup"
                      : "Save OT Setup"}
                </Button>

                {editingRoom && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configured OT Rooms ({rooms.length})</CardTitle>
          </CardHeader>

          <CardContent>
            {rooms.length === 0 ? (
              <p className="py-6 text-center text-gray-500">
                No OT rooms configured yet. Select a room from Location Master
                to get started.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-3">OT Room</th>
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
                          {room.location_name || "—"}
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
                              onClick={() => handleEdit(room)}
                            >
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
