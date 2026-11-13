from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from care.emr.models.ot import (
    OTIncidentRecord,
    OTMedicineUsage,
    SurgerySchedule,
)
from care.emr.models.organization import FacilityOrganizationUser
from care.facility.models import Facility
from care.security.authorization import AuthorizationController
from care.utils.shortcuts import get_object_or_404


class OTMedicinesIncidentsViewSet(GenericViewSet):
    """Manage medicine usage and incident records for OT schedules."""

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
                parsed, timezone.get_current_timezone()
            )
        return parsed

    @staticmethod
    def _medicine_data(item):
        return {
            "id": str(item.external_id),
            "schedule_id": str(item.surgery_schedule.external_id),
            "item_name": item.item_name,
            "dose": item.dose,
            "quantity": str(item.quantity),
            "unit": item.unit,
            "batch_number": item.batch_number,
            "used_at": (
                item.used_at.isoformat() if item.used_at else None
            ),
            "remarks": item.remarks,
            "created_date": (
                item.created_date.isoformat()
                if item.created_date else None
            ),
        }

    @staticmethod
    def _incident_data(item):
        return {
            "id": str(item.external_id),
            "schedule_id": str(item.surgery_schedule.external_id),
            "incident_type": item.incident_type,
            "occurred_at": (
                item.occurred_at.isoformat()
                if item.occurred_at else None
            ),
            "description": item.description,
            "immediate_action": item.immediate_action,
            "reported_by": item.reported_by,
            "follow_up": item.follow_up,
            "created_date": (
                item.created_date.isoformat()
                if item.created_date else None
            ),
        }

    def list(self, request, *args, **kwargs):
        facility = self._get_facility()

        medicines = OTMedicineUsage.objects.filter(
            facility=facility,
            deleted=False,
        ).select_related(
            "surgery_schedule",
            "surgery_schedule__service_request",
        )

        incidents = OTIncidentRecord.objects.filter(
            facility=facility,
            deleted=False,
        ).select_related(
            "surgery_schedule",
            "surgery_schedule__service_request",
        )

        schedule_id = request.query_params.get("schedule_id")
        if schedule_id:
            schedule = self._get_schedule(facility, schedule_id)
            medicines = medicines.filter(surgery_schedule=schedule)
            incidents = incidents.filter(surgery_schedule=schedule)

        visible_medicines = [
            self._medicine_data(item)
            for item in medicines.order_by("-created_date")
            if AuthorizationController.call(
                "can_read_service_request",
                request.user,
                item.surgery_schedule.service_request,
            )
        ]

        visible_incidents = [
            self._incident_data(item)
            for item in incidents.order_by("-created_date")
            if AuthorizationController.call(
                "can_read_service_request",
                request.user,
                item.surgery_schedule.service_request,
            )
        ]

        return Response({
            "medicines": {
                "count": len(visible_medicines),
                "results": visible_medicines,
            },
            "incidents": {
                "count": len(visible_incidents),
                "results": visible_incidents,
            },
        })

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        facility = self._get_facility()
        schedule_id = request.data.get("schedule_id")
        record_type = request.data.get("record_type")

        if not schedule_id:
            raise ValidationError({
                "schedule_id": "This field is required."
            })

        if record_type not in {"medicine", "incident"}:
            raise ValidationError({
                "record_type": "Use 'medicine' or 'incident'."
            })

        schedule = self._get_schedule(facility, schedule_id)

        if record_type == "medicine":
            item_name = str(
                request.data.get("item_name", "")
            ).strip()
            unit = str(request.data.get("unit", "")).strip()

            if not item_name:
                raise ValidationError({
                    "item_name": "This field is required."
                })
            if not unit:
                raise ValidationError({
                    "unit": "This field is required."
                })

            try:
                quantity = float(request.data.get("quantity"))
            except (TypeError, ValueError):
                raise ValidationError({
                    "quantity": "Enter a valid positive quantity."
                })

            if quantity <= 0:
                raise ValidationError({
                    "quantity": "Quantity must be greater than zero."
                })

            item = OTMedicineUsage.objects.create(
                facility=facility,
                surgery_schedule=schedule,
                item_name=item_name,
                dose=str(request.data.get("dose", "")).strip(),
                quantity=quantity,
                unit=unit,
                batch_number=str(
                    request.data.get("batch_number", "")
                ).strip(),
                used_at=self._parse_datetime(
                    request.data.get("used_at"), "used_at"
                ),
                remarks=str(
                    request.data.get("remarks", "")
                ).strip(),
            )

            return Response(
                {
                    "message": "Medicine/consumable entry saved.",
                    "record_type": "medicine",
                    "record": self._medicine_data(item),
                },
                status=status.HTTP_201_CREATED,
            )

        incident_type = str(
            request.data.get("incident_type", "")
        ).strip()
        description = str(
            request.data.get("description", "")
        ).strip()

        if not incident_type:
            raise ValidationError({
                "incident_type": "This field is required."
            })
        if not description:
            raise ValidationError({
                "description": "This field is required."
            })

        item = OTIncidentRecord.objects.create(
            facility=facility,
            surgery_schedule=schedule,
            incident_type=incident_type,
            occurred_at=self._parse_datetime(
                request.data.get("occurred_at"), "occurred_at"
            ),
            description=description,
            immediate_action=str(
                request.data.get("immediate_action", "")
            ).strip(),
            reported_by=str(
                request.data.get("reported_by", "")
            ).strip(),
            follow_up=str(
                request.data.get("follow_up", "")
            ).strip(),
        )

        return Response(
            {
                "message": "OT incident saved.",
                "record_type": "incident",
                "record": self._incident_data(item),
            },
            status=status.HTTP_201_CREATED,
        )
