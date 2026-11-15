import uuid
from decimal import Decimal
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.core.exceptions import ValidationError
from .models import Booking, BookingEvent
from .serializers import BookingSerializer

def get_booking_by_ref(ref):
    booking = Booking.objects.filter(booking_code=ref).prefetch_related('events').first()
    if booking:
        return booking
    try:
        uuid.UUID(str(ref))
        return Booking.objects.filter(id=ref).prefetch_related('events').first()
    except (ValueError, TypeError, ValidationError):
        return None

class BookingListCreateView(generics.ListCreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'worker_profile'):
            return Booking.objects.filter(Q(worker=user.worker_profile) | Q(customer=user)).distinct()
        return Booking.objects.filter(customer=user)

    def perform_create(self, serializer):
        booking = serializer.save(customer=self.request.user)
        BookingEvent.objects.create(
            booking=booking,
            event_type='requested',
            description=f"Service booking {booking.booking_code} requested for {booking.service_type}."
        )

        try:
            from apps.authentication.models import Notification
            # Notify worker
            if booking.worker and booking.worker.user:
                Notification.objects.create(
                    user=booking.worker.user,
                    title=f"New Service Booking: {booking.service_type}",
                    body=f"Client {self.request.user.full_name or 'Client'} requested booking #{booking.booking_code} for ₦{float(booking.agreed_amount):,.2f}.",
                    notification_type='job',
                    action_url=f"/booking/{booking.booking_code}"
                )
            # Notify customer
            Notification.objects.create(
                user=self.request.user,
                title=f"Booking Submitted: #{booking.booking_code}",
                body=f"Your booking for '{booking.service_type}' has been submitted. Fund escrow to secure the artisan's arrival.",
                notification_type='job',
                action_url=f"/escrow/fund?booking={booking.booking_code}"
            )
        except Exception:
            pass

class BookingDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        code = self.kwargs.get('booking_code')
        booking = get_booking_by_ref(code)
        if not booking:
            return get_object_or_404(Booking, booking_code=code)
        return booking

class UpdateBookingStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_code):
        booking = get_booking_by_ref(booking_code)
        if not booking:
            booking = get_object_or_404(Booking, booking_code=booking_code)

        new_status = request.data.get('status')
        note = request.data.get('note', '')

        valid_statuses = [choice[0] for choice in Booking.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': f"Invalid status. Choose from: {valid_statuses}"}, status=status.HTTP_400_BAD_REQUEST)

        old_status = booking.status
        booking.status = new_status
        booking.save()

        event_desc = note or f"Status changed from {old_status} to {new_status} by {request.user.first_name}."
        BookingEvent.objects.create(
            booking=booking,
            event_type=new_status,
            description=event_desc
        )

        return Response({
            'message': f"Booking status updated to {new_status}.",
            'booking': BookingSerializer(booking).data
        }, status=status.HTTP_200_OK)


class RequestPriceAdjustmentView(APIView):
    """
    Called when an artisan on-site diagnoses extra damage or needed spare parts.
    Submits an itemized adjustment request for client approval.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_code):
        booking = get_booking_by_ref(booking_code)
        if not booking:
            booking = get_object_or_404(Booking, booking_code=booking_code)

        parts_cost = Decimal(str(request.data.get('parts_cost', '0.00')))
        labor_cost = Decimal(str(request.data.get('labor_cost', '0.00')))
        reason = request.data.get('reason', '').strip()
        proof_url = request.data.get('proof_url', '').strip()

        if not reason:
            return Response({'error': 'Please provide a clear reason or description of parts needed.'}, status=status.HTTP_400_BAD_REQUEST)

        total_adjustment = parts_cost + labor_cost
        if total_adjustment <= Decimal('0.00'):
            return Response({'error': 'Price adjustment amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        booking.price_adjustment_status = 'pending'
        booking.price_adjustment_parts_cost = parts_cost
        booking.price_adjustment_labor_cost = labor_cost
        booking.price_adjustment_amount = total_adjustment
        booking.price_adjustment_reason = reason
        booking.price_adjustment_proof_url = proof_url
        booking.price_adjustment_requested_at = timezone.now()
        booking.save()

        BookingEvent.objects.create(
            booking=booking,
            event_type='price_adjustment_requested',
            description=f"Price adjustment of {booking.currency} {total_adjustment:,.2f} requested by {request.user.first_name} for spare parts/extra work. Reason: {reason}"
        )

        try:
            from apps.authentication.models import Notification
            # Notify the customer
            target_user = booking.customer
            Notification.objects.create(
                user=target_user,
                title="Spare Parts / Price Adjustment Request",
                body=f"Artisan requested an adjustment of {booking.currency} {total_adjustment:,.2f} for '{reason[:50]}...'. Please review & approve.",
                notification_type='job',
                action_url=f"/booking/{booking.booking_code}"
            )
        except Exception:
            pass

        return Response({
            'message': f"Price adjustment of {booking.currency} {total_adjustment:,.2f} requested successfully.",
            'booking': BookingSerializer(booking).data
        }, status=status.HTTP_200_OK)


class RespondPriceAdjustmentView(APIView):
    """
    Called by the client to approve or decline the technician's price revision.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_code):
        booking = get_booking_by_ref(booking_code)
        if not booking:
            booking = get_object_or_404(Booking, booking_code=booking_code)

        decision = request.data.get('decision', '').lower()
        if decision not in ['approved', 'declined']:
            return Response({'error': "Decision must be 'approved' or 'declined'."}, status=status.HTTP_400_BAD_REQUEST)

        if booking.price_adjustment_status != 'pending':
            return Response({'error': "No pending price adjustment found on this booking."}, status=status.HTTP_400_BAD_REQUEST)

        booking.price_adjustment_status = decision
        booking.price_adjustment_responded_at = timezone.now()

        if decision == 'approved':
            booking.agreed_amount += booking.price_adjustment_amount
            booking.platform_fee = (booking.agreed_amount * Decimal('0.025')).quantize(Decimal('0.01'))
            booking.save()

            BookingEvent.objects.create(
                booking=booking,
                event_type='price_adjustment_approved',
                description=f"Client {request.user.first_name} approved price adjustment (+{booking.currency} {booking.price_adjustment_amount:,.2f}). New agreed total: {booking.currency} {booking.agreed_amount:,.2f}."
            )

            try:
                from apps.authentication.models import Notification
                if booking.worker and booking.worker.user:
                    Notification.objects.create(
                        user=booking.worker.user,
                        title="Price Adjustment Approved!",
                        body=f"Client approved your price adjustment! Total job amount is now {booking.currency} {booking.agreed_amount:,.2f}.",
                        notification_type='job',
                        action_url=f"/booking/{booking.booking_code}"
                    )
            except Exception:
                pass

            msg = f"Price adjustment approved. Total amount updated to {booking.currency} {booking.agreed_amount:,.2f}."
        else:
            booking.save()
            BookingEvent.objects.create(
                booking=booking,
                event_type='price_adjustment_declined',
                description=f"Client {request.user.first_name} declined the price adjustment request."
            )

            try:
                from apps.authentication.models import Notification
                if booking.worker and booking.worker.user:
                    Notification.objects.create(
                        user=booking.worker.user,
                        title="Price Adjustment Declined",
                        body=f"Client declined the price adjustment request. Please coordinate directly via chat.",
                        notification_type='job',
                        action_url=f"/booking/{booking.booking_code}"
                    )
            except Exception:
                pass

            msg = "Price adjustment declined."

        return Response({
            'message': msg,
            'booking': BookingSerializer(booking).data
        }, status=status.HTTP_200_OK)


class ConfirmDirectPaymentView(APIView):
    """
    Called when customer and artisan meet physically on-site and settle via Cash,
    Direct Bank Transfer, or a mobile payment app (Zelle, CashApp, Venmo, Revolut, Monzo, OPay, etc.).
    Records official in-person settlement, generates digital invoice, and completes job.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_code):
        booking = get_booking_by_ref(booking_code)
        if not booking:
            booking = get_object_or_404(Booking, booking_code=booking_code)

        party = request.data.get('party', 'customer') # 'customer' or 'worker'
        payment_method_used = request.data.get('method', 'Direct Transfer / Cash')
        note = request.data.get('note', '').strip()

        if party == 'worker' or (hasattr(request.user, 'worker_profile') and booking.worker == request.user.worker_profile):
            booking.direct_paid_worker_confirmed = True
        else:
            booking.direct_paid_customer_confirmed = True

        booking.payment_method = 'direct_settlement'
        booking.direct_payment_note = f"Paid via {payment_method_used}. {note}".strip()

        # If either artisan confirms receipt OR customer confirms physical settlement:
        if booking.direct_paid_worker_confirmed or booking.direct_paid_customer_confirmed:
            booking.payment_status = 'direct_settled'
            booking.status = 'completed'
            booking.direct_settled_at = timezone.now()
            
            # Increment worker completed jobs
            try:
                booking.worker.completed_jobs += 1
                booking.worker.save()
            except Exception:
                pass

        booking.save()

        BookingEvent.objects.create(
            booking=booking,
            event_type='direct_payment_settled',
            description=f"In-person physical settlement confirmed via {payment_method_used} by {request.user.first_name}. Digital invoice generated."
        )

        try:
            from apps.authentication.models import Notification
            notify_target = booking.customer if request.user != booking.customer else (booking.worker.user if booking.worker else None)
            if notify_target:
                Notification.objects.create(
                    user=notify_target,
                    title="Direct In-Person Payment Confirmed",
                    body=f"Payment of {booking.currency} {booking.agreed_amount:,.2f} settled via {payment_method_used}. Job marked completed!",
                    notification_type='job',
                    action_url=f"/booking/{booking.booking_code}"
                )
        except Exception:
            pass

        return Response({
            'message': f"In-person payment confirmed successfully. Job marked as completed.",
            'booking': BookingSerializer(booking).data
        }, status=status.HTTP_200_OK)


class UpdateWorkerLiveLocationView(APIView):
    """
    Called periodically by the worker's device (watchPosition) or employer dispatcher
    to stream live real-world GPS coordinates (Uber/InDrive style).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_code):
        booking = get_booking_by_ref(booking_code)
        if not booking:
            booking = get_object_or_404(Booking, booking_code=booking_code)

        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        speed = request.data.get('speed', 0.0)
        heading = request.data.get('heading', 0.0)
        new_transit_status = request.data.get('transit_status')

        if lat is not None and lng is not None:
            booking.worker_current_latitude = float(lat)
            booking.worker_current_longitude = float(lng)
            # Sync worker profile coordinates
            if booking.worker:
                try:
                    booking.worker.latitude = float(lat)
                    booking.worker.longitude = float(lng)
                    booking.worker.save()
                except Exception:
                    pass

        if speed is not None:
            booking.transit_speed_kmh = float(speed)
        if heading is not None:
            booking.transit_heading_deg = float(heading)

        booking.transit_updated_at = timezone.now()

        old_transit_status = booking.transit_status
        if new_transit_status in ['idle', 'dispatched', 'en_route', 'arrived']:
            booking.transit_status = new_transit_status

            if new_transit_status == 'en_route' and old_transit_status != 'en_route':
                booking.status = 'in_progress'
                BookingEvent.objects.create(
                    booking=booking,
                    event_type='transit_en_route',
                    description=f"Technician {booking.worker.user.full_name} is en route to job destination."
                )
                try:
                    from apps.authentication.models import Notification
                    Notification.objects.create(
                        user=booking.customer,
                        title="Technician En Route!",
                        body=f"{booking.worker.user.full_name} is driving to your location. Track their live movement on the map.",
                        notification_type='job',
                        action_url=f"/booking/{booking.booking_code}"
                    )
                except Exception:
                    pass

            elif new_transit_status == 'arrived' and old_transit_status != 'arrived':
                BookingEvent.objects.create(
                    booking=booking,
                    event_type='transit_arrived',
                    description=f"Technician {booking.worker.user.full_name} has arrived at customer destination."
                )
                try:
                    from apps.authentication.models import Notification
                    Notification.objects.create(
                        user=booking.customer,
                        title="Technician Has Arrived!",
                        body=f"{booking.worker.user.full_name} is at your doorstep for #{booking.booking_code}.",
                        notification_type='job',
                        action_url=f"/booking/{booking.booking_code}"
                    )
                except Exception:
                    pass

        booking.save()

        return Response({
            'message': 'Telemetry updated',
            'latitude': booking.worker_current_latitude,
            'longitude': booking.worker_current_longitude,
            'transit_status': booking.transit_status,
            'speed_kmh': booking.transit_speed_kmh,
            'heading_deg': booking.transit_heading_deg,
            'updated_at': booking.transit_updated_at,
        }, status=status.HTTP_200_OK)
