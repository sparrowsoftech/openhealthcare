import { HttpMethod, PaginatedResponse, Type } from "@/Utils/request/types";

export type DayOfSurgeryCheckListStatus = "active" | "inactive";

export interface DayOfSurgeryCheckList {
  id: number;
  checklist_name: string;
  sequence: number;
  status: DayOfSurgeryCheckListStatus;
  created_date?: string;
  modified_date?: string;
}

export interface DayOfSurgeryCheckListWrite {
  checklist_name: string;
  sequence: number;
  status: DayOfSurgeryCheckListStatus;
}

const dayOfSurgeryCheckListApi = {
  list: {
    path: "/api/v1/day_of_surgery_checklist/",
    method: HttpMethod.GET,
    TRes: Type<PaginatedResponse<DayOfSurgeryCheckList>>(),
  },
  create: {
    path: "/api/v1/day_of_surgery_checklist/",
    method: HttpMethod.POST,
    TRes: Type<DayOfSurgeryCheckList>(),
    TBody: Type<DayOfSurgeryCheckListWrite>(),
  },
  get: {
    path: "/api/v1/day_of_surgery_checklist/{id}/",
    method: HttpMethod.GET,
    TRes: Type<DayOfSurgeryCheckList>(),
  },
  update: {
    path: "/api/v1/day_of_surgery_checklist/{id}/",
    method: HttpMethod.PUT,
    TRes: Type<DayOfSurgeryCheckList>(),
    TBody: Type<DayOfSurgeryCheckListWrite>(),
  },
  delete: {
    path: "/api/v1/day_of_surgery_checklist/{id}/",
    method: HttpMethod.DELETE,
    TRes: Type<void>(),
    TBody: Type<void>(),
  },
} as const;

export default dayOfSurgeryCheckListApi;
