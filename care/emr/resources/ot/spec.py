from decimal import Decimal
from enum import Enum

from pydantic import UUID4, Field

from care.emr.models.location import FacilityLocation
from care.emr.models.ot import (
    Anaesthesia,
    DayOfSurgeryCheckList,
    OTRoom,
    SurgeryAnaesthesiaConfig,
    SurgeryCheckList,
    SurgeryProcedure,
)
from care.emr.resources.base import EMRResource


class OTRoomStatusChoices(str, Enum):
    available = "available"
    occupied = "occupied"
    maintenance = "maintenance"
    inactive = "inactive"


class OTRoomBaseSpec(EMRResource):
    __model__ = OTRoom
    __exclude__ = ["facility"]

    id: UUID4 | None = None


class OTRoomSpec(OTRoomBaseSpec):
    location: UUID4
    description: str = ""
    equipment_details: list = Field(default_factory=list)
    status: OTRoomStatusChoices = OTRoomStatusChoices.available
    surgery_procedures: list[UUID4] | None = None

    def perform_extra_deserialization(self, is_update, obj):
        location = FacilityLocation.objects.get(
            external_id=self.location,
            deleted=False,
        )
        obj.location = location

        # None means the field was not supplied; preserve existing selections.
        # An empty list means clear all assigned procedures.
        if self.surgery_procedures is not None:
            obj.surgery_procedure_ids = self.surgery_procedures


class OTRoomWriteSpec(OTRoomSpec):
    pass


class OTRoomUpdateSpec(OTRoomSpec):
    status: OTRoomStatusChoices


class OTRoomListSpec(OTRoomSpec):
    facility: dict | None = None
    location_name: str | None = None
    created_date: str | None = None
    modified_date: str | None = None

    @classmethod
    def perform_extra_serialization(cls, mapping, obj):
        mapping["id"] = obj.external_id
        mapping["location"] = str(obj.location.external_id)
        mapping["location_name"] = obj.location.name
        mapping["surgery_procedures"] = list(
            obj.surgery_procedures.values_list("external_id", flat=True)
        )
        mapping["facility"] = {
            "id": str(obj.facility.external_id),
            "name": obj.facility.name,
        }
        mapping["created_date"] = (
            obj.created_date.isoformat() if obj.created_date else None
        )
        mapping["modified_date"] = (
            obj.modified_date.isoformat() if obj.modified_date else None
        )


class OTRoomRetrieveSpec(OTRoomListSpec):
    created_by: dict | None = None
    updated_by: dict | None = None

    @classmethod
    def perform_extra_serialization(cls, mapping, obj):
        super().perform_extra_serialization(mapping, obj)
        cls.serialize_audit_users(mapping, obj)


class SurgeryProcedureStatusChoices(str, Enum):
    active = "active"
    inactive = "inactive"


class SurgeryProcedureBaseSpec(EMRResource):
    __model__ = SurgeryProcedure
    __exclude__ = ["facility"]

    id: UUID4 | None = None


class SurgeryProcedureSpec(SurgeryProcedureBaseSpec):
    procedure_name: str = Field(min_length=1, max_length=255)
    procedure_code: str = Field(min_length=1, max_length=100)
    department: UUID4
    duration_minutes: int = Field(default=30, ge=1)
    description: str = ""
    status: SurgeryProcedureStatusChoices = SurgeryProcedureStatusChoices.active

    def perform_extra_deserialization(self, is_update, obj):
        from care.emr.models.organization import FacilityOrganization

        obj.department = FacilityOrganization.objects.get(external_id=self.department)


class SurgeryProcedureWriteSpec(SurgeryProcedureSpec):
    pass


class SurgeryProcedureUpdateSpec(SurgeryProcedureSpec):
    pass


class SurgeryProcedureListSpec(SurgeryProcedureSpec):
    facility: dict | None = None
    department_name: str | None = None
    created_date: str | None = None
    modified_date: str | None = None

    @classmethod
    def perform_extra_serialization(cls, mapping, obj):
        mapping["id"] = str(obj.external_id)
        mapping["department"] = str(obj.department.external_id)
        mapping["department_name"] = obj.department.name
        mapping["facility"] = {
            "id": str(obj.facility.external_id),
            "name": obj.facility.name,
        }
        mapping["created_date"] = (
            obj.created_date.isoformat() if obj.created_date else None
        )
        mapping["modified_date"] = (
            obj.modified_date.isoformat() if obj.modified_date else None
        )


class SurgeryProcedureRetrieveSpec(SurgeryProcedureListSpec):
    created_by: dict | None = None
    updated_by: dict | None = None

    @classmethod
    def perform_extra_serialization(cls, mapping, obj):
        super().perform_extra_serialization(mapping, obj)
        cls.serialize_audit_users(mapping, obj)


class AnaesthesiaStatusChoices(str, Enum):
    active = "active"
    inactive = "inactive"


class AnaesthesiaBaseSpec(EMRResource):
    __model__ = Anaesthesia
    __exclude__ = ["facility"]

    id: UUID4 | None = None


class AnaesthesiaSpec(AnaesthesiaBaseSpec):
    anaesthesia_name: str = Field(min_length=1, max_length=255)
    anaesthesia_code: str = Field(min_length=1, max_length=100)
    description: str = ""
    status: AnaesthesiaStatusChoices = AnaesthesiaStatusChoices.active


class AnaesthesiaWriteSpec(AnaesthesiaSpec):
    pass


class AnaesthesiaUpdateSpec(AnaesthesiaSpec):
    pass


class AnaesthesiaListSpec(AnaesthesiaSpec):
    facility: dict | None = None
    created_date: str | None = None
    modified_date: str | None = None

    @classmethod
    def perform_extra_serialization(cls, mapping, obj):
        mapping["id"] = str(obj.external_id)
        mapping["facility"] = {
            "id": str(obj.facility.external_id),
            "name": obj.facility.name,
        }
        mapping["created_date"] = (
            obj.created_date.isoformat() if obj.created_date else None
        )
        mapping["modified_date"] = (
            obj.modified_date.isoformat() if obj.modified_date else None
        )


class AnaesthesiaRetrieveSpec(AnaesthesiaListSpec):
    created_by: dict | None = None
    updated_by: dict | None = None

    @classmethod
    def perform_extra_serialization(cls, mapping, obj):
        super().perform_extra_serialization(mapping, obj)
        cls.serialize_audit_users(mapping, obj)


# Surgery-Anaesthesia Configuration


class SurgeryAnaesthesiaConfigStatusChoices(str, Enum):
    active = "active"
    inactive = "inactive"


class SurgeryAnaesthesiaConfigBaseSpec(EMRResource):
    __model__ = SurgeryAnaesthesiaConfig
    __exclude__ = ["facility", "surgery_procedure"]

    id: UUID4 | None = None


class SurgeryAnaesthesiaConfigSpec(SurgeryAnaesthesiaConfigBaseSpec):
    surgery_procedure: UUID4
    anaesthesia_format: str = Field(min_length=1, max_length=100)
    age_range: str = ""
    gender: str = ""
    weight: Decimal | None = Field(default=None, ge=0)
    condition: str = ""
    dose: str = ""
    status: SurgeryAnaesthesiaConfigStatusChoices = (
        SurgeryAnaesthesiaConfigStatusChoices.active
    )

    def perform_extra_deserialization(self, is_update, obj):
        # The ViewSet validates the procedure against the current facility.
        procedure = SurgeryProcedure.objects.filter(
            external_id=self.surgery_procedure,
            deleted=False,
        ).first()

        if procedure is not None:
            obj.surgery_procedure = procedure


class SurgeryAnaesthesiaConfigWriteSpec(SurgeryAnaesthesiaConfigSpec):
    pass


class SurgeryAnaesthesiaConfigUpdateSpec(SurgeryAnaesthesiaConfigSpec):
    pass


class SurgeryAnaesthesiaConfigListSpec(SurgeryAnaesthesiaConfigSpec):
    surgery_procedure_name: str | None = None
    facility: dict | None = None
    created_date: str | None = None
    modified_date: str | None = None

    @classmethod
    def perform_extra_serialization(cls, mapping, obj):
        mapping["id"] = str(obj.external_id)
        mapping["surgery_procedure"] = str(obj.surgery_procedure.external_id)
        mapping["surgery_procedure_name"] = obj.surgery_procedure.procedure_name
        mapping["facility"] = {
            "id": str(obj.facility.external_id),
            "name": obj.facility.name,
        }
        mapping["created_date"] = (
            obj.created_date.isoformat() if obj.created_date else None
        )
        mapping["modified_date"] = (
            obj.modified_date.isoformat() if obj.modified_date else None
        )


class SurgeryAnaesthesiaConfigRetrieveSpec(SurgeryAnaesthesiaConfigListSpec):
    created_by: dict | None = None
    updated_by: dict | None = None

    @classmethod
    def perform_extra_serialization(cls, mapping, obj):
        super().perform_extra_serialization(mapping, obj)
        cls.serialize_audit_users(mapping, obj)


class SurgeryCheckListBaseSpec(EMRResource):
    __model__ = SurgeryCheckList

    id: int | None = None


class SurgeryCheckListSpec(SurgeryCheckListBaseSpec):
    checklist_name: str
    sequence: int = 1
    status: str = "active"


class SurgeryCheckListWriteSpec(SurgeryCheckListSpec):
    pass


class SurgeryCheckListUpdateSpec(SurgeryCheckListSpec):
    checklist_name: str
    sequence: int
    status: str


class SurgeryCheckListListSpec(SurgeryCheckListSpec):
    created_date: str | None = None
    modified_date: str | None = None

    @classmethod
    def perform_extra_serialization(cls, mapping, obj):
        mapping["id"] = obj.id
        mapping["created_date"] = (
            obj.created_date.isoformat() if obj.created_date else None
        )
        mapping["modified_date"] = (
            obj.modified_date.isoformat() if obj.modified_date else None
        )


class SurgeryCheckListRetrieveSpec(SurgeryCheckListListSpec):
    created_by: dict | None = None
    updated_by: dict | None = None

    @classmethod
    def perform_extra_serialization(cls, mapping, obj):
        super().perform_extra_serialization(mapping, obj)
        cls.serialize_audit_users(mapping, obj)


class DayOfSurgeryCheckListBaseSpec(EMRResource):
    __model__ = DayOfSurgeryCheckList

    id: int | None = None


class DayOfSurgeryCheckListSpec(DayOfSurgeryCheckListBaseSpec):
    checklist_name: str
    sequence: int = 1
    status: str = "active"


class DayOfSurgeryCheckListWriteSpec(DayOfSurgeryCheckListSpec):
    pass


class DayOfSurgeryCheckListUpdateSpec(DayOfSurgeryCheckListSpec):
    checklist_name: str
    sequence: int
    status: str


class DayOfSurgeryCheckListListSpec(DayOfSurgeryCheckListSpec):
    created_date: str | None = None
    modified_date: str | None = None

    @classmethod
    def perform_extra_serialization(cls, mapping, obj):
        mapping["id"] = obj.id
        mapping["created_date"] = (
            obj.created_date.isoformat() if obj.created_date else None
        )
        mapping["modified_date"] = (
            obj.modified_date.isoformat() if obj.modified_date else None
        )


class DayOfSurgeryCheckListRetrieveSpec(DayOfSurgeryCheckListListSpec):
    created_by: dict | None = None
    updated_by: dict | None = None

    @classmethod
    def perform_extra_serialization(cls, mapping, obj):
        super().perform_extra_serialization(mapping, obj)
        cls.serialize_audit_users(mapping, obj)
