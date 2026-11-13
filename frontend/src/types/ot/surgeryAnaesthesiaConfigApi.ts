import { HttpMethod, PaginatedResponse, Type } from "@/Utils/request/types";

export type ConfigStatus = "active" | "inactive";

export interface SurgeryAnaesthesiaConfig {
  id: string;
  surgery_procedure: string;
  surgery_procedure_name: string;
  anaesthesia_format: string;
  age_range: string;
  gender: string;
  weight: number | string | null;
  condition: string;
  dose: string;
  status: ConfigStatus;
  facility?: { id: string; name: string };
}

export interface SurgeryAnaesthesiaConfigWrite {
  id?: string;
  surgery_procedure: string;
  anaesthesia_format: string;
  age_range: string;
  gender: string;
  weight: number | null;
  condition: string;
  dose: string;
  status: ConfigStatus;
}

const surgeryAnaesthesiaConfigApi = {
  list: {
    path: "/api/v1/facility/{facilityId}/surgery_anaesthesia_config/",
    method: HttpMethod.GET,
    TRes: Type<PaginatedResponse<SurgeryAnaesthesiaConfig>>(),
  },
  get: {
    path: "/api/v1/facility/{facilityId}/surgery_anaesthesia_config/{id}/",
    method: HttpMethod.GET,
    TRes: Type<SurgeryAnaesthesiaConfig>(),
  },
  upsert: {
    path: "/api/v1/facility/{facilityId}/surgery_anaesthesia_config/upsert/",
    method: HttpMethod.POST,
    TRes: Type<SurgeryAnaesthesiaConfig[]>(),
    TBody: Type<{ datapoints: SurgeryAnaesthesiaConfigWrite[] }>(),
  },
  delete: {
    path: "/api/v1/facility/{facilityId}/surgery_anaesthesia_config/{id}/",
    method: HttpMethod.DELETE,
    TRes: Type<void>(),
    TBody: Type<void>(),
  },
} as const;

export default surgeryAnaesthesiaConfigApi;
