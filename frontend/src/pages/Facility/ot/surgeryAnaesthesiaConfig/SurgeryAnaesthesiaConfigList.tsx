import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { navigate } from "raviger";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import surgeryAnaesthesiaConfigApi from "@/types/ot/surgeryAnaesthesiaConfigApi";
import mutate from "@/Utils/request/mutate";
import query from "@/Utils/request/query";

interface Props {
  facilityId: string;
}

export default function SurgeryAnaesthesiaConfigList({ facilityId }: Props) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["surgery-anaesthesia-config", facilityId],
    queryFn: query(surgeryAnaesthesiaConfigApi.list, {
      pathParams: { facilityId },
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      mutate(surgeryAnaesthesiaConfigApi.delete, {
        pathParams: { facilityId, id },
      })(undefined),
    onSuccess: () => {
      toast.success("Configuration deleted");
      queryClient.invalidateQueries({
        queryKey: ["surgery-anaesthesia-config", facilityId],
      });
    },
    onError: () => toast.error("Could not delete configuration"),
  });

  const records = Array.isArray(data) ? data : (data?.results ?? []);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Surgery–Anaesthesia Configuration
        </h1>
        <Button
          onClick={() =>
            navigate(
              `/facility/${facilityId}/ot/surgery-anaesthesia-config/new`,
            )
          }
        >
          Add Configuration
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured surgery and anaesthesia formats</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading configurations...</p>
          ) : error ? (
            <p className="text-destructive">
              Failed to load configurations. Please refresh and try again.
            </p>
          ) : records.length === 0 ? (
            <p>
              No configurations found. Click “Add Configuration” to create one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Surgery</th>
                    <th className="p-2">Anaesthesia Format</th>
                    <th className="p-2">Age Range</th>
                    <th className="p-2">Gender</th>
                    <th className="p-2">Weight</th>
                    <th className="p-2">Condition</th>
                    <th className="p-2">Dose</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b">
                      <td className="p-2">
                        {record.surgery_procedure_name ||
                          record.surgery_procedure}
                      </td>
                      <td className="p-2">{record.anaesthesia_format}</td>
                      <td className="p-2">{record.age_range || "—"}</td>
                      <td className="p-2">{record.gender || "—"}</td>
                      <td className="p-2">{record.weight ?? "—"}</td>
                      <td className="p-2">{record.condition || "—"}</td>
                      <td className="p-2">{record.dose || "—"}</td>
                      <td className="p-2">{record.status}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/facility/${facilityId}/ot/surgery-anaesthesia-config/${record.id}/edit`,
                              )
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm("Delete this configuration?")
                              ) {
                                deleteMutation.mutate(record.id);
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
  );
}
