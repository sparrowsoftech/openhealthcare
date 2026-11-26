from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from care.emr.api.viewsets.base import EMRModelViewSet
from care.emr.models import OTRoom, SurgeryProcedure, Anaesthesia, SurgeryAnaesthesiaConfig
from care.emr.models.patient import PatientIdentifier
from care.emr.models.service_request import ServiceRequest
from care.emr.models.organization import FacilityOrganization
from care.emr.models.location import FacilityLocation
from care.emr.resources.ot.spec import (
    OTRoomWriteSpec,
    OTRoomUpdateSpec,
    OTRoomListSpec,
    OTRoomRetrieveSpec,
    SurgeryProcedureWriteSpec,
    SurgeryProcedureUpdateSpec,
    SurgeryProcedureListSpec,
    SurgeryProcedureRetrieveSpec,
    AnaesthesiaWriteSpec,
    AnaesthesiaUpdateSpec,
    AnaesthesiaListSpec,
    AnaesthesiaRetrieveSpec,
    SurgeryAnaesthesiaConfigWriteSpec,
    SurgeryAnaesthesiaConfigUpdateSpec,
    SurgeryAnaesthesiaConfigListSpec,
    SurgeryAnaesthesiaConfigRetrieveSpec,
)
from care.facility.models import Facility
from care.security.authorization import AuthorizationController
from care.utils.shortcuts import get_object_or_404


class OTRoomViewSet(EMRModelViewSet):
    database_model = OTRoom
    pydantic_model = OTRoomWriteSpec
    pydantic_update_model = OTRoomUpdateSpec
    pydantic_read_model = OTRoomListSpec
    pydantic_retrieve_model = OTRoomRetrieveSpec

    def get_facility_obj(self):
        return get_object_or_404(
            Facility,
            external_id=self.kwargs["facility_external_id"],
        )

    def get_queryset(self):
        facility = self.get_facility_obj()

        return (
            super()
            .get_queryset()
            .filter(
                facility=facility,
                deleted=False,
            )
            .select_related("facility", "location")
            .order_by("location__name")
        )

    def validate_data(self, instance, model_obj=None):
        facility = self.get_facility_obj()

        location = get_object_or_404(
            FacilityLocation,
            external_id=instance.location,
            facility=facility,
            deleted=False,
            mode="instance",
            form="ro",
        )

        if location.status.lower() != "active":
            raise ValidationError(
                {
                    "location": (
                        "Selected room must be active in Location Master."
                    )
                }
            )

        # Validate selected procedures when the field is supplied.
        procedure_ids = instance.surgery_procedures

        if procedure_ids is not None:
            unique_procedure_ids = set(procedure_ids)

            active_procedures = SurgeryProcedure.objects.filter(
                facility=facility,
                external_id__in=unique_procedure_ids,
                deleted=False,
                status="active",
            )

            if active_procedures.count() != len(unique_procedure_ids):
                raise ValidationError(
                    {
                        "surgery_procedures": (
                            "Select only active surgery procedures "
                            "from this facility."
                        )
                    }
                )

        duplicate_qs = OTRoom.objects.filter(
            facility=facility,
            location=location,
            deleted=False,
        )

        if model_obj is not None:
            duplicate_qs = duplicate_qs.exclude(pk=model_obj.pk)

        if duplicate_qs.exists():
            raise ValidationError(
                {
                    "location": (
                        "OT Setup already exists for this room."
                    )
                }
            )

    def authorize_create(self, instance):
        facility = self.get_facility_obj()

        if not AuthorizationController.call(
            "can_create_facility_location_obj",
            self.request.user,
            None,
            facility,
        ):
            raise PermissionDenied(
                "You do not have permission to configure OT rooms."
            )

    def authorize_update(self, request_obj, model_instance):
        if not AuthorizationController.call(
            "can_update_facility_location_obj",
            self.request.user,
            model_instance,
        ):
            raise PermissionDenied(
                "You do not have permission to update OT Setup."
            )

    def authorize_destroy(self, instance):
        self.authorize_update({}, instance)

    def _save_surgery_procedures(self, instance):
        procedure_ids = getattr(
            instance,
            "_surgery_procedure_ids",
            None,
        )

        # None means the request did not supply this field.
        # An empty list clears all assigned procedures.
        if procedure_ids is not None:
            procedures = SurgeryProcedure.objects.filter(
                facility=instance.facility,
                external_id__in=procedure_ids,
                deleted=False,
                status="active",
            )
            instance.surgery_procedures.set(procedures)

    def perform_create(self, instance):
        instance.facility = self.get_facility_obj()

        with transaction.atomic():
            result = super().perform_create(instance)
            self._save_surgery_procedures(instance)

        return result

    def perform_update(self, instance):
        instance.facility = self.get_facility_obj()

        with transaction.atomic():
            result = super().perform_update(instance)
            self._save_surgery_procedures(instance)

        return result

    def perform_destroy(self, instance):
        instance.deleted = True
        instance.updated_by = self.request.user
        instance.save(
            update_fields=[
                "deleted",
                "updated_by",
                "modified_date",
            ]
        )


class SurgeryProcedureViewSet(EMRModelViewSet):
    database_model = SurgeryProcedure
    pydantic_model = SurgeryProcedureWriteSpec
    pydantic_update_model = SurgeryProcedureUpdateSpec
    pydantic_read_model = SurgeryProcedureListSpec
    pydantic_retrieve_model = SurgeryProcedureRetrieveSpec

    def get_facility_obj(self):
        return get_object_or_404(
            Facility,
            external_id=self.kwargs["facility_external_id"],
        )

    def get_queryset(self):
        facility = self.get_facility_obj()

        return (
            super()
            .get_queryset()
            .filter(facility=facility, deleted=False)
            .select_related("facility", "department")
            .order_by("procedure_name")
        )

    def validate_data(self, instance, model_obj=None):
        facility = self.get_facility_obj()

        get_object_or_404(
            FacilityOrganization,
            external_id=instance.department,
            facility=facility,
            # org_type="dept",
            active=True,
        )

        duplicate_qs = SurgeryProcedure.objects.filter(
            facility=facility,
            procedure_code=instance.procedure_code,
            deleted=False,
        )

        if model_obj is not None:
            duplicate_qs = duplicate_qs.exclude(pk=model_obj.pk)

        if duplicate_qs.exists():
            raise ValidationError(
                {
                    "procedure_code": (
                        "This procedure code already exists in this facility."
                    )
                }
            )

    def authorize_create(self, instance):
        facility = self.get_facility_obj()

        if not AuthorizationController.call(
            "can_create_facility_location_obj",
            self.request.user,
            None,
            facility,
        ):
            raise PermissionDenied(
                "You do not have permission to create surgery procedures."
            )

    def authorize_update(self, request_obj, model_instance):
        facility = self.get_facility_obj()

        if model_instance.facility_id != facility.id:
            raise PermissionDenied(
                "This configuration does not belong to the requested facility."
            )

        if not AuthorizationController.call(
            "can_manage_surgery_anaesthesia_config",
            self.request.user,
            facility,
        ):
            raise PermissionDenied(
                "You do not have permission to update "
                "surgery anaesthesia configurations."
            )

    def authorize_destroy(self, instance):
        self.authorize_update({}, instance)

    def perform_create(self, instance):
        instance.facility = self.get_facility_obj()
        return super().perform_create(instance)

    def perform_update(self, instance):
        instance.facility = self.get_facility_obj()
        return super().perform_update(instance)

    def perform_destroy(self, instance):
        instance.deleted = True
        instance.updated_by = self.request.user
        instance.save(
            update_fields=[
                "deleted",
                "updated_by",
                "modified_date",
            ]
        )

class AnaesthesiaViewSet(EMRModelViewSet):
    database_model = Anaesthesia
    pydantic_model = AnaesthesiaWriteSpec
    pydantic_update_model = AnaesthesiaUpdateSpec
    pydantic_read_model = AnaesthesiaListSpec
    pydantic_retrieve_model = AnaesthesiaRetrieveSpec

    def get_facility_obj(self):
        return get_object_or_404(
            Facility,
            external_id=self.kwargs["facility_external_id"],
        )

    def get_queryset(self):
        facility = self.get_facility_obj()

        return (
            super()
            .get_queryset()
            .filter(facility=facility, deleted=False)
            .select_related("facility")
            .order_by("anaesthesia_name")
        )

    def validate_data(self, instance, model_obj=None):
        facility = self.get_facility_obj()

        duplicate_qs = Anaesthesia.objects.filter(
            facility=facility,
            anaesthesia_code=instance.anaesthesia_code,
            deleted=False,
        )

        if model_obj is not None:
            duplicate_qs = duplicate_qs.exclude(pk=model_obj.pk)

        if duplicate_qs.exists():
            raise ValidationError(
                {
                    "anaesthesia_code": (
                        "This anaesthesia code already exists in this facility."
                    )
                }
            )

    def authorize_create(self, instance):
        facility = self.get_facility_obj()

        if not AuthorizationController.call(
            "can_create_facility_location_obj",
            self.request.user,
            None,
            facility,
        ):
            raise PermissionDenied(
                "You do not have permission to create anaesthesia methods."
            )

    def authorize_update(self, request_obj, model_instance):
        if not AuthorizationController.call(
            "can_update_facility_location_obj",
            self.request.user,
            model_instance,
        ):
            raise PermissionDenied(
                "You do not have permission to update anaesthesia methods."
            )

    def authorize_destroy(self, instance):
        self.authorize_update({}, instance)

    def perform_create(self, instance):
        instance.facility = self.get_facility_obj()
        return super().perform_create(instance)

    def perform_update(self, instance):
        instance.facility = self.get_facility_obj()
        return super().perform_update(instance)

    def perform_destroy(self, instance):
        instance.deleted = True
        instance.updated_by = self.request.user
        instance.save(
            update_fields=[
                "deleted",
                "updated_by",
                "modified_date",
            ]
        )


class SurgeryAnaesthesiaConfigViewSet(EMRModelViewSet):
    database_model = SurgeryAnaesthesiaConfig
    pydantic_model = SurgeryAnaesthesiaConfigWriteSpec
    pydantic_update_model = SurgeryAnaesthesiaConfigUpdateSpec
    pydantic_read_model = SurgeryAnaesthesiaConfigListSpec
    pydantic_retrieve_model = SurgeryAnaesthesiaConfigRetrieveSpec

    def get_facility_obj(self):
        return get_object_or_404(
            Facility,
            external_id=self.kwargs["facility_external_id"],
        )

    def get_queryset(self):
        facility = self.get_facility_obj()

        return (
            super()
            .get_queryset()
            .filter(
                facility=facility,
                deleted=False,
            )
            .select_related("facility", "surgery_procedure")
            .order_by(
                "surgery_procedure__procedure_name",
                "anaesthesia_format",
            )
        )

    def validate_data(self, instance, model_obj=None):
        facility = self.get_facility_obj()
        procedure_id = getattr(instance, "surgery_procedure", None)

        # surgery_procedure is a UUID in the write spec, not a model instance.
        procedure = SurgeryProcedure.objects.filter(
            external_id=procedure_id,
            facility=facility,
            deleted=False,
            status="active",
        ).first()

        if procedure is None:
            raise ValidationError(
                {
                    "surgery_procedure": (
                        "Select an active surgery procedure "
                        "belonging to this facility."
                    )
                }
            )

    def authorize_create(self, instance):
        facility = self.get_facility_obj()

        if not AuthorizationController.call(
            "can_create_facility_location_obj",
            self.request.user,
            None,
            facility,
        ):
            raise PermissionDenied(
                "You do not have permission to create "
                "surgery anaesthesia configurations."
            )

    def authorize_update(self, request_obj, model_instance):
        facility = self.get_facility_obj()

        # Do not allow updating a configuration through a different facility URL.
        if model_instance.facility_id != facility.id:
            raise PermissionDenied(
                "This configuration does not belong to the requested facility."
            )

        if not AuthorizationController.call(
            "can_manage_surgery_anaesthesia_config",
            self.request.user,
            facility,
        ):
            raise PermissionDenied(
                "You do not have permission to update "
                "surgery anaesthesia configurations."
            )

    def authorize_destroy(self, instance):
        self.authorize_update({}, instance)

    def perform_create(self, instance):
        instance.facility = self.get_facility_obj()
        return super().perform_create(instance)

    def perform_update(self, instance):
        instance.facility = self.get_facility_obj()
        return super().perform_update(instance)

    def perform_destroy(self, instance):
        instance.deleted = True
        instance.updated_by = self.request.user
        instance.save(
            update_fields=[
                "deleted",
                "updated_by",
                "modified_date",
            ]
        )


class OTWaitingListViewSet(GenericViewSet):
    """
    Returns active surgical ServiceRequests for the selected facility.
    Existing ServiceRequest records remain the source of truth.
    """

    def list(self, request, *args, **kwargs):
        facility = get_object_or_404(
            Facility,
            external_id=self.kwargs["facility_external_id"],
        )

        service_requests = (
            ServiceRequest.objects.filter(
                facility=facility,
                category="surgical_procedure",
                status="active",
                intent="order",
                do_not_perform=False,
                encounter__isnull=False,
            )
            .select_related(
                "patient",
                "encounter",
                "requester",
                "activity_definition",
                "surgery_procedure",
            )
            .order_by("-created_date", "-id")
        )

        # Apply ServiceRequest-level authorization before pagination.
        authorized_orders = [
            order
            for order in service_requests
            if AuthorizationController.call(
                "can_read_service_request",
                request.user,
                order,
            )
        ]

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(
            authorized_orders,
            request,
            view=self,
        )

        if page is None:
            page = authorized_orders

        patient_ids = {order.patient_id for order in page}

        identifiers_by_patient = {}
        identifiers = (
            PatientIdentifier.objects.filter(
                patient_id__in=patient_ids,
                config__facility=facility,
                config__status="active",
            )
            .select_related("config")
        )

        for identifier in identifiers:
            config_data = identifier.config.config or {}
            identifiers_by_patient.setdefault(
                identifier.patient_id, []
            ).append(
                {
                    "display": config_data.get("display", ""),
                    "use": config_data.get("use", ""),
                    "value": identifier.value,
                }
            )

        results = []

        for order in page:
            patient = order.patient
            patient_identifiers = identifiers_by_patient.get(patient.id, [])

            # Prefer an identifier explicitly labelled as Registration ID.
            registration_identifier = next(
                (
                    item
                    for item in patient_identifiers
                    if (
                        "registration" in item["display"].lower()
                        or item["display"].lower()
                        in {
                            "reg id",
                            "reg no",
                            "reg. no",
                            "reg code",
                            "registration no",
                            "registration number",
                        }
                    )
                ),
                None,
            )

            # If no registration-labelled config exists, use the official identifier.
            if registration_identifier is None:
                registration_identifier = next(
                    (
                        item
                        for item in patient_identifiers
                        if item["use"] == "official"
                    ),
                    None,
                )

            requester = order.requester
            doctor_name = None
            if requester:
                doctor_name = requester.get_full_name() or requester.username

            age = None
            if patient.date_of_birth or patient.year_of_birth:
                age = patient.age

            results.append(
                {
                    "id": str(order.external_id),
                    "service_request_id": str(order.external_id),
                    "patient_id": str(patient.external_id),
                    "registration_id": (
                        registration_identifier["value"]
                        if registration_identifier
                        else None
                    ),
                    "patient_name": patient.name,
                    "age": age,
                    "gender": patient.gender,
                    "surgery_procedure": (
                        order.surgery_procedure.procedure_name
                        if order.surgery_procedure
                        else order.title
                    ),
                    "procedure_code": (
                        order.surgery_procedure.procedure_code
                        if order.surgery_procedure
                        else None
                    ),
                    "doctor_name": doctor_name,
                    "requester_id": (
                        str(requester.external_id) if requester else None
                    ),
                    "order_date": (
                        order.created_date.isoformat()
                        if order.created_date
                        else None
                    ),
                    "priority": order.priority,
                    "encounter_id": (
                        str(order.encounter.external_id)
                        if order.encounter
                        else None
                    ),
                }
            )

        if paginator.get_limit(request) is not None:
            return paginator.get_paginated_response(results)

        return Response({"count": len(results), "results": results})
