import { HttpMethod, Type } from "@/Utils/request/types";

export type OTScheduleStatus = "scheduled" | "completed" | "cancelled";

export interface OTSchedule {
  id: string;
  service_request_id: string;
  patient_id: string;
  patient_name: string;
  age: number | null;
  gender: string | null;
  surgery_procedure: string;
  procedure_code: string | null;
  ot_room_id: string;
  ot_room: string;
  anaesthesia_config_id: string | null;
  anaesthesia: string | null;
  surgeon_id: string | null;
  surgeon_name: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: OTScheduleStatus;
  notes: string;
}

export interface OTScheduleCreate {
  service_request_id: string;
  ot_room_id: string;
  anaesthesia_config_id?: string;
  surgeon_id?: string;
  scheduled_start: string;
  scheduled_end: string;
  notes?: string;
}

const otSchedulingApi = {
  list: {
    path: "/api/v1/facility/{facilityId}/ot_schedule/",
    method: HttpMethod.GET,
    TRes: Type<{ count: number; results: OTSchedule[] }>(),
  },

  create: {
    path: "/api/v1/facility/{facilityId}/ot_schedule/",
    method: HttpMethod.POST,
    TRes: Type<{
      message: string;
      schedule: OTSchedule;
    }>(),
    TBody: Type<OTScheduleCreate>(),
  },
} as const;

export default otSchedulingApi;
