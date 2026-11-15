from django.urls import path
from .views import (
    BookingListCreateView,
    BookingDetailView,
    UpdateBookingStatusView,
    RequestPriceAdjustmentView,
    RespondPriceAdjustmentView,
    ConfirmDirectPaymentView,
    UpdateWorkerLiveLocationView,
)

urlpatterns = [
    path('', BookingListCreateView.as_view(), name='booking_list_create'),
    path('<str:booking_code>/', BookingDetailView.as_view(), name='booking_detail'),
    path('<str:booking_code>/status/', UpdateBookingStatusView.as_view(), name='booking_update_status'),
    path('<str:booking_code>/price-adjustment/request/', RequestPriceAdjustmentView.as_view(), name='booking_price_adjustment_request'),
    path('<str:booking_code>/price-adjustment/respond/', RespondPriceAdjustmentView.as_view(), name='booking_price_adjustment_respond'),
    path('<str:booking_code>/direct-payment/confirm/', ConfirmDirectPaymentView.as_view(), name='booking_direct_payment_confirm'),
    path('<str:booking_code>/live-location/', UpdateWorkerLiveLocationView.as_view(), name='booking_update_live_location'),
]
