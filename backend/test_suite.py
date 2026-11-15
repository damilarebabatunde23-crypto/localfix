import json
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.services.models import ServiceCategory, WorkerProfile
from apps.bookings.models import Booking
from apps.escrow.models import EscrowVault, EscrowTransaction
from apps.disputes.models import DisputeCase, ForensicAudit
from apps.marketplace.models import MarketplaceItem, MarketplaceSavedItem
from apps.feed.models import VideoPost, VideoComment
from apps.chat.models import Conversation, ChatMessage

User = get_user_model()

class LocalFixComprehensiveBackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.customer = User.objects.create_user(
            email='customer@test.com',
            password='testpassword123',
            first_name='Babatunde',
            last_name='Test',
            role='customer',
            is_verified=True
        )

        self.worker_user = User.objects.create_user(
            email='artisan@test.com',
            password='testpassword123',
            first_name='Tunde',
            last_name='Artisan',
            role='worker',
            is_verified=True
        )

        self.arbitrator = User.objects.create_user(
            email='arbitrator@test.com',
            password='testpassword123',
            first_name='Amina',
            last_name='Arbitrator',
            role='arbitrator',
            is_verified=True
        )

        # Category & Worker Profile
        self.category = ServiceCategory.objects.create(
            name='Electrician & Solar',
            slug='electrician',
            icon='⚡',
            color='#F59E0B'
        )

        self.worker_profile = WorkerProfile.objects.create(
            user=self.worker_user,
            profession='Master Solar Tech',
            category=self.category,
            callout_rate=Decimal('12000.00'),
            service_area='Ikeja GRA',
            rating=Decimal('4.95'),
            completed_jobs=50
        )

    # 1. AUTHENTICATION TESTS
    def test_auth_login_and_profile(self):
        # Login
        response = self.client.post('/api/auth/login/', {
            'email': 'customer@test.com',
            'password': 'testpassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        access_token = response.data['access']
        self.assertTrue(access_token)

        # Profile with JWT
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_res = self.client.get('/api/auth/profile/')
        self.assertEqual(profile_res.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_res.data['email'], 'customer@test.com')

    # 2. SERVICES & WORKERS TESTS
    def test_services_and_workers(self):
        cat_res = self.client.get('/api/services/categories/')
        self.assertEqual(cat_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(cat_res.data), 1)

        workers_res = self.client.get('/api/services/workers/?category=electrician')
        self.assertEqual(workers_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(workers_res.data['count'], 1)

        worker_detail = self.client.get(f'/api/services/workers/{self.worker_profile.id}/')
        self.assertEqual(worker_detail.status_code, status.HTTP_200_OK)
        self.assertEqual(worker_detail.data['display_name'], 'Tunde Artisan')

    # 3. BOOKINGS TESTS
    def test_bookings_flow(self):
        self.client.force_authenticate(user=self.customer)
        create_res = self.client.post('/api/bookings/', {
            'worker': str(self.worker_profile.id),
            'service_type': 'Inverter Diagnostics',
            'description': 'Inverter tripping on load',
            'location_address': 'Ikeja GRA',
            'preferred_date': '2026-11-05T10:00:00Z',
            'agreed_amount': '25000.00'
        })
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        booking_code = create_res.data['booking_code']
        self.assertTrue(booking_code.startswith('LX-'))

        # Update status
        status_res = self.client.post(f'/api/bookings/{booking_code}/status/', {
            'status': 'in_progress',
            'note': 'Technician arrived on site'
        })
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertEqual(status_res.data['booking']['status'], 'in_progress')

    # 4. ESCROW FINANCIAL TESTS (2.5% Fee & 99% Refund)
    def test_escrow_funding_and_release(self):
        self.client.force_authenticate(user=self.customer)
        # Fund Escrow
        fund_res = self.client.post('/api/escrow/vaults/fund/', {
            'worker_id': str(self.worker_profile.id),
            'total_amount': '50000.00',
            'service_description': 'Inverter Overhaul',
            'booking_code': 'LX-TEST-01',
            'payment_channel': 'bank'
        })
        self.assertEqual(fund_res.status_code, status.HTTP_201_CREATED)
        vault_ref = fund_res.data['vault_reference']
        self.assertTrue(fund_res.data['ledger_hash'])

        # Check Escrow breakdown: 2.5% platform fee = 1,250.00, net worker = 48,750.00
        vault_res = self.client.get(f'/api/escrow/vaults/{vault_ref}/')
        self.assertEqual(vault_res.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(vault_res.data['platform_fee_amount']), Decimal('1250.00'))
        self.assertEqual(Decimal(vault_res.data['net_worker_amount']), Decimal('48750.00'))

        # Release Escrow upon customer OTP
        release_res = self.client.post(f'/api/escrow/vaults/{vault_ref}/release/', {
            'otp': '7492'
        })
        self.assertEqual(release_res.status_code, status.HTTP_200_OK)
        self.assertEqual(release_res.data['settlement']['status'], 'fully_settled')

    def test_escrow_cancellation_and_99_percent_refund(self):
        self.client.force_authenticate(user=self.customer)
        fund_res = self.client.post('/api/escrow/vaults/fund/', {
            'worker_id': str(self.worker_profile.id),
            'total_amount': '100000.00',
            'service_description': 'Borehole Drilling',
            'booking_code': 'LX-TEST-02'
        })
        vault_ref = fund_res.data['vault_reference']

        # Cancel -> 1% admin fee (1,000.00), 99% client refund (99,000.00)
        cancel_res = self.client.post(f'/api/escrow/vaults/{vault_ref}/cancel/', {
            'reason': 'Artisan no-show',
            'client_nuban': '0123456789'
        })
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)
        refund_data = cancel_res.data['refund']
        self.assertEqual(refund_data['status'], 'cancelled')
        self.assertEqual(Decimal(str(refund_data['client_refund_sent'])), Decimal('99000.00'))
        self.assertEqual(Decimal(str(refund_data['cancellation_fee_retained'])), Decimal('1000.00'))

    # 5. DISPUTES & FORENSIC ARBITRATION TESTS
    def test_dispute_and_restitution(self):
        self.client.force_authenticate(user=self.customer)
        dispute = DisputeCase.objects.create(
            case_number='DSP-TEST-99',
            booking_code='LX-7829-INV',
            vault_reference='LF-ESC-9921',
            client=self.customer,
            worker=self.worker_user,
            arbitrator=self.arbitrator,
            disputed_amount=Decimal('32090.00'),
            issue_category='Inverter Tripping',
            description='Inrush overcurrent trip',
            status='in_mediation'
        )

        ForensicAudit.objects.create(
            dispute=dispute,
            auditor_name='Engr. Kehinde Balogun',
            verdict='fault_confirmed',
            insulation_resistance='0.12 MΩ (FAILED)',
            dielectric_breakdown='Hipot 1.5kV Failed'
        )

        # Get room metadata
        room_res = self.client.get('/api/disputes/DSP-TEST-99/room/')
        self.assertEqual(room_res.status_code, status.HTTP_200_OK)
        self.assertEqual(room_res.data['session_metadata']['escrow_frozen'], 32090.00)

        # Send mediation message
        msg_res = self.client.post('/api/disputes/DSP-TEST-99/messages/', {
            'content': 'Test mediation statement submitted'
        })
        self.assertEqual(msg_res.status_code, status.HTTP_201_CREATED)

        # Execute restitution
        rest_res = self.client.post('/api/disputes/DSP-TEST-99/restitution/')
        self.assertEqual(rest_res.status_code, status.HTTP_200_OK)
        self.assertEqual(rest_res.data['status'], 'restitution_executed')

    # 6. MARKETPLACE TESTS
    def test_marketplace_flow(self):
        self.client.force_authenticate(user=self.customer)
        create_res = self.client.post('/api/marketplace/items/', {
            'title': 'Bosch Spirit Level 125cm',
            'description': 'High precision level for masonry',
            'category': 'Hand Tools',
            'condition': 'like_new',
            'price': '12500.00',
            'location_name': 'Ikeja'
        })
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        item_id = create_res.data['id']

        # List items
        list_res = self.client.get('/api/marketplace/items/?category=Hand Tools')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(list_res.data['count'], 1)

        # Toggle save
        save_res = self.client.post(f'/api/marketplace/items/{item_id}/toggle-save/')
        self.assertEqual(save_res.status_code, status.HTTP_200_OK)
        self.assertTrue(save_res.data['saved'])

    # 7. VIDEO FEED TESTS
    def test_feed_flow(self):
        self.client.force_authenticate(user=self.worker_user)
        create_res = self.client.post('/api/feed/videos/', {
            'title': 'How to check breaker load',
            'description': 'Quick electrical guide',
            'category': 'Electrical',
            'video_url': 'https://example.com/video.mp4',
            'thumbnail_url': 'https://example.com/thumb.jpg',
            'hashtags': ['#Electrician', '#LocalFix']
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        vid_id = create_res.data['id']

        # View details
        detail_res = self.client.get(f'/api/feed/videos/{vid_id}/')
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data['views_count'], 1)

        # Toggle like
        like_res = self.client.post(f'/api/feed/videos/{vid_id}/like/')
        self.assertEqual(like_res.status_code, status.HTTP_200_OK)
        self.assertTrue(like_res.data['liked'])

        # Add comment
        comment_res = self.client.post(f'/api/feed/videos/{vid_id}/comments/', {
            'text': 'Great instructional breakdown!'
        })
        self.assertEqual(comment_res.status_code, status.HTTP_201_CREATED)

    # 8. CHAT MESSAGING TESTS
    def test_chat_flow(self):
        self.client.force_authenticate(user=self.customer)
        # Create or fetch conversation with worker
        conv_res = self.client.post('/api/chat/conversations/', {
            'recipient_id': str(self.worker_user.id)
        })
        self.assertEqual(conv_res.status_code, status.HTTP_200_OK)
        conv_id = conv_res.data['id']

        # Send message
        msg_res = self.client.post(f'/api/chat/conversations/{conv_id}/messages/', {
            'content': 'Hello, are you available for an inverter diagnostic?'
        })
        self.assertEqual(msg_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(msg_res.data['content'], 'Hello, are you available for an inverter diagnostic?')

        # Mark read
        read_res = self.client.post(f'/api/chat/conversations/{conv_id}/read/')
        self.assertEqual(read_res.status_code, status.HTTP_200_OK)

    # 9. AI ASSISTANT DIAGNOSTIC TRIAGE TESTS
    def test_assistant_diagnostic_triage(self):
        # AC Rattle Query
        chat_res = self.client.post('/api/assistant/chat/', {
            'message': 'My AC makes a loud rattling noise and cooling has dropped'
        })
        self.assertEqual(chat_res.status_code, status.HTTP_200_OK)
        self.assertEqual(chat_res.data['category'], 'ac-fridge')
        self.assertIn('Diagnostic Triage', chat_res.data['reply'])
        self.assertTrue(len(chat_res.data['diagnostic_checks']) > 0)

        # Inverter Tripping Query
        inverter_res = self.client.post('/api/assistant/chat/', {
            'message': 'My 5kVA Felicity inverter trips with an F04 fault when borehole pump runs'
        })
        self.assertEqual(inverter_res.status_code, status.HTTP_200_OK)
        self.assertEqual(inverter_res.data['category'], 'electrician')
        self.assertIn('Motor Inrush', inverter_res.data['reply'])

        # Prompts endpoint
        prompts_res = self.client.get('/api/assistant/prompts/')
        self.assertEqual(prompts_res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(prompts_res.data['prompts']) > 0)
