import { HttpMethod, PaginatedResponse, Type } from "@/Utils/request/types";

export type SurgeryCheckListStatus = "active" | "inactive";

export interface SurgeryCheckList {
  id: number;
  checklist_name: string;
  sequence: number;
  status: SurgeryCheckListStatus;
  created_date?: string;
  modified_date?: string;
}

export interface SurgeryCheckListWrite {
  checklist_name: string;
  sequence: number;
  status: SurgeryCheckListStatus;
}

const surgeryCheckListApi = {
  list: {
    path: "/api/v1/surgery_checklist/",
    method: HttpMethod.GET,
    TRes: Type<PaginatedResponse<SurgeryCheckList>>(),
  },
  create: {
    path: "/api/v1/surgery_checklist/",
    method: HttpMethod.POST,
    TRes: Type<SurgeryCheckList>(),
    TBody: Type<SurgeryCheckListWrite>(),
  },
  get: {
    path: "/api/v1/surgery_checklist/{id}/",
    method: HttpMethod.GET,
    TRes: Type<SurgeryCheckList>(),
  },
  update: {
    path: "/api/v1/surgery_checklist/{id}/",
    method: HttpMethod.PUT,
    TRes: Type<SurgeryCheckList>(),
    TBody: Type<SurgeryCheckListWrite>(),
  },
  delete: {
    path: "/api/v1/surgery_checklist/{id}/",
    method: HttpMethod.DELETE,
    TRes: Type<void>(),
    TBody: Type<void>(),
  },
} as const;

export default surgeryCheckListApi;
