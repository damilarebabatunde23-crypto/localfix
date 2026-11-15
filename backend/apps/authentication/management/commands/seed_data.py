import uuid
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.authentication.models import User
from apps.services.models import ServiceCategory, WorkerProfile, PortfolioItem, Review
from apps.bookings.models import Booking, BookingEvent
from apps.escrow.models import EscrowVault, EscrowTransaction
from apps.disputes.models import DisputeCase, ForensicAudit, MediationMessage
from apps.marketplace.models import MarketplaceItem, MarketplaceSavedItem
from apps.feed.models import VideoPost, VideoComment, VideoLike
from apps.chat.models import Conversation, ChatMessage
from apps.escrow.services import generate_ledger_hash

class Command(BaseCommand):
    help = 'Seeds initial LocalFix database with full categories, vetted artisans, resident users, escrow vault, marketplace listings, video feed, chat conversations, and forensic disputes.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting LocalFix seed data generation...'))

        # 1. Superuser / Admin
        admin, _ = User.objects.get_or_create(
            email='admin@localfix.ng',
            defaults={
                'first_name': 'LocalFix',
                'last_name': 'Administrator',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
                'is_verified': True,
            }
        )
        admin.set_password('admin123')
        admin.save()
        self.stdout.write(self.style.SUCCESS('[OK] Admin superuser created (admin@localfix.ng / admin123)'))

        # 2. Resident Customer (Babatunde Ogundimu)
        babatunde, _ = User.objects.get_or_create(
            email='babatunde.o@gmail.com',
            defaults={
                'first_name': 'Babatunde',
                'last_name': 'Ogundimu',
                'phone': '+234 803 491 8820',
                'role': 'customer',
                'is_verified': True,
                'nin_verified': True,
                'location_name': 'Ikeja GRA, Lagos',
                'latitude': 6.5916,
                'longitude': 3.3575,
                'avatar_url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face',
                'tier': 'Tier 3 Gold Resident',
            }
        )
        babatunde.set_password('password123')
        babatunde.save()
        self.stdout.write(self.style.SUCCESS('[OK] Resident user created (babatunde.o@gmail.com / password123)'))

        # 3. Arbitrator (Engr. Kehinde Balogun & Amina Bello)
        arbitrator, _ = User.objects.get_or_create(
            email='arbitrator@localfix.ng',
            defaults={
                'first_name': 'Kehinde',
                'last_name': 'Balogun',
                'phone': '+234 802 334 1190',
                'role': 'arbitrator',
                'is_verified': True,
                'location_name': 'Victoria Island, Lagos',
                'avatar_url': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=face',
                'tier': 'COREN Senior Forensic Arbitrator',
            }
        )
        arbitrator.set_password('password123')
        arbitrator.save()

        referee_amina, _ = User.objects.get_or_create(
            email='amina.bello@localfix.ng',
            defaults={
                'first_name': 'Amina',
                'last_name': 'Bello',
                'phone': '+234 803 992 0188',
                'role': 'arbitrator',
                'is_verified': True,
                'location_name': 'Lagos Sector #04',
                'avatar_url': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&h=160&fit=crop&crop=face',
                'tier': 'Presiding Dispute Arbitrator',
            }
        )
        referee_amina.set_password('password123')
        referee_amina.save()

        # 4. Categories
        categories_data = [
            {'name': 'Electrician & Solar', 'slug': 'electrician', 'icon': '⚡', 'color': '#F59E0B', 'order': 1},
            {'name': 'Plumber & Pipe', 'slug': 'plumber', 'icon': '🔧', 'color': '#3B82F6', 'order': 2},
            {'name': 'AC & Fridge', 'slug': 'ac-fridge', 'icon': '❄️', 'color': '#06B6D4', 'order': 3},
            {'name': 'Carpenter & Joinery', 'slug': 'carpenter', 'icon': '🪵', 'color': '#92400E', 'order': 4},
            {'name': 'Generator Mechanic', 'slug': 'mechanic', 'icon': '⚙️', 'color': '#6B7280', 'order': 5},
            {'name': 'Painter & POP', 'slug': 'painter', 'icon': '🎨', 'color': '#EC4899', 'order': 6},
            {'name': 'Welder & Iron Gate', 'slug': 'welder', 'icon': '🔩', 'color': '#EF4444', 'order': 7},
            {'name': 'Fumigation & Clean', 'slug': 'cleaning', 'icon': '🧹', 'color': '#10B981', 'order': 8},
        ]
        cat_map = {}
        for c in categories_data:
            cat_obj, _ = ServiceCategory.objects.get_or_create(slug=c['slug'], defaults=c)
            cat_map[c['slug']] = cat_obj
        self.stdout.write(self.style.SUCCESS('[OK] 8 Core Trade Categories generated'))

        # 5. Artisans
        workers_data = [
            {
                'email': 'tunde.adewale@localfix.ng',
                'first_name': 'Tunde',
                'last_name': 'Adewale',
                'phone': '+234 803 118 4920',
                'avatar': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop&crop=face',
                'profession': 'Master Solar & Inverter Specialist',
                'category': cat_map['electrician'],
                'service_area': 'GRA & Lekki Phase 1',
                'callout_rate': Decimal('12000.00'),
                'rating': Decimal('4.96'),
                'review_count': 64,
                'completed_jobs': 148,
                'lat': 6.6018,
                'lng': 3.3515,
                'specialisms': ['Lithium Battery Racks', 'Smart Distribution Boards', 'Wiring Audit'],
                'bio': 'COREN certified electrical specialist with 9 years of pure copper contact installations, hybrid ATS inverters, and battery management systems.'
            },
            {
                'email': 'ngozi.chukwu@localfix.ng',
                'first_name': 'Ngozi',
                'last_name': 'Chukwu',
                'phone': '+234 805 229 3014',
                'avatar': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=face',
                'profession': 'Dual Inverter AC & Industrial Chillers',
                'category': cat_map['ac-fridge'],
                'service_area': 'Ikeja & Surulere',
                'callout_rate': Decimal('9500.00'),
                'rating': Decimal('4.92'),
                'review_count': 112,
                'completed_jobs': 219,
                'lat': 6.5480,
                'lng': 3.3515,
                'specialisms': ['Freon Gas Recharge', 'Compressor Overhaul', 'Leak Sealing'],
                'bio': 'Certified HVAC master specializing in Daikin, LG Smart Inverter, and commercial VRF outdoor chiller synchronization.'
            },
            {
                'email': 'ibrahim.musa@localfix.ng',
                'first_name': 'Ibrahim',
                'last_name': 'Musa',
                'phone': '+234 802 884 1029',
                'avatar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face',
                'profession': 'Hydrojetting & Borehole Pumps',
                'category': cat_map['plumber'],
                'service_area': 'Lagos Mainland',
                'callout_rate': Decimal('10000.00'),
                'rating': Decimal('4.88'),
                'review_count': 48,
                'completed_jobs': 94,
                'lat': 6.5144,
                'lng': 3.3534,
                'specialisms': ['Underground Leak Detect', 'Pressure Boosting', 'PPR Piping'],
                'bio': 'Precision plumbing engineer with calibrated acoustic leak detection and high-pressure manifold installations.'
            },
            {
                'email': 'emeka.okafor@localfix.ng',
                'first_name': 'Emeka',
                'last_name': 'Okafor',
                'phone': '+234 803 771 9022',
                'avatar': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=face',
                'profession': 'Custom Cabinetry, Roofing & Locksmith',
                'category': cat_map['carpenter'],
                'service_area': 'Lekki & Victoria Island',
                'callout_rate': Decimal('8000.00'),
                'rating': Decimal('4.89'),
                'review_count': 37,
                'completed_jobs': 61,
                'lat': 6.4281,
                'lng': 3.4219,
                'specialisms': ['Roof Leak Truss Repair', 'High Security Smart Locks'],
                'bio': 'Roof leak truss repair, high-security smart locks, and bespoke moisture-resistant cabinetry.'
            }
        ]

        worker_instances = {}
        for w in workers_data:
            user, _ = User.objects.get_or_create(
                email=w['email'],
                defaults={
                    'first_name': w['first_name'],
                    'last_name': w['last_name'],
                    'phone': w['phone'],
                    'role': 'worker',
                    'is_verified': True,
                    'nin_verified': True,
                    'avatar_url': w['avatar'],
                    'location_name': w['service_area'],
                    'latitude': w['lat'],
                    'longitude': w['lng'],
                }
            )
            user.set_password('password123')
            user.save()

            wp, _ = WorkerProfile.objects.get_or_create(
                user=user,
                defaults={
                    'profession': w['profession'],
                    'category': w['category'],
                    'service_area': w['service_area'],
                    'callout_rate': w['callout_rate'],
                    'rating': w['rating'],
                    'review_count': w['review_count'],
                    'completed_jobs': w['completed_jobs'],
                    'latitude': w['lat'],
                    'longitude': w['lng'],
                    'specialisms': w['specialisms'],
                    'bio': w['bio'],
                }
            )
            worker_instances[w['first_name']] = (user, wp)

            # Add sample portfolio item
            PortfolioItem.objects.get_or_create(
                worker=wp,
                title=f"{w['profession']} Primary Showcase",
                defaults={
                    'category': w['category'].name,
                    'location': w['service_area'],
                    'image_url': 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop',
                    'description': 'High-spec installation verified by LocalFix forensic standards.'
                }
            )

        tunde_user, tunde_wp = worker_instances['Tunde']
        ngozi_user, ngozi_wp = worker_instances['Ngozi']
        self.stdout.write(self.style.SUCCESS('[OK] Vetted trade artisans & portfolios generated'))

        # 6. Bookings
        booking_inv, _ = Booking.objects.get_or_create(
            booking_code='LX-7829-INV',
            defaults={
                'customer': babatunde,
                'worker': tunde_wp,
                'service_type': '5kVA Pure Sine Wave Inverter Contactor Overhaul',
                'description': 'Inverter tripping on inductive startup load (1.5HP borehole pump). Replaced relay and contactor.',
                'location_address': 'Plot 12, Isaac John Street, Ikeja GRA, Lagos',
                'preferred_date': timezone.now() - timezone.timedelta(days=2),
                'status': 'disputed',
                'quoted_amount': Decimal('32090.00'),
                'agreed_amount': Decimal('32090.00'),
                'platform_fee': Decimal('802.25'),
            }
        )

        booking_hvac, _ = Booking.objects.get_or_create(
            booking_code='LX-2841-HVAC',
            defaults={
                'customer': babatunde,
                'worker': ngozi_wp,
                'service_type': 'Dual Inverter Split AC Diagnostics & Gas Recharge',
                'description': 'AC makes rattling noise on startup, cooling efficiency down 40%.',
                'location_address': 'Plot 12, Isaac John Street, Ikeja GRA, Lagos',
                'preferred_date': timezone.now() + timezone.timedelta(days=1),
                'status': 'escrow_funded',
                'quoted_amount': Decimal('28500.00'),
                'agreed_amount': Decimal('28500.00'),
                'platform_fee': Decimal('712.50'),
            }
        )
        self.stdout.write(self.style.SUCCESS('[OK] Sample Bookings seeded (LX-7829-INV, LX-2841-HVAC)'))

        # 7. Escrow Vaults (Reflecting 2.5% platform fee rules)
        vault_inv, _ = EscrowVault.objects.get_or_create(
            vault_reference='LF-ESC-9921',
            defaults={
                'booking_code': 'LX-7829-INV',
                'client': babatunde,
                'worker': tunde_user,
                'total_amount': Decimal('32090.00'),
                'platform_fee_percent': Decimal('2.50'),
                'cancellation_fee_percent': Decimal('1.00'),
                'status': 'disputed',
                'service_description': '5kVA Felicity Inverter Contactor & Inductive Load Relay Replacement',
                'settlement_nuban': '0192837465',
                'client_refund_nuban': '0482910394 (GTBank Ikeja)',
            }
        )
        if not EscrowTransaction.objects.filter(vault=vault_inv).exists():
            tx_hash = generate_ledger_hash(vault_inv.vault_reference, 'deposit', vault_inv.total_amount)
            EscrowTransaction.objects.create(
                vault=vault_inv,
                transaction_type='client_deposit',
                amount=vault_inv.total_amount,
                recipient_nuban='Providus Virtual Vault',
                ledger_hash=tx_hash,
                note='Initial customer deposit held in secured escrow custody.'
            )

        vault_hvac, _ = EscrowVault.objects.get_or_create(
            vault_reference='LF-ESC-7829',
            defaults={
                'booking_code': 'LX-2841-HVAC',
                'client': babatunde,
                'worker': ngozi_user,
                'total_amount': Decimal('28500.00'),
                'platform_fee_percent': Decimal('2.50'),
                'cancellation_fee_percent': Decimal('1.00'),
                'status': 'funded',
                'service_description': 'Dual Inverter Split AC Diagnostics & Gas Recharge',
                'settlement_nuban': '0581928374',
                'client_refund_nuban': '0482910394 (GTBank Ikeja)',
            }
        )
        self.stdout.write(self.style.SUCCESS('[OK] Active Escrow Vaults seeded (LF-ESC-9921, LF-ESC-7829)'))

        # 8. Dispute Case & Forensic Audit (Matching Frontend Live Mediation Room)
        dispute, _ = DisputeCase.objects.get_or_create(
            case_number='DSP-84920',
            defaults={
                'booking_code': 'LX-7829-INV',
                'vault_reference': 'LF-ESC-9921',
                'booking': booking_inv,
                'client': babatunde,
                'worker': tunde_user,
                'arbitrator': referee_amina,
                'disputed_amount': Decimal('32090.00'),
                'issue_category': '5kVA Felicity Inverter Tripping under Inductive Load',
                'description': 'Customer reported that as soon as the 1.5HP submersible borehole pump starts, the 5kVA Felicity inverter trips with an F04 Overcurrent Inrush Fault.',
                'status': 'in_mediation',
                'resolution_pathway': 'Tri-Party Arbitral Mediation & Restitution',
            }
        )

        ForensicAudit.objects.get_or_create(
            dispute=dispute,
            defaults={
                'auditor_name': 'Engr. Kehinde Balogun',
                'coren_registration': 'MNSE, COREN Reg: 44,192',
                'verdict': 'fault_confirmed',
                'insulation_resistance': '0.12 MΩ (FAILED - Below 1.0 MΩ standard)',
                'dielectric_breakdown': 'Hipot 1.5kV - 4.2mA Leakage (FAILED)',
                'harmonic_distortion': 'THD 8.4% (BORDERLINE)',
                'loop_impedance': '0.42 Ω (PASSED)',
                'instrumentation': 'Megger MIT410, Fluke 435-II, FLIR E8-XT',
                'enforceable_remedy': '100% Client Escrow Restitution (₦32,090.00) plus Guild Disciplinary Demerit.'
            }
        )

        # Seed Mediation Messages matching LiveMediationRoomPage
        if not MediationMessage.objects.filter(dispute=dispute).exists():
            MediationMessage.objects.create(
                dispute=dispute,
                sender=referee_amina,
                content='Welcome Babatunde and Engineer Tunde. I am Amina, presiding arbitrator for Ikeja Sector #04. LocalFix currently holds ₦32,090.00 in secured cryptographic escrow. Our technical bylaws mandate a 48-hour warranty rectification or a 100% escrow restitution to the homeowner wallet. We will evaluate the inverter telemetry and pump inrush load curves. Please present your observations sequentially.',
                attachment_url=None,
                is_system_event=False
            )
            MediationMessage.objects.create(
                dispute=dispute,
                sender=babatunde,
                content="Thank you Madam Amina. Here is the exact issue: as soon as the 1.5HP submersible borehole pump starts, the 5kVA Felicity inverter trips instantly with an F04 Fault (Overcurrent Inrush). I had to run the diesel generator to have running water this morning. I've attached the breaker test recording and the live voltage dip monitor clip.",
                attachment_url='https://localfix.ng/cdn/evidence/Fault_F04_PumpTrip.mp4',
                is_system_event=False
            )
            MediationMessage.objects.create(
                dispute=dispute,
                sender=tunde_user,
                content="Understood Madam Amina. The 5kVA Felicity pure sine inverter inverter was configured correctly for normal resistive loads. However, the customer's borehole pump motor draws high inductive startup current exceeding 25A surge without an electronic soft-start module. I am ready to review the bench report.",
                attachment_url=None,
                is_system_event=False
            )
        self.stdout.write(self.style.SUCCESS('[OK] Live Dispute Dossier & Forensic Audit seeded (DSP-84920)'))

        # 9. P2P Marketplace Items
        marketplace_data = [
            {
                'title': 'DeWalt 20V Max Hammer Drill + 2 Batteries',
                'category': 'Power Tools',
                'condition': 'like_new',
                'price': Decimal('48500.00'),
                'location_name': 'Ogba GRA, Ikeja • 2.4km away',
                'images': ['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=300&fit=crop'],
                'description': 'Original brushless motor unit with dual charger and hard case. Rarely used on single residential drywall project. Tested 100% operational.',
                'pickup_options': ['pickup'],
                'is_inspection_ready': True,
                'seller': tunde_user,
            },
            {
                'title': 'Firman 3.5kVA Pure Copper Stator Generator Coils',
                'category': 'Generator Parts',
                'condition': 'brand_new',
                'price': Decimal('28000.00'),
                'location_name': 'Ogba, Ikeja • 3.8km away',
                'images': ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'],
                'description': 'Factory sealed replacement generator coils. Surplus stock from commercial hotel backup maintenance. Pure copper, heavy gauge.',
                'pickup_options': ['pickup', 'delivery'],
                'is_inspection_ready': True,
                'seller': tunde_user,
            },
            {
                'title': 'Spanish Carrara Glazed Tiles (Unopened Crates)',
                'category': 'Surplus Building Materials',
                'condition': 'brand_new',
                'price': Decimal('95000.00'),
                'location_name': 'Maryland, Ikeja • 1.8km away',
                'images': ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'],
                'description': 'Remaining unopened boxes from duplex renovation. Highest grade polished stone, zero chips, sold 30% below major market retail price.',
                'pickup_options': ['pickup'],
                'is_inspection_ready': True,
                'seller': babatunde,
            },
            {
                'title': 'Ridgid Style Hydraulic Pipe Press Tool',
                'category': 'Plumbing Fixtures',
                'condition': 'fair',
                'price': Decimal('62000.00'),
                'location_name': 'Allen Avenue, Ikeja • 0.7km away',
                'images': ['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=300&fit=crop'],
                'description': 'Reliable pressure seal crimper. Minor paint scuffs on handle, mechanical seals pristine. Ideal for PEX & copper press fittings.',
                'pickup_options': ['pickup'],
                'is_inspection_ready': True,
                'seller': worker_instances['Ibrahim'][0],
            },
        ]

        for item_data in marketplace_data:
            seller = item_data.pop('seller')
            MarketplaceItem.objects.get_or_create(
                title=item_data['title'],
                seller=seller,
                defaults=item_data
            )
        self.stdout.write(self.style.SUCCESS('[OK] P2P Marketplace listings generated'))

        # 10. Video DIY / Trade Feed
        videos_data = [
            {
                'creator': worker_instances['Ibrahim'][0],
                'title': 'Fixing a leaking pipe joint in 60 seconds without draining the entire house water tank!',
                'description': 'Professional plumber tip on clockwise Teflon wrapping and emergency compression ring seating.',
                'category': 'Plumbing',
                'hashtags': ['#PlumbingHacks', '#LocalFix', '#DIYRepair', '#LagosHandyman'],
                'video_url': 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-plumber-tightening-a-pipe-42868-large.mp4',
                'thumbnail_url': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=700&fit=crop',
                'location_name': 'Ikeja GRA, Lagos',
                'likes_count': 342,
                'views_count': 1890,
                'shares_count': 56,
                'duration_seconds': 58,
                'is_official': True,
            },
            {
                'creator': tunde_user,
                'title': 'Lithium Battery Racks vs Gel: Real Inrush Amp Tests on 5kVA Hybrid Inverter',
                'description': 'Bench testing motor inductive surge with oscilloscope and soft start contactors.',
                'category': 'Electrical',
                'hashtags': ['#InverterSetup', '#SolarNigeria', '#CleanEnergy', '#COREN'],
                'video_url': 'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-hands-soldering-a-circuit-board-42875-large.mp4',
                'thumbnail_url': 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=400&h=700&fit=crop',
                'location_name': 'Lekki Phase 1, Lagos',
                'likes_count': 512,
                'views_count': 3240,
                'shares_count': 118,
                'duration_seconds': 74,
                'is_official': True,
            },
            {
                'creator': ngozi_user,
                'title': 'Why Dual Inverter ACs stop cooling when outdoor coil gets clogged with dust',
                'description': 'Deep hydro-cleaning condenser fins and checking R410A suction pressure gauges.',
                'category': 'AC & Fridge',
                'hashtags': ['#ACRepair', '#CoolingHacks', '#LagosTech', '#LocalFix'],
                'video_url': 'https://assets.mixkit.co/videos/preview/mixkit-worker-repairing-an-air-conditioner-unit-42870-large.mp4',
                'thumbnail_url': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&h=700&fit=crop',
                'location_name': 'Surulere, Lagos',
                'likes_count': 288,
                'views_count': 1420,
                'shares_count': 42,
                'duration_seconds': 52,
                'is_official': False,
            }
        ]

        for v_data in videos_data:
            creator = v_data.pop('creator')
            v_obj, _ = VideoPost.objects.get_or_create(
                title=v_data['title'],
                creator=creator,
                defaults=v_data
            )
            # Add sample comments
            if not VideoComment.objects.filter(video=v_obj).exists():
                c1 = VideoComment.objects.create(
                    video=v_obj,
                    user=creator,
                    text='Remember to wrap Teflon tape CLOCKWISE with pipe threading. Counter-clockwise will unwind as you screw the compression nut!',
                    is_pinned=True,
                    likes_count=248
                )
                c2 = VideoComment.objects.create(
                    video=v_obj,
                    user=babatunde,
                    text='Bro saved my kitchen floor this morning! Had water pooling under the sink and this exact seal stopped it until parts came.',
                    likes_count=42
                )
        self.stdout.write(self.style.SUCCESS('[OK] Video DIY Feed and community comments generated'))

        # 11. Chat Messaging Threads
        conv_ngozi, _ = Conversation.objects.get_or_create(booking=booking_hvac)
        conv_ngozi.participants.set([babatunde, ngozi_user])
        if not conv_ngozi.messages.exists():
            ChatMessage.objects.create(
                conversation=conv_ngozi,
                sender=ngozi_user,
                content='Hello! I saw your job request for AC repair in Ikeja GRA. I specialize in inverter ACs and can come as early as this afternoon.',
                is_read=True
            )
            ChatMessage.objects.create(
                conversation=conv_ngozi,
                sender=babatunde,
                content="Great! The unit makes a rattling noise when it starts up and cooling has reduced. It's a 1.5HP Haier Thermocool split unit.",
                is_read=True
            )
            ChatMessage.objects.create(
                conversation=conv_ngozi,
                sender=ngozi_user,
                content='Understood. That sounds like a refrigerant pressure drop or loose blower clip. My callout is ₦9,500 which covers inspection + diagnosis. If gas recharge is required, I will give a separate itemized quote.',
                is_read=True
            )
            ChatMessage.objects.create(
                conversation=conv_ngozi,
                sender=babatunde,
                content='That works for me. Can you come at 2pm today?',
                is_read=True
            )
            ChatMessage.objects.create(
                conversation=conv_ngozi,
                sender=ngozi_user,
                content='✅ Confirmed! I will be there by 2PM. Please share your exact gate instructions.',
                is_read=False
            )

        conv_tunde, _ = Conversation.objects.get_or_create(booking=booking_inv)
        conv_tunde.participants.set([babatunde, tunde_user])
        if not conv_tunde.messages.exists():
            ChatMessage.objects.create(
                conversation=conv_tunde,
                sender=babatunde,
                content='Engr Tunde, the inverter tripped again this morning with error code F04.',
                is_read=True
            )
            ChatMessage.objects.create(
                conversation=conv_tunde,
                sender=tunde_user,
                content='I see the notification on LocalFix dispute room. Let us review the forensic test results together with Madam Amina.',
                is_read=True
            )
        self.stdout.write(self.style.SUCCESS('[OK] Direct chat message threads seeded'))

        self.stdout.write(self.style.SUCCESS('\n======================================================='))
        self.stdout.write(self.style.SUCCESS('LocalFix Django Backend FULLY SEEDED & READY!'))
        self.stdout.write(self.style.SUCCESS('======================================================='))
        self.stdout.write(self.style.SUCCESS('Core Endpoints:'))
        self.stdout.write(self.style.SUCCESS('• /api/auth/        - User registration, JWT login, profile, user lookup'))
        self.stdout.write(self.style.SUCCESS('• /api/services/    - Categories, workers, portfolios, reviews'))
        self.stdout.write(self.style.SUCCESS('• /api/bookings/    - Service bookings, status updates, event audits'))
        self.stdout.write(self.style.SUCCESS('• /api/escrow/      - Vaults, funding, release (2.5%), cancel (99% refund), wallet'))
        self.stdout.write(self.style.SUCCESS('• /api/disputes/    - Dispute dossiers, forensic audits, live rooms, restitution'))
        self.stdout.write(self.style.SUCCESS('• /api/marketplace/ - P2P tool/part listings, filter, bookmarks, categories'))
        self.stdout.write(self.style.SUCCESS('• /api/feed/        - Short-form trade clips, likes, comments, tabs'))
        self.stdout.write(self.style.SUCCESS('• /api/chat/        - Direct messages, threads, mark read, unread counts'))
        self.stdout.write(self.style.SUCCESS('• /api/assistant/   - AI repair diagnostic triage, trade matching, prompt guides'))
        self.stdout.write(self.style.SUCCESS('======================================================='))
