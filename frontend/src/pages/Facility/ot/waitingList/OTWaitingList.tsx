import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardList,
  Search,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { navigate } from "raviger";
import { useMemo, useState } from "react";

import Loading from "@/components/Common/Loading";
import Page from "@/components/Common/Page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import otWaitingListApi from "@/types/ot/otWaitingListApi";
import query from "@/Utils/request/query";

interface Props {
  facilityId: string;
}

export default function OTWaitingList({ facilityId }: Props) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ot-waiting-list", facilityId],
    queryFn: query(otWaitingListApi.list, {
      pathParams: { facilityId },
    }),
  });

  const records = data?.results ?? [];

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((order) => {
      const matchesSearch =
        !term ||
        order.patient_name?.toLowerCase().includes(term) ||
        order.patient_id?.toLowerCase().includes(term) ||
        order.registration_id?.toLowerCase().includes(term) ||
        order.surgery_procedure?.toLowerCase().includes(term) ||
        order.doctor_name?.toLowerCase().includes(term);

      const matchesPriority =
        priorityFilter === "all" ||
        order.priority?.toLowerCase() === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [records, search, priorityFilter]);

  if (isLoading) return <Loading />;

  if (isError) {
    return (
      <Page title="OT Waiting List">
        <p className="p-4 text-red-600">
          Unable to load OT Waiting List. Please refresh.
        </p>
      </Page>
    );
  }

  return (
    <Page title="OT Waiting List">
      <div className="min-h-full space-y-6 bg-slate-50 p-4 md:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-medium text-slate-500">
              Operation Theatre / Patients
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              OT Waiting List
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review surgery orders and schedule patients for the operation
              theatre.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">
                Pending surgery orders
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {data?.count ?? 0}
              </p>
            </div>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search patient, ID, surgery or doctor..."
                  className="h-11 border-slate-200 bg-white pl-9"
                />
              </div>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter by priority"
              >
                <option value="all">All priorities</option>
                {[
                  ...new Set(
                    records.map((order) => order.priority).filter(Boolean),
                  ),
                ]
                  .sort()
                  .map((priority) => (
                    <option key={priority} value={priority.toLowerCase()}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-600">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {filteredRecords.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {data?.count ?? 0}
                </span>{" "}
                surgery orders
              </p>
              {(search || priorityFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setPriorityFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {filteredRecords.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-white shadow-sm">
            <CardContent className="flex flex-col items-center px-4 py-14 text-center">
              <div className="rounded-full bg-slate-100 p-4 text-slate-500">
                <ClipboardList className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                {records.length === 0
                  ? "No surgery orders are waiting"
                  : "No matching patients found"}
              </h2>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                {records.length === 0
                  ? "Patients will appear here when surgery orders are ready for OT scheduling."
                  : "Try another search term or clear the selected filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRecords.map((order) => {
              const priority = (order.priority || "normal").toLowerCase();
              const urgent = ["urgent", "high", "emergency"].includes(priority);

              return (
                <Card
                  key={order.id}
                  className="overflow-hidden border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-0">
                    <div className="flex h-full min-h-[320px] flex-col gap-4 p-4 md:p-5">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-700">
                          {(order.patient_name || "P")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-slate-900">
                              {order.patient_name || "Unnamed patient"}
                            </h2>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                                urgent
                                  ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200"
                                  : "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"
                              }`}
                            >
                              {order.priority || "Normal"} priority
                            </span>
                          </div>

                          <p className="mt-1 break-all text-xs text-slate-500">
                            Patient ID:{" "}
                            {order.registration_id || order.patient_id || "—"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <UserRound className="h-4 w-4 text-slate-400" />
                              {order.age ?? "—"} years / {order.gender || "—"}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Stethoscope className="h-4 w-4 text-slate-400" />
                              {order.doctor_name || "Doctor not assigned"}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-4 w-4 text-slate-400" />
                              {order.order_date
                                ? new Date(order.order_date).toLocaleString()
                                : "Date not available"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Requested surgery
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {order.surgery_procedure || "Procedure not specified"}
                        </p>
                        {order.procedure_code && (
                          <p className="mt-1 text-xs text-slate-500">
                            Code: {order.procedure_code}
                          </p>
                        )}
                        <p className="mt-2 text-xs font-medium text-amber-700">
                          Awaiting OT scheduling
                        </p>
                      </div>

                      <div className="flex w-full flex-col gap-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            navigate(
                              `/facility/${facilityId}/ot/patient/${encodeURIComponent(order.patient_id)}?service_request_id=${encodeURIComponent(order.service_request_id)}`,
                            )
                          }
                        >
                          View Patient
                        </Button>
                        <Button
                          className="w-full"
                          onClick={() =>
                            navigate(
                              `/facility/${facilityId}/ot/scheduling/new?service_request_id=${encodeURIComponent(order.service_request_id)}`,
                            )
                          }
                        >
                          Schedule Surgery
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Page>
  );
}
