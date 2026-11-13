import Page from "@/components/Common/Page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import otPreOperativeApi, {
  type OTPreOperativeAssessment,
} from "@/types/ot/otPreOperativeApi";
import query from "@/Utils/request/query";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

interface Props {
  facilityId: string;
  scheduleId?: string;
  patientId?: string;
  serviceRequestId?: string;
  embedded?: boolean;
}

type FilterStatus = "all" | "pending" | "fit" | "unfit";

export default function OTPreOperativeList({
  facilityId,
  scheduleId: scheduleIdProp,
  patientId: patientIdProp,
  serviceRequestId: serviceRequestIdProp,
  embedded = false,
}: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");

  const urlParams = new URLSearchParams(window.location.search);
  const scheduleId =
    scheduleIdProp || urlParams.get("schedule_id") || undefined;
  const patientId = patientIdProp || urlParams.get("patient_id") || undefined;
  const serviceRequestId =
    serviceRequestIdProp || urlParams.get("service_request_id") || undefined;

  const dashboardParams = new URLSearchParams({ tab: "preop" });
  if (serviceRequestId) {
    dashboardParams.set("service_request_id", serviceRequestId);
  }
  const returnTo = patientId
    ? `/facility/${facilityId}/ot/patient/${patientId}?${dashboardParams.toString()}`
    : "";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ot-preoperative", facilityId],
    queryFn: query(otPreOperativeApi.list, {
      pathParams: { facilityId },
    }),
    enabled: !!facilityId,
  });

  const assessments = data?.results ?? [];

  const filteredAssessments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return assessments.filter((item: OTPreOperativeAssessment) => {
      const matchesSearch =
        !term ||
        item.patient_name?.toLowerCase().includes(term) ||
        item.surgery_procedure?.toLowerCase().includes(term) ||
        item.ot_room?.toLowerCase().includes(term);

      const matchesStatus =
        status === "all" ||
        (status === "pending" && item.fitness_status === "pending") ||
        (status === "fit" && item.fitness_status === "fit") ||
        (status === "unfit" && item.fitness_status === "unfit");

      return matchesSearch && matchesStatus;
    });
  }, [assessments, search, status]);

  const openNewForm = () => {
    if (!scheduleId) return;

    const params = new URLSearchParams({ schedule_id: scheduleId });

    if (patientId) params.set("patient_id", patientId);
    if (serviceRequestId) {
      params.set("service_request_id", serviceRequestId);
    }
    if (returnTo) {
      params.set("return_to", returnTo);
    }

    window.location.href = `/facility/${facilityId}/ot/pre-operative/new?${params.toString()}`;
  };

  const formatDate = (value?: string) => {
    if (!value) return "—";

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const content = (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Pre-Operative Assessments
              </h2>
              <p className="text-sm text-muted-foreground">
                Review patient preparation, consent, anaesthesia and fitness
                assessments before surgery.
              </p>
            </div>

            <Button
              onClick={openNewForm}
              disabled={!scheduleId}
              title={
                !scheduleId
                  ? "Open this page from a patient's OT dashboard with a scheduled surgery."
                  : "Create a pre-operative assessment"
              }
            >
              + New Pre-Operative
            </Button>
          </div>

          {!scheduleId && (
            <p className="text-sm text-muted-foreground">
              To create an assessment, open the patient's OT Dashboard, select a
              scheduled surgery, and then open Pre-Operative.
            </p>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient, surgery or OT room..."
              className="md:max-w-sm"
            />

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["pending", "Pending"],
                  ["fit", "Fit"],
                  ["unfit", "Unfit"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={status === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">
              Loading pre-operative assessments...
            </p>
          ) : isError ? (
            <div className="p-6 space-y-3">
              <p className="text-sm text-destructive">
                Unable to load pre-operative assessments.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="font-medium">No assessments found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No records match your search or selected filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-left">
                    <th className="p-3 font-medium">Patient</th>
                    <th className="p-3 font-medium">Surgery</th>
                    <th className="p-3 font-medium">OT Room</th>
                    <th className="p-3 font-medium">Scheduled Date</th>
                    <th className="p-3 font-medium">Consent</th>
                    <th className="p-3 font-medium">Anaesthesia</th>
                    <th className="p-3 font-medium">Fitness</th>
                    <th className="p-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssessments.map((item: OTPreOperativeAssessment) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="font-medium">
                          {item.patient_name || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.age ?? "—"} / {item.gender || "—"}
                        </div>
                      </td>
                      <td className="p-3">{item.surgery_procedure || "—"}</td>
                      <td className="p-3">{item.ot_room || "—"}</td>
                      <td className="p-3">
                        {formatDate(item.scheduled_start)}
                      </td>
                      <td className="p-3 capitalize">
                        {item.consent_status?.replaceAll("_", " ") || "—"}
                      </td>
                      <td className="p-3 capitalize">
                        {item.anaesthesia_status?.replaceAll("_", " ") || "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            item.fitness_status === "fit"
                              ? "bg-green-100 text-green-800"
                              : item.fitness_status === "unfit"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {item.fitness_status?.replaceAll("_", " ") ||
                            "Pending"}
                        </span>
                      </td>
                      <td className="p-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const params = new URLSearchParams({
                              schedule_id: item.schedule_id,
                            });

                            if (item.patient_id) {
                              params.set("patient_id", item.patient_id);
                            }

                            if (item.service_request_id) {
                              params.set(
                                "service_request_id",
                                item.service_request_id,
                              );
                            }

                            const dashboardParams = new URLSearchParams({
                              tab: "preop",
                            });
                            if (item.service_request_id) {
                              dashboardParams.set(
                                "service_request_id",
                                item.service_request_id,
                              );
                            }
                            params.set(
                              "return_to",
                              `/facility/${facilityId}/ot/patient/${item.patient_id}?${dashboardParams.toString()}`,
                            );

                            window.location.href = `/facility/${facilityId}/ot/pre-operative/new?${params.toString()}`;
                          }}
                        >
                          View / Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && !isError && (
            <div className="border-t p-3 text-sm text-muted-foreground">
              Showing {filteredAssessments.length} of {assessments.length}{" "}
              assessments
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return embedded ? (
    content
  ) : (
    <Page title="Pre-Operative Assessments">{content}</Page>
  );
}
