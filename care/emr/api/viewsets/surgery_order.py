from django.db import transaction
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from pydantic import BaseModel, UUID4, ValidationError as PydanticValidationError

from care.emr.models.encounter import Encounter
from care.emr.models.ot import SurgeryProcedure
from care.emr.models.organization import FacilityOrganizationUser
from care.emr.models.service_request import ServiceRequest
from care.facility.models import Facility
from care.security.authorization import AuthorizationController
from care.utils.shortcuts import get_object_or_404


class SurgeryOrderCreateSpec(BaseModel):
    surgery_procedure: UUID4
    encounter: UUID4
    priority: str = "routine"
    note: str | None = None
    patient_instruction: str | None = None


class SurgeryOrderViewSet(GenericViewSet):
    """
    Creates a surgical ServiceRequest using the existing Surgery Master.
    """

    def create(self, request, *args, **kwargs):
        facility = get_object_or_404(
            Facility,
            external_id=self.kwargs["facility_external_id"],
        )

        try:
            data = SurgeryOrderCreateSpec.model_validate(request.data)
        except PydanticValidationError as exc:
            raise ValidationError(exc.errors()) from exc

        allowed_priorities = ["routine", "urgent", "asap", "stat"]
        if data.priority not in allowed_priorities:
            raise ValidationError({
                "priority": "Priority must be routine, urgent, asap or stat."
            })

        encounter = get_object_or_404(
            Encounter,
            external_id=data.encounter,
            facility=facility,
        )

        if not AuthorizationController.call(
            "can_write_service_request_in_encounter",
            request.user,
            encounter,
        ):
            raise PermissionDenied(
                "You are not allowed to create a surgery order for this encounter."
            )

        if not FacilityOrganizationUser.objects.filter(
            organization__facility=facility,
            user=request.user,
        ).exists():
            raise PermissionDenied(
                "Requester must be a member of this facility."
            )

        procedure = get_object_or_404(
            SurgeryProcedure,
            external_id=data.surgery_procedure,
            facility=facility,
            status="active",
            deleted=False,
        )

        with transaction.atomic():
            order = ServiceRequest.objects.create(
                facility=facility,
                patient=encounter.patient,
                encounter=encounter,
                surgery_procedure=procedure,
                title=procedure.procedure_name,
                category="surgical_procedure",
                status="active",
                intent="order",
                priority=data.priority,
                do_not_perform=False,
                note=data.note,
                patient_instruction=data.patient_instruction,
                requester=request.user,
                created_by=request.user,
                updated_by=request.user,
            )

        return Response(
            {
                "message": "Surgery order created successfully.",
                "id": str(order.external_id),
                "patient_id": str(encounter.patient.external_id),
                "encounter_id": str(encounter.external_id),
                "surgery_procedure_id": str(procedure.external_id),
                "surgery_procedure": procedure.procedure_name,
                "procedure_code": procedure.procedure_code,
                "priority": order.priority,
                "status": order.status,
                "order_date": (
                    order.created_date.isoformat()
                    if order.created_date
                    else None
                ),
            },
            status=status.HTTP_201_CREATED,
        )
