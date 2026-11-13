import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { navigate } from "raviger";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import Loading from "@/components/Common/Loading";
import Page from "@/components/Common/Page";
import { LocationSearch } from "@/components/Location/LocationSearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";

import otApi, { OTRoomStatus, OTRoomWrite } from "@/types/ot/otApi";
import surgeryProcedureApi from "@/types/ot/surgeryProcedureApi";

import { LocationRead } from "@/types/location/location";

interface Props {
  facilityId: string;
  roomId?: string;
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

export default function OTSetupForm({ facilityId, roomId }: Props) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<OTRoomWrite>(initialForm);
  const [selectedLocation, setSelectedLocation] = useState<LocationRead | null>(
    null,
  );
  const [equipmentText, setEquipmentText] = useState("");
  const [proceduresDropdownOpen, setProceduresDropdownOpen] = useState(false);
  const [procedureSearch, setProcedureSearch] = useState("");

  const isEditing = Boolean(roomId);
  const roomsQueryKey = ["otRooms", facilityId];

  const roomQuery = useQuery({
    queryKey: ["otRoom", facilityId, roomId],
    queryFn: query(otApi.get, {
      pathParams: { facilityId, roomId: roomId ?? "" },
    }),
    enabled: isEditing,
  });

  const proceduresQuery = useQuery({
    queryKey: ["surgery-procedures", facilityId],
    queryFn: query.paginated(surgeryProcedureApi.list, {
      pathParams: { facilityId },
    }),
  });

  const activeProcedures = (proceduresQuery.data?.results ?? []).filter(
    (procedure) => procedure.status === "active",
  );

  useEffect(() => {
    const room = roomQuery.data;

    if (!room) {
      return;
    }

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
  }, [roomQuery.data]);

  const createRoom = useMutation({
    mutationFn: (data: OTRoomWrite) =>
      mutate(otApi.create, {
        pathParams: { facilityId },
      })(data),
    onSuccess: async () => {
      toast.success("OT Room created successfully");
      await queryClient.invalidateQueries({
        queryKey: roomsQueryKey,
      });
      navigate(`/facility/${facilityId}/ot/setup`);
    },
    onError: () => {
      toast.error("Unable to create OT Room. Please check the details.");
    },
  });

  const updateRoom = useMutation({
    mutationFn: (data: OTRoomWrite) =>
      mutate(otApi.update, {
        pathParams: { facilityId, roomId: roomId ?? "" },
      })(data),
    onSuccess: async () => {
      toast.success("OT Room updated successfully");
      await queryClient.invalidateQueries({
        queryKey: roomsQueryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: ["otRoom", facilityId, roomId],
      });
      navigate(`/facility/${facilityId}/ot/setup`);
    },
    onError: () => {
      toast.error("Unable to update OT Room.");
    },
  });

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
      surgery_procedures: form.surgery_procedures,
    };

    if (isEditing) {
      updateRoom.mutate(payload);
    } else {
      createRoom.mutate(payload);
    }
  };

  if (isEditing && roomQuery.isLoading) {
    return <Loading />;
  }

  if (isEditing && (roomQuery.isError || !roomQuery.data)) {
    return (
      <Page title="OT Setup">
        <div className="p-4 text-red-600">
          Unable to load this OT Room. Please return to the OT Setup list and
          try again.
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/facility/${facilityId}/ot/setup`)}
            >
              Back to OT Setup
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  const isSaving = createRoom.isPending || updateRoom.isPending;

  return (
    <Page title={isEditing ? "Edit OT Setup" : "Add OT Setup"}>
      <div className="space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {isEditing ? "Edit OT Setup" : "Add OT Setup"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure the OT room using the existing Location Master.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>OT Room Details</CardTitle>
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
                  disabled={isEditing}
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

                {isEditing && (
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

              <div className="space-y-3 rounded-md border p-4">
                <div>
                  <h3 className="text-sm font-semibold">Surgery / Procedure</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Select one procedure that can be performed in this OT room.
                  </p>
                </div>

                {proceduresQuery.isLoading ? (
                  <p className="text-sm text-gray-500">
                    Loading surgery procedures...
                  </p>
                ) : proceduresQuery.isError ? (
                  <p className="text-sm text-red-600">
                    Unable to load surgery procedures. Please refresh and try
                    again.
                  </p>
                ) : activeProcedures.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No active procedures found. Add active procedures in Surgery
                    / Procedure Master first.
                  </p>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setProcedureSearch("");
                        setProceduresDropdownOpen((open) => !open);
                      }}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 text-sm"
                      aria-expanded={proceduresDropdownOpen}
                    >
                      <span className="truncate text-left">
                        {activeProcedures.find(
                          (procedure) =>
                            procedure.id === form.surgery_procedures[0],
                        )?.procedure_name ?? "Select a procedure..."}
                      </span>
                      <span className="ml-2 text-gray-500">⌄</span>
                    </button>

                    {proceduresDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-md">
                        <input
                          type="text"
                          placeholder="Search procedures..."
                          value={procedureSearch}
                          onChange={(event) =>
                            setProcedureSearch(event.target.value)
                          }
                          className="w-full border-b px-3 py-2 text-sm outline-none"
                          autoFocus
                        />

                        <div className="max-h-60 overflow-y-auto py-1">
                          {activeProcedures
                            .filter((procedure) =>
                              `${procedure.procedure_name} ${procedure.procedure_code}`
                                .toLowerCase()
                                .includes(procedureSearch.toLowerCase()),
                            )
                            .map((procedure) => {
                              const selected =
                                form.surgery_procedures[0] === procedure.id;

                              return (
                                <button
                                  key={procedure.id}
                                  type="button"
                                  onClick={() => {
                                    setForm((previous) => ({
                                      ...previous,
                                      surgery_procedures: [procedure.id],
                                    }));
                                    setProcedureSearch("");
                                    setProceduresDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                                    selected ? "bg-gray-50 font-medium" : ""
                                  }`}
                                >
                                  {procedure.procedure_name} (
                                  {procedure.procedure_code})
                                  {selected && (
                                    <span className="float-right text-gray-500">
                                      ✓
                                    </span>
                                  )}
                                </button>
                              );
                            })}

                          {activeProcedures.filter((procedure) =>
                            `${procedure.procedure_name} ${procedure.procedure_code}`
                              .toLowerCase()
                              .includes(procedureSearch.toLowerCase()),
                          ).length === 0 && (
                            <p className="px-3 py-2 text-sm text-gray-500">
                              No procedures found.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                    : isEditing
                      ? "Update OT Setup"
                      : "Save OT Setup"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/facility/${facilityId}/ot/setup`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
