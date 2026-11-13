from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from care.emr.models.ot import (
    OTRoom,
    SurgeryAnaesthesiaConfig,
    SurgerySchedule,
)
from care.emr.models.organization import FacilityOrganizationUser
from care.emr.models.service_request import ServiceRequest
from care.facility.models import Facility
from care.security.authorization import AuthorizationController
from care.users.models import User
from care.utils.shortcuts import get_object_or_404


class OTSchedulingViewSet(GenericViewSet):
    """
    Schedule an existing Surgery Order in an OT Room.
    Patient details are obtained through the existing ServiceRequest.
    """

    def _get_facility(self):
        facility = get_object_or_404(
            Facility,
            external_id=self.kwargs["facility_external_id"],
        )

        if not FacilityOrganizationUser.objects.filter(
            organization__facility=facility,
            user=self.request.user,
        ).exists():
            raise PermissionDenied(
                "You are not a member of this facility."
            )

        return facility

    def _schedule_data(self, schedule):
        order = schedule.service_request
        patient = order.patient
        procedure = order.surgery_procedure

        return {
            "id": str(schedule.external_id),
            "service_request_id": str(order.external_id),
            "patient_id": str(patient.external_id),
            "patient_name": patient.name,
            "age": patient.age if (
                patient.date_of_birth or patient.year_of_birth
            ) else None,
            "gender": patient.gender,
            "surgery_procedure": (
                procedure.procedure_name if procedure else order.title
            ),
            "procedure_code": (
                procedure.procedure_code if procedure else None
            ),
            "ot_room_id": str(schedule.ot_room.external_id),
            "ot_room": schedule.ot_room.location.name,
            "anaesthesia_config_id": (
                str(schedule.anaesthesia_config.external_id)
                if schedule.anaesthesia_config else None
            ),
            "anaesthesia": (
                schedule.anaesthesia_config.anaesthesia_format
                if schedule.anaesthesia_config else None
            ),
            "surgeon_id": (
                str(schedule.surgeon.external_id)
                if schedule.surgeon else None
            ),
            "surgeon_name": (
                schedule.surgeon.get_full_name()
                or schedule.surgeon.username
                if schedule.surgeon else None
            ),
            "scheduled_start": schedule.scheduled_start.isoformat(),
            "scheduled_end": schedule.scheduled_end.isoformat(),
            "status": schedule.status,
            "notes": schedule.notes,
        }

    def list(self, request, *args, **kwargs):
        facility = self._get_facility()

        schedules = (
            SurgerySchedule.objects.filter(
                facility=facility,
                deleted=False,
            )
            .select_related(
                "service_request",
                "service_request__patient",
                "service_request__surgery_procedure",
                "ot_room",
                "ot_room__location",
                "anaesthesia_config",
                "surgeon",
            )
            .order_by("scheduled_start")
        )

        results = []
        for schedule in schedules:
            if AuthorizationController.call(
                "can_read_service_request",
                request.user,
                schedule.service_request,
            ):
                results.append(self._schedule_data(schedule))

        return Response({
            "count": len(results),
            "results": results,
        })

    def create(self, request, *args, **kwargs):
        facility = self._get_facility()
        data = request.data

        required_fields = [
            "service_request_id",
            "ot_room_id",
            "scheduled_start",
            "scheduled_end",
        ]

        missing = [
            field for field in required_fields
            if not data.get(field)
        ]
        if missing:
            raise ValidationError({
                field: "This field is required."
                for field in missing
            })

        start = parse_datetime(str(data["scheduled_start"]))
        end = parse_datetime(str(data["scheduled_end"]))

        if not start or not end:
            raise ValidationError({
                "scheduled_start": (
                    "Provide a valid ISO datetime for start and end."
                )
            })

        if timezone.is_naive(start) or timezone.is_naive(end):
            raise ValidationError({
                "scheduled_start": (
                    "Datetime must include a timezone offset."
                )
            })

        if end <= start:
            raise ValidationError({
                "scheduled_end": "End time must be after start time."
            })

        order = get_object_or_404(
            ServiceRequest,
            external_id=data["service_request_id"],
            facility=facility,
            category="surgical_procedure",
            status="active",
            intent="order",
            do_not_perform=False,
            encounter__isnull=False,
        )

        if not AuthorizationController.call(
            "can_read_service_request",
            request.user,
            order,
        ):
            raise PermissionDenied(
                "You cannot access this Surgery Order."
            )

        if not order.surgery_procedure:
            raise ValidationError({
                "service_request_id": (
                    "The Surgery Order has no linked procedure."
                )
            })

        room = get_object_or_404(
            OTRoom,
            external_id=data["ot_room_id"],
            facility=facility,
            deleted=False,
        )

        if room.status != "available":
            raise ValidationError({
                "ot_room_id": (
                    "Selected OT Room is not available."
                )
            })

        # If procedures are configured for this room, enforce the mapping.
        configured_procedures = room.surgery_procedures.all()
        if (
            configured_procedures.exists()
            and not configured_procedures.filter(
                pk=order.surgery_procedure_id
            ).exists()
        ):
            raise ValidationError({
                "ot_room_id": (
                    "This OT Room is not configured for the selected surgery."
                )
            })

        anaesthesia = None
        anaesthesia_id = data.get("anaesthesia_config_id")

        if anaesthesia_id:
            anaesthesia = get_object_or_404(
                SurgeryAnaesthesiaConfig,
                external_id=anaesthesia_id,
                facility=facility,
                surgery_procedure=order.surgery_procedure,
                status="active",
                deleted=False,
            )

        surgeon = None
        surgeon_id = data.get("surgeon_id")

        if surgeon_id:
            surgeon = get_object_or_404(
                User,
                external_id=surgeon_id,
            )

        notes = str(data.get("notes") or "").strip()

        with transaction.atomic():
            # Lock the room row to reduce simultaneous booking conflicts.
            locked_room = OTRoom.objects.select_for_update().get(
                pk=room.pk
            )

            if locked_room.status != "available":
                raise ValidationError({
                    "ot_room_id": "Selected OT Room is not available."
                })

            overlap = SurgerySchedule.objects.filter(
                facility=facility,
                ot_room=locked_room,
                status="scheduled",
                deleted=False,
                scheduled_start__lt=end,
                scheduled_end__gt=start,
            ).exists()

            if overlap:
                raise ValidationError({
                    "scheduled_start": (
                        "This OT Room already has a surgery scheduled "
                        "during the selected time."
                    )
                })

            if SurgerySchedule.objects.filter(
                facility=facility,
                service_request=order,
                status="scheduled",
                deleted=False,
            ).exists():
                raise ValidationError({
                    "service_request_id": (
                        "This Surgery Order is already scheduled."
                    )
                })

            schedule = SurgerySchedule.objects.create(
                facility=facility,
                service_request=order,
                ot_room=locked_room,
                anaesthesia_config=anaesthesia,
                surgeon=surgeon,
                scheduled_start=start,
                scheduled_end=end,
                status="scheduled",
                notes=notes,
                created_by=request.user,
                updated_by=request.user,
            )

        schedule = (
            SurgerySchedule.objects
            .select_related(
                "service_request",
                "service_request__patient",
                "service_request__surgery_procedure",
                "ot_room",
                "ot_room__location",
                "anaesthesia_config",
                "surgeon",
            )
            .get(pk=schedule.pk)
        )

        return Response(
            {
                "message": "Surgery scheduled successfully.",
                "schedule": self._schedule_data(schedule),
            },
            status=status.HTTP_201_CREATED,
        )
