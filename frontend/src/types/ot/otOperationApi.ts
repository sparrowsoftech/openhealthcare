import { HttpMethod, Type } from "@/Utils/request/types";

export type OTOperationStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface OTOperationRecord {
  id: string;
  schedule_id: string;
  service_request_id: string;
  patient_id: string;
  patient_name: string;
  age: number | null;
  gender: string | null;
  surgery_procedure: string;
  ot_room: string;
  scheduled_start: string;
  scheduled_end: string;
  status: OTOperationStatus;
  actual_start: string | null;
  actual_end: string | null;
  team_attendance: string[];
  intraoperative_notes: string;
  incident_report: string;
  procedure_details: string;
  operative_findings: string;
  surgeon_name: string;
  complications: string;
  operation_outcome: string;
  additional_remarks: string;
  anaesthesia: string;
  preoperative_medication: string;
  incision: string;
  surgery_notes: string;
  pathology: string;
  closure: string;
  drainage_tube: string;
  ryles_tube: string;
  biopsy: string;
  postoperative_advice: string;
}

export interface OTOperationInput {
  schedule_id: string;
  status: OTOperationStatus;
  team_attendance: string[];
  intraoperative_notes: string;
  incident_report: string;
  procedure_details: string;
  operative_findings: string;
  surgeon_name: string;
  complications: string;
  operation_outcome: string;
  additional_remarks: string;
  anaesthesia: string;
  preoperative_medication: string;
  incision: string;
  surgery_notes: string;
  pathology: string;
  closure: string;
  drainage_tube: string;
  ryles_tube: string;
  biopsy: string;
  postoperative_advice: string;
}

const otOperationApi = {
  list: {
    path: "/api/v1/facility/{facilityId}/ot_operation/",
    method: HttpMethod.GET,
    TRes: Type<{
      count: number;
      results: OTOperationRecord[];
    }>(),
  },

  save: {
    path: "/api/v1/facility/{facilityId}/ot_operation/",
    method: HttpMethod.POST,
    TRes: Type<{
      message: string;
      operation: OTOperationRecord;
    }>(),
    TBody: Type<OTOperationInput>(),
  },
} as const;

export default otOperationApi;
