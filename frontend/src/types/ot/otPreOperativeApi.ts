import { HttpMethod, Type } from "@/Utils/request/types";

export type OTConsentStatus = "pending" | "obtained" | "declined";

export type OTAnaesthesiaStatus = "pending" | "assessed" | "needs_review";

export type OTFitnessStatus =
  | "pending"
  | "fit"
  | "unfit"
  | "further_evaluation";

export interface OTPreOperativeAnaesthesiaConfig {
  id: string;
  anaesthesia_format: string;
  age_range: string;
  gender: string;
  weight: number | string | null;
  condition: string;
  dose: string;
}

export interface OTPreOperativeAssessment {
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
  anaesthesia_config_id: string | null;
  anaesthesia_config: OTPreOperativeAnaesthesiaConfig | null;

  patient_identity_verified: boolean;
  procedure_verified: boolean;
  surgical_site_verified: boolean;

  investigations_reviewed: boolean;
  investigation_remarks: string;

  consent_status: OTConsentStatus;
  consent_remarks: string;

  vitals: Record<string, string | number>;
  day_before_surgery: Record<string, string | boolean>;
  day_of_surgery: Record<string, string | boolean>;
  allergies: string;
  clinical_remarks: string;

  anaesthesia_status: OTAnaesthesiaStatus;
  anaesthesia_remarks: string;

  fitness_status: OTFitnessStatus;
  final_remarks: string;
}

export interface OTPreOperativeAssessmentInput {
  schedule_id: string;
  anaesthesia_config_id: string | null;

  patient_identity_verified: boolean;
  procedure_verified: boolean;
  surgical_site_verified: boolean;

  investigations_reviewed: boolean;
  investigation_remarks: string;

  consent_status: OTConsentStatus;
  consent_remarks: string;

  vitals: Record<string, string | number>;
  day_before_surgery: Record<string, string | boolean>;
  day_of_surgery: Record<string, string | boolean>;
  allergies: string;
  clinical_remarks: string;

  anaesthesia_status: OTAnaesthesiaStatus;
  anaesthesia_remarks: string;

  fitness_status: OTFitnessStatus;
  final_remarks: string;
}

const otPreOperativeApi = {
  list: {
    path: "/api/v1/facility/{facilityId}/ot_preoperative/",
    method: HttpMethod.GET,
    TRes: Type<{
      count: number;
      results: OTPreOperativeAssessment[];
    }>(),
  },

  save: {
    path: "/api/v1/facility/{facilityId}/ot_preoperative/",
    method: HttpMethod.POST,
    TRes: Type<{
      message: string;
      assessment: OTPreOperativeAssessment;
    }>(),
    TBody: Type<OTPreOperativeAssessmentInput>(),
  },
} as const;

export default otPreOperativeApi;
