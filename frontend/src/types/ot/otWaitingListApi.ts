import { HttpMethod, PaginatedResponse, Type } from "@/Utils/request/types";

export interface OTWaitingOrder {
  id: string;
  service_request_id: string;
  patient_id: string;
  registration_id: string | null;
  patient_name: string;
  age: number | null;
  gender: string | null;
  surgery_procedure: string;
  procedure_code: string | null;
  doctor_name: string;
  requester_id: string;
  order_date: string;
  priority: string;
  encounter_id: string;
}

const otWaitingListApi = {
  list: {
    path: "/api/v1/facility/{facilityId}/ot_waiting_list/",
    method: HttpMethod.GET,
    TRes: Type<PaginatedResponse<OTWaitingOrder>>(),
  },
} as const;

export default otWaitingListApi;
