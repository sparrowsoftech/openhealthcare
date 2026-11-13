from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from care.emr.models.ot import (
    OTPostOperativeRecovery,
    OTPatientTransfer,
    SurgerySchedule,
)
from care.emr.models.organization import FacilityOrganizationUser
from care.facility.models import Facility
from care.security.authorization import AuthorizationController
from care.utils.shortcuts import get_object_or_404


class OTPostOperativeViewSet(GenericViewSet):
    """Manage postoperative recovery observations for OT schedules."""

    recovery_statuses = {
        "recovering",
        "stable",
        "needs_attention",
        "transferred",
    }

    text_fields = {
        "consciousness_level",
        "oxygen_support",
        "recovery_notes",
        "doctor_instructions",
        "recorded_by",
    }

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

    def _get_schedule(self, facility, schedule_id):
        schedule = get_object_or_404(
            SurgerySchedule.objects.select_related("service_request"),
            external_id=schedule_id,
            facility=facility,
            deleted=False,
        )

        if not AuthorizationController.call(
            "can_read_service_request",
            self.request.user,
            schedule.service_request,
        ):
            raise PermissionDenied(
                "You cannot access this Surgery Order."
            )

        return schedule

    @staticmethod
    def _parse_datetime(value, field_name):
        if value in (None, ""):
            return None

        parsed = parse_datetime(str(value))

        if parsed is None:
            raise ValidationError({
                field_name: "Enter a valid ISO datetime."
            })

        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(
                parsed,
                timezone.get_current_timezone(),
            )

        return parsed

    @staticmethod
    def _record_data(record):
        return {
            "id": str(record.external_id),
            "schedule_id": str(record.surgery_schedule.external_id),
            "assessed_at": (
                record.assessed_at.isoformat()
                if record.assessed_at else None
            ),
            "recovery_status": record.recovery_status,
            "consciousness_level": record.consciousness_level,
            "vitals": record.vitals,
            "pain_score": record.pain_score,
            "oxygen_support": record.oxygen_support,
            "recovery_notes": record.recovery_notes,
            "doctor_instructions": record.doctor_instructions,
            "recorded_by": record.recorded_by,
            "created_date": (
                record.created_date.isoformat()
                if record.created_date else None
            ),
        }

    def list(self, request, *args, **kwargs):
        facility = self._get_facility()

        records = OTPostOperativeRecovery.objects.filter(
            facility=facility,
            deleted=False,
        ).select_related(
            "surgery_schedule",
            "surgery_schedule__service_request",
        )

        schedule_id = request.query_params.get("schedule_id")

        if schedule_id:
            schedule = self._get_schedule(facility, schedule_id)
            records = records.filter(surgery_schedule=schedule)

        results = [
            self._record_data(record)
            for record in records.order_by("-created_date")
            if AuthorizationController.call(
                "can_read_service_request",
                request.user,
                record.surgery_schedule.service_request,
            )
        ]

        return Response({
            "count": len(results),
            "results": results,
        })

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        facility = self._get_facility()
        schedule_id = request.data.get("schedule_id")

        if not schedule_id:
            raise ValidationError({
                "schedule_id": "This field is required."
            })

        recovery_status = request.data.get(
            "recovery_status",
            "recovering",
        )

        if recovery_status not in self.recovery_statuses:
            raise ValidationError({
                "recovery_status": "Invalid recovery status."
            })

        assessed_at = self._parse_datetime(
            request.data.get("assessed_at"),
            "assessed_at",
        )

        pain_score = request.data.get("pain_score")

        if pain_score not in (None, ""):
            try:
                if isinstance(pain_score, bool):
                    raise ValueError

                pain_score = int(pain_score)
            except (TypeError, ValueError):
                raise ValidationError({
                    "pain_score": "Enter an integer from 0 to 10."
                })

            if not 0 <= pain_score <= 10:
                raise ValidationError({
                    "pain_score": "Pain score must be between 0 and 10."
                })
        else:
            pain_score = None

        vitals = request.data.get("vitals", {})

        if not isinstance(vitals, dict):
            raise ValidationError({
                "vitals": "Provide vitals as a JSON object."
            })

        data = {}

        for field in self.text_fields:
            value = request.data.get(field, "")

            if not isinstance(value, str):
                raise ValidationError({
                    field: "A string value is required."
                })

            data[field] = value.strip()

        with transaction.atomic():
            schedule = self._get_schedule(facility, schedule_id)

            record = OTPostOperativeRecovery.objects.create(
                facility=facility,
                surgery_schedule=schedule,
                assessed_at=assessed_at or timezone.now(),
                recovery_status=recovery_status,
                vitals=vitals,
                pain_score=pain_score,
                **data,
            )

        return Response(
            {
                "message": "Post-operative recovery observation saved.",
                "record": self._record_data(record),
            },
            status=status.HTTP_201_CREATED,
        )


class OTPatientTransferViewSet(GenericViewSet):
    """Manage ICU, inpatient ward and recovery-room transfer records."""

    destination_types = {
        "icu",
        "inpatient_ward",
        "recovery_room",
        "other",
    }

    transfer_statuses = {
        "planned",
        "transferred",
        "cancelled",
    }

    text_fields = {
        "destination_name",
        "patient_condition",
        "receiving_staff",
        "handover_notes",
        "recorded_by",
    }

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

    def _get_schedule(self, facility, schedule_id):
        schedule = get_object_or_404(
            SurgerySchedule.objects.select_related("service_request"),
            external_id=schedule_id,
            facility=facility,
            deleted=False,
        )

        if not AuthorizationController.call(
            "can_read_service_request",
            self.request.user,
            schedule.service_request,
        ):
            raise PermissionDenied(
                "You cannot access this Surgery Order."
            )

        return schedule

    @staticmethod
    def _parse_datetime(value, field_name):
        if value in (None, ""):
            return None

        parsed = parse_datetime(str(value))

        if parsed is None:
            raise ValidationError({
                field_name: "Enter a valid ISO datetime."
            })

        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(
                parsed,
                timezone.get_current_timezone(),
            )

        return parsed

    @staticmethod
    def _record_data(record):
        return {
            "id": str(record.external_id),
            "schedule_id": str(record.surgery_schedule.external_id),
            "destination_type": record.destination_type,
            "destination_name": record.destination_name,
            "transfer_status": record.transfer_status,
            "transfer_time": (
                record.transfer_time.isoformat()
                if record.transfer_time else None
            ),
            "patient_condition": record.patient_condition,
            "receiving_staff": record.receiving_staff,
            "handover_notes": record.handover_notes,
            "recorded_by": record.recorded_by,
            "created_date": (
                record.created_date.isoformat()
                if record.created_date else None
            ),
        }

    def list(self, request, *args, **kwargs):
        facility = self._get_facility()

        records = OTPatientTransfer.objects.filter(
            facility=facility,
            deleted=False,
        ).select_related(
            "surgery_schedule",
            "surgery_schedule__service_request",
        )

        schedule_id = request.query_params.get("schedule_id")

        if schedule_id:
            schedule = self._get_schedule(facility, schedule_id)
            records = records.filter(surgery_schedule=schedule)

        results = [
            self._record_data(record)
            for record in records.order_by("-created_date")
            if AuthorizationController.call(
                "can_read_service_request",
                request.user,
                record.surgery_schedule.service_request,
            )
        ]

        return Response({
            "count": len(results),
            "results": results,
        })

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        facility = self._get_facility()
        schedule_id = request.data.get("schedule_id")

        if not schedule_id:
            raise ValidationError({
                "schedule_id": "This field is required."
            })

        destination_type = request.data.get("destination_type")
        transfer_status = request.data.get(
            "transfer_status",
            "planned",
        )

        if destination_type not in self.destination_types:
            raise ValidationError({
                "destination_type": "Invalid transfer destination."
            })

        if transfer_status not in self.transfer_statuses:
            raise ValidationError({
                "transfer_status": "Invalid transfer status."
            })

        transfer_time = self._parse_datetime(
            request.data.get("transfer_time"),
            "transfer_time",
        )

        if transfer_status == "transferred" and transfer_time is None:
            transfer_time = timezone.now()

        data = {}

        for field in self.text_fields:
            value = request.data.get(field, "")

            if not isinstance(value, str):
                raise ValidationError({
                    field: "A string value is required."
                })

            data[field] = value.strip()

        if (
            transfer_status == "transferred"
            and not data["destination_name"]
            and destination_type == "other"
        ):
            raise ValidationError({
                "destination_name": (
                    "Specify the destination when destination type is Other."
                )
            })

        with transaction.atomic():
            schedule = self._get_schedule(facility, schedule_id)

            record = OTPatientTransfer.objects.create(
                facility=facility,
                surgery_schedule=schedule,
                destination_type=destination_type,
                transfer_status=transfer_status,
                transfer_time=transfer_time,
                **data,
            )

        return Response(
            {
                "message": "Patient transfer record saved.",
                "record": self._record_data(record),
            },
            status=status.HTTP_201_CREATED,
        )
