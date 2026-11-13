from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from care.emr.models.ot import (
    OTPreOperativeAssessment,
    OTOperationRecord,
    OTRoom,
    SurgerySchedule,
)
from care.emr.models.organization import FacilityOrganizationUser
from care.facility.models import Facility
from care.security.authorization import AuthorizationController
from care.utils.shortcuts import get_object_or_404


class OTOperationViewSet(GenericViewSet):
    """
    Manage actual operation progress for a scheduled surgery.
    """

    writable_fields = {
        "team_attendance",
        "intraoperative_notes",
        "incident_report",
        "procedure_details",
        "operative_findings",
        "surgeon_name",
        "complications",
        "operation_outcome",
        "additional_remarks",
        "anaesthesia",
        "preoperative_medication",
        "incision",
        "surgery_notes",
        "pathology",
        "closure",
        "drainage_tube",
        "ryles_tube",
        "biopsy",
        "postoperative_advice",
    }

    allowed_statuses = {
        "not_started",
        "in_progress",
        "completed",
        "cancelled",
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
            SurgerySchedule.objects.select_related(
                "service_request",
                "service_request__patient",
                "service_request__surgery_procedure",
                "ot_room",
                "ot_room__location",
            ),
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

    def _operation_data(self, record):
        schedule = record.surgery_schedule
        order = schedule.service_request
        patient = order.patient
        procedure = order.surgery_procedure

        return {
            "id": str(record.external_id),
            "schedule_id": str(schedule.external_id),
            "service_request_id": str(order.external_id),
            "patient_id": str(patient.external_id),
            "patient_name": patient.name,
            "age": (
                patient.age
                if patient.date_of_birth or patient.year_of_birth
                else None
            ),
            "gender": patient.gender,
            "surgery_procedure": (
                procedure.procedure_name if procedure else order.title
            ),
            "ot_room": schedule.ot_room.location.name,
            "scheduled_start": schedule.scheduled_start.isoformat(),
            "scheduled_end": schedule.scheduled_end.isoformat(),
            "status": record.status,
            "actual_start": (
                record.actual_start.isoformat()
                if record.actual_start else None
            ),
            "actual_end": (
                record.actual_end.isoformat()
                if record.actual_end else None
            ),
            "team_attendance": record.team_attendance,
            "intraoperative_notes": record.intraoperative_notes,
            "incident_report": record.incident_report,
            "procedure_details": record.procedure_details,
            "operative_findings": record.operative_findings,
            "surgeon_name": record.surgeon_name,
            "complications": record.complications,
            "operation_outcome": record.operation_outcome,
            "additional_remarks": record.additional_remarks,
            "anaesthesia": record.anaesthesia,
            "preoperative_medication": record.preoperative_medication,
            "incision": record.incision,
            "surgery_notes": record.surgery_notes,
            "pathology": record.pathology,
            "closure": record.closure,
            "drainage_tube": record.drainage_tube,
            "ryles_tube": record.ryles_tube,
            "biopsy": record.biopsy,
            "postoperative_advice": record.postoperative_advice,
        }

    def list(self, request, *args, **kwargs):
        facility = self._get_facility()

        records = (
            OTOperationRecord.objects.filter(
                facility=facility,
                deleted=False,
            )
            .select_related(
                "surgery_schedule",
                "surgery_schedule__service_request",
                "surgery_schedule__service_request__patient",
                "surgery_schedule__service_request__surgery_procedure",
                "surgery_schedule__ot_room",
                "surgery_schedule__ot_room__location",
            )
            .order_by("-modified_date")
        )

        schedule_id = request.query_params.get("schedule_id")
        if schedule_id:
            records = records.filter(
                surgery_schedule__external_id=schedule_id
            )

        results = []
        for record in records:
            if AuthorizationController.call(
                "can_read_service_request",
                request.user,
                record.surgery_schedule.service_request,
            ):
                results.append(self._operation_data(record))

        return Response({
            "count": len(results),
            "results": results,
        })

    def create(self, request, *args, **kwargs):
        facility = self._get_facility()
        schedule_id = request.data.get("schedule_id")

        if not schedule_id:
            raise ValidationError({
                "schedule_id": "This field is required."
            })

        requested_status = request.data.get("status")

        if (
            requested_status is not None
            and requested_status not in self.allowed_statuses
        ):
            raise ValidationError({
                "status": "Invalid operation status."
            })

        data = {
            key: value
            for key, value in request.data.items()
            if key in self.writable_fields
        }

        if (
            "team_attendance" in data
            and not isinstance(data["team_attendance"], list)
        ):
            raise ValidationError({
                "team_attendance": "Provide attendance as a JSON list."
            })

        text_fields = (
            "intraoperative_notes",
            "incident_report",
            "procedure_details",
            "operative_findings",
            "surgeon_name",
            "complications",
            "operation_outcome",
            "preoperative_medication",
            "incision",
            "surgery_notes",
            "pathology",
            "closure",
            "biopsy",
            "postoperative_advice",
            "additional_remarks",
        )
        for field in text_fields:
            if field in data and not isinstance(data[field], str):
                raise ValidationError({
                    field: "A string value is required."
                })

        now = timezone.now()
        actual_start = None
        actual_end = None

        if request.data.get("actual_start"):
            actual_start = parse_datetime(
                str(request.data["actual_start"])
            )
            if (
                not actual_start
                or timezone.is_naive(actual_start)
            ):
                raise ValidationError({
                    "actual_start": (
                        "Provide a valid timezone-aware ISO datetime."
                    )
                })

        if request.data.get("actual_end"):
            actual_end = parse_datetime(
                str(request.data["actual_end"])
            )
            if (
                not actual_end
                or timezone.is_naive(actual_end)
            ):
                raise ValidationError({
                    "actual_end": (
                        "Provide a valid timezone-aware ISO datetime."
                    )
                })

        with transaction.atomic():
            schedule = self._get_schedule(facility, schedule_id)

            schedule = SurgerySchedule.objects.select_for_update(of=("self",)).select_related(
                "service_request",
                "service_request__patient",
                "service_request__surgery_procedure",
                "ot_room",
                "ot_room__location",
            ).get(pk=schedule.pk)

            record, created = OTOperationRecord.objects.get_or_create(
                facility=facility,
                surgery_schedule=schedule,
                defaults={"status": "not_started"},
            )
            record = OTOperationRecord.objects.select_for_update().get(
                pk=record.pk
            )

            new_status = requested_status or record.status

            if record.status in {"completed", "cancelled"}:
                if new_status != record.status:
                    raise ValidationError({
                        "status": (
                            "A completed or cancelled operation "
                            "cannot be restarted."
                        )
                    })

            if new_status == "in_progress" and record.status != "in_progress":
                if schedule.status != "scheduled":
                    raise ValidationError({
                        "status": "Only scheduled surgeries can be started."
                    })

                try:
                    assessment = OTPreOperativeAssessment.objects.get(
                        facility=facility,
                        surgery_schedule=schedule,
                        deleted=False,
                    )
                except OTPreOperativeAssessment.DoesNotExist:
                    raise ValidationError({
                        "status": (
                            "Complete the pre-operative assessment "
                            "before starting the operation."
                        )
                    })

                if assessment.fitness_status != "fit":
                    raise ValidationError({
                        "status": (
                            "The patient must be marked fit for surgery "
                            "before the operation can start."
                        )
                    })

                if assessment.consent_status != "obtained":
                    raise ValidationError({
                        "status": (
                            "Patient consent must be obtained "
                            "before the operation can start."
                        )
                    })

                if not all([
                    assessment.patient_identity_verified,
                    assessment.procedure_verified,
                    assessment.surgical_site_verified,
                ]):
                    raise ValidationError({
                        "status": (
                            "Verify patient identity, procedure and "
                            "surgical site before starting."
                        )
                    })

                room = OTRoom.objects.select_for_update().get(
                    pk=schedule.ot_room_id
                )

                if room.status != "available":
                    raise ValidationError({
                        "status": "The OT room is not available."
                    })

                actual_start = actual_start or now
                if actual_end or record.actual_end:
                    raise ValidationError({
                        "actual_end": (
                            "An end time cannot be set while starting."
                        )
                    })

                room.status = "occupied"
                room.save(update_fields=["status", "modified_date"])

            if new_status == "completed":
                if record.status not in {"in_progress", "completed"}:
                    raise ValidationError({
                        "status": (
                            "Start the operation before marking it completed."
                        )
                    })

                actual_start = actual_start or record.actual_start
                if not actual_start:
                    raise ValidationError({
                        "actual_start": (
                            "Operation start time is required."
                        )
                    })

                actual_end = actual_end or record.actual_end or now

                if actual_end <= actual_start:
                    raise ValidationError({
                        "actual_end": (
                            "End time must be after the actual start time."
                        )
                    })

                room = OTRoom.objects.select_for_update().get(
                    pk=schedule.ot_room_id
                )
                room.status = "available"
                room.save(update_fields=["status", "modified_date"])

                schedule.status = "completed"
                schedule.save(update_fields=["status", "modified_date"])

            if new_status == "cancelled":
                if record.status == "in_progress":
                    raise ValidationError({
                        "status": (
                            "An operation in progress cannot be cancelled "
                            "from this screen. Record the clinical outcome "
                            "according to facility procedure."
                        )
                    })

                if record.status == "completed":
                    raise ValidationError({
                        "status": "A completed operation cannot be cancelled."
                    })

                schedule.status = "cancelled"
                schedule.save(update_fields=["status", "modified_date"])

            if new_status == "in_progress":
                record.actual_start = actual_start or record.actual_start or now
                record.actual_end = None

            elif new_status == "completed":
                record.actual_start = actual_start
                record.actual_end = actual_end

            elif new_status == "cancelled":
                record.actual_end = None

            record.status = new_status

            for field, value in data.items():
                setattr(record, field, value)

            record.save()

        return Response(
            {
                "message": (
                    "OT operation record created."
                    if created
                    else "OT operation record updated."
                ),
                "operation": self._operation_data(record),
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )
