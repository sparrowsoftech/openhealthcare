import { HttpMethod, Type } from "@/Utils/request/types";

export type OTRecoveryStatus =
  | "recovering"
  | "stable"
  | "needs_attention"
  | "transferred";

export interface OTPostOperativeRecord {
  id: string;
  schedule_id: string;
  assessed_at: string | null;
  recovery_status: OTRecoveryStatus;
  consciousness_level: string;
  vitals: Record<string, string | number>;
  pain_score: number | null;
  oxygen_support: string;
  recovery_notes: string;
  doctor_instructions: string;
  recorded_by: string;
  created_date: string | null;
}

export interface OTPostOperativeInput {
  schedule_id: string;
  recovery_status: OTRecoveryStatus;
  consciousness_level: string;
  vitals: Record<string, string | number>;
  pain_score: number | null;
  oxygen_support: string;
  recovery_notes: string;
  doctor_instructions: string;
  recorded_by: string;
}

const otPostOperativeApi = {
  list: {
    path: "/api/v1/facility/{facilityId}/ot_postoperative/",
    method: HttpMethod.GET,
    TRes: Type<{
      count: number;
      results: OTPostOperativeRecord[];
    }>(),
  },
  save: {
    path: "/api/v1/facility/{facilityId}/ot_postoperative/",
    method: HttpMethod.POST,
    TRes: Type<{
      message: string;
      record: OTPostOperativeRecord;
    }>(),
    TBody: Type<OTPostOperativeInput>(),
  },
} as const;

export default otPostOperativeApi;
