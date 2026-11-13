import { HttpMethod, Type } from "@/Utils/request/types";

export type OTTransferDestination =
  | "icu"
  | "inpatient_ward"
  | "recovery_room"
  | "other";

export type OTTransferStatus = "planned" | "transferred" | "cancelled";

export interface OTPatientTransferRecord {
  id: string;
  schedule_id: string;
  destination_type: OTTransferDestination;
  destination_name: string;
  transfer_status: OTTransferStatus;
  transfer_time: string | null;
  patient_condition: string;
  receiving_staff: string;
  handover_notes: string;
  recorded_by: string;
  created_date: string | null;
}

export interface OTPatientTransferInput {
  schedule_id: string;
  destination_type: OTTransferDestination;
  destination_name: string;
  transfer_status: OTTransferStatus;
  transfer_time: string | null;
  patient_condition: string;
  receiving_staff: string;
  handover_notes: string;
  recorded_by: string;
}

const otPatientTransferApi = {
  list: {
    path: "/api/v1/facility/{facilityId}/ot_patient_transfer/",
    method: HttpMethod.GET,
    TRes: Type<{
      count: number;
      results: OTPatientTransferRecord[];
    }>(),
  },
  save: {
    path: "/api/v1/facility/{facilityId}/ot_patient_transfer/",
    method: HttpMethod.POST,
    TRes: Type<{
      message: string;
      record: OTPatientTransferRecord;
    }>(),
    TBody: Type<OTPatientTransferInput>(),
  },
} as const;

export default otPatientTransferApi;
