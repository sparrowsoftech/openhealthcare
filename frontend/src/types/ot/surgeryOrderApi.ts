import { HttpMethod, Type } from "@/Utils/request/types";

export type SurgeryOrderPriority = "routine" | "urgent" | "asap" | "stat";

export interface SurgeryOrderCreate {
  surgery_procedure: string;
  encounter: string;
  priority: SurgeryOrderPriority;
  note: string | null;
  patient_instruction: string | null;
}

export interface SurgeryOrderResponse {
  message: string;
  id: string;
  patient_id: string;
  encounter_id: string;
  surgery_procedure_id: string;
  surgery_procedure: string;
  procedure_code: string;
  priority: SurgeryOrderPriority;
  status: string;
  order_date: string | null;
}

const surgeryOrderApi = {
  create: {
    path: "/api/v1/facility/{facilityId}/surgery_order/",
    method: HttpMethod.POST,
    TRes: Type<SurgeryOrderResponse>(),
    TBody: Type<SurgeryOrderCreate>(),
  },
} as const;

export default surgeryOrderApi;
