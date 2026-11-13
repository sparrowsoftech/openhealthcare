import { HttpMethod, Type } from "@/Utils/request/types";

export interface OTMedicineUsage {
  id: string;
  schedule_id: string;
  item_name: string;
  dose: string;
  quantity: string;
  unit: string;
  batch_number: string;
  used_at: string | null;
  remarks: string;
  created_date: string | null;
}

export interface OTIncidentRecord {
  id: string;
  schedule_id: string;
  incident_type: string;
  occurred_at: string | null;
  description: string;
  immediate_action: string;
  reported_by: string;
  follow_up: string;
  created_date: string | null;
}

export interface OTMedicineUsageInput {
  record_type: "medicine";
  schedule_id: string;
  item_name: string;
  dose: string;
  quantity: number;
  unit: string;
  batch_number: string;
  used_at: string | null;
  remarks: string;
}

export interface OTIncidentInput {
  record_type: "incident";
  schedule_id: string;
  incident_type: string;
  occurred_at: string | null;
  description: string;
  immediate_action: string;
  reported_by: string;
  follow_up: string;
}

export type OTMedicinesIncidentsInput = OTMedicineUsageInput | OTIncidentInput;

const otMedicinesIncidentsApi = {
  list: {
    path: "/api/v1/facility/{facilityId}/ot_medicines_incidents/",
    method: HttpMethod.GET,
    TRes: Type<{
      medicines: {
        count: number;
        results: OTMedicineUsage[];
      };
      incidents: {
        count: number;
        results: OTIncidentRecord[];
      };
    }>(),
  },

  save: {
    path: "/api/v1/facility/{facilityId}/ot_medicines_incidents/",
    method: HttpMethod.POST,
    TRes: Type<{
      message: string;
      record_type: "medicine" | "incident";
      record: OTMedicineUsage | OTIncidentRecord;
    }>(),
    TBody: Type<OTMedicinesIncidentsInput>(),
  },
} as const;

export default otMedicinesIncidentsApi;
