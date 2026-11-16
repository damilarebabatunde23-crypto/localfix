import re
import os
import json
import urllib.request
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.shortcuts import get_object_or_404
from .models import AssistantSession, AssistantMessage
from apps.services.models import WorkerProfile, ServiceCategory

# Currency exchange multipliers relative to USD base
CURRENCY_RATES = {
    'USD': {'symbol': '$', 'rate': 1.0, 'fmt': '${:,.0f}'},
    'EUR': {'symbol': '€', 'rate': 0.92, 'fmt': '€{:,.0f}'},
    'GBP': {'symbol': '£', 'rate': 0.79, 'fmt': '£{:,.0f}'},
    'NGN': {'symbol': '₦', 'rate': 1450.0, 'fmt': '₦{:,.0f}'},
    'CAD': {'symbol': '$', 'rate': 1.38, 'fmt': 'CAD ${:,.0f}'},
    'AUD': {'symbol': '$', 'rate': 1.54, 'fmt': 'AUD ${:,.0f}'},
    'KES': {'symbol': 'KSh', 'rate': 130.0, 'fmt': '{:,.0f} KES'},
}

def format_price_range(usd_min, usd_max, curr_code='USD'):
    curr = CURRENCY_RATES.get(curr_code.upper(), CURRENCY_RATES['USD'])
    c_min = usd_min * curr['rate']
    c_max = usd_max * curr['rate']
    return f"{curr['fmt'].format(c_min)} – {curr['fmt'].format(c_max)} {curr_code.upper()}"


class AssistantChatView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user_message = request.data.get('message', '').strip()
        session_id = request.data.get('session_id')
        currency_code = request.data.get('currency', 'USD').upper()
        location_name = request.data.get('location', 'Worldwide (Global Dispatch)')
        photo_url = request.data.get('photo_url')

        if not user_message and not photo_url:
            return Response({'error': 'Message content cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create session
        session = None
        if session_id:
            try:
                session = AssistantSession.objects.filter(id=session_id).first()
            except Exception:
                session = None

        if not session:
            session = AssistantSession.objects.create(
                user=request.user if request.user.is_authenticated else None,
                title=(user_message or 'Photo Diagnosis')[:50]
            )

        # Record User Message
        AssistantMessage.objects.create(
            session=session,
            role='user',
            content=f"{user_message} [Attached Photo: {photo_url}]" if photo_url else user_message
        )

        # Run Expert Triage Analysis (with Gemini API integration if key present, else specialized expert engine)
        analysis = self.analyze_request(user_message, currency_code, location_name, photo_url)

        # Record Assistant Message
        bot_msg = AssistantMessage.objects.create(
            session=session,
            role='assistant',
            content=analysis['reply'],
            metadata=analysis
        )

        return Response({
            'session_id': str(session.id),
            'reply': analysis['reply'],
            'category': analysis.get('category'),
            'recommended_workers': analysis.get('recommended_workers', []),
            'diagnostic_checks': analysis.get('diagnostic_checks', []),
            'estimated_cost_range': analysis.get('estimated_cost_range'),
            'suggested_questions': analysis.get('suggested_questions', []),
            'action_links': analysis.get('action_links', []),
        }, status=status.HTTP_200_OK)

    def analyze_request(self, text, currency='USD', location='Worldwide', photo_url=None):
        lower = (text or '').lower()
        gemini_api_key = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')

        # Try Google Gemini AI first if API key is supplied
        if gemini_api_key:
            try:
                gemini_reply = self.call_gemini(text, currency, location, photo_url, gemini_api_key)
                if gemini_reply:
                    return gemini_reply
            except Exception:
                pass

        # ── 1. Live Worker Tracking, Uber-Style Dispatch & Movement ──
        if any(w in lower for w in ['track', 'uber', 'indrive', 'movement', 'location of worker', 'eta', 'where is', 'dispatch', 'follow']):
            return {
                'reply': (
                    f"🛰️ **Live Worker Movement & Turn-by-Turn GPS Tracking**\n\n"
                    f"LocalFix features an **interactive real-time dispatch tracker** modeled after Uber and InDrive:\n\n"
                    f"• **Real Road Network Navigation:** Workers navigate actual streets, turns, and highways via real OSRM road geometry (no straight imaginary flight lines).\n"
                    f"• **Live Telemetry & Heading:** You can watch the technician's vehicle icon rotate to match their real driving bearing with real-time speed (`km/h`) and ETA countdown.\n"
                    f"• **3 Real-World Map Views:** Switch anytime between **🗺️ Real Streets** (with street names), **🌙 Cyber Night Radar**, and **🛰️ High-Resolution Satellite Photography**.\n"
                    f"• **Direct In-App Calling:** Initiate encrypted live voice calls, video inspections, or WhatsApp chat straight from the map canvas.\n"
                    f"• **Worker GPS Broadcast:** Technicians can stream their phone's live hardware satellite GPS fix directly to your screen.\n\n"
                    f"You can view and test active worker dispatches right now in the dedicated tracker dashboard."
                ),
                'category': 'tracking',
                'diagnostic_checks': [
                    'Ensure location permissions are allowed in your browser for hyper-accurate doorstep GPS coordinates.',
                    'Use the "Auto-Follow" button on the tracker to keep the camera locked to the technician\'s vehicle.'
                ],
                'estimated_cost_range': 'Free Included Feature with Any Booking',
                'suggested_questions': [
                    'Can I call the technician directly while they are on their way?',
                    'How does the worker broadcast their phone GPS?',
                    'Can I switch between night radar and satellite photo views?'
                ],
                'action_links': [
                    {'label': '🛰️ Open Live Worker Dispatch Tracker', 'url': '/tracking'},
                    {'label': '🗺️ Explore Active Neighborhood Artisans', 'url': '/map'}
                ]
            }

        # ── 2. Escrow Protection Vault vs Direct In-Person Settlement ──
        if any(w in lower for w in ['escrow', 'payment', 'refund', 'fee', 'cancellation', 'arbitrat', 'dispute', 'trust', 'settlement', 'cash', 'bank transfer', 'receive money']):
            return {
                'reply': (
                    f"🛡️ **LocalFix Payment Architecture & Escrow Protection**\n\n"
                    f"LocalFix supports **two safe settlement models** tailored to your preference in **{currency}**:\n\n"
                    f"1. **Platform Escrow Protection Vault (Recommended):**\n"
                    f"   • Your funds remain locked securely in the escrow vault while the technician performs the work.\n"
                    f"   • Funds are **only released** to the artisan once you inspect the completed work and approve with your digital signoff OTP.\n"
                    f"   • Payout fee: **2.5% platform fee** on successful completion. If an artisan cancels or no-shows, **99.0% is immediately refunded** to your account (1% admin reserve).\n\n"
                    f"2. **Direct In-Person Settlement (Zero Platform Holding):**\n"
                    f"   • Agree on the callout rate upfront and settle directly with the technician on-site via **Cash, Direct Bank Transfer, or P2P Apps (Zelle, Venmo, Revolut, Moniepoint, M-Pesa)** after personal inspection.\n\n"
                    f"3. **Dynamic On-Site Price Variation Orders:**\n"
                    f"   • If unexpected replacement parts are discovered on-site, the artisan can submit a digital price adjustment request with photo proof of receipts before proceeding."
                ),
                'category': 'escrow',
                'diagnostic_checks': [
                    'Never release funds or share your completion OTP until work is tested in your presence.',
                    'All platform escrow deposits qualify for the 48-Hour Technical Restitution Guarantee.'
                ],
                'estimated_cost_range': '2.5% on completion / 1.0% on cancellation',
                'suggested_questions': [
                    'What happens if the technician asks for extra money for spare parts?',
                    'Can I pay in cash or direct bank transfer on-site?',
                    'How does the 3-Way Neutral Mediation Room resolve disputes?'
                ],
                'action_links': [
                    {'label': '🔒 View Platform Escrow Vault', 'url': '/escrow/fund'},
                    {'label': '⚖️ Open Live Mediation Room', 'url': '/mediation'}
                ]
            }

        # ── 3. AC, HVAC & Refrigeration ──
        if any(w in lower for w in ['ac', 'air condition', 'chiller', 'freon', 'rattling', 'cooling', 'split unit', 'hvac', 'heat pump', 'fridge', 'refrigerator', 'compressor']):
            workers = WorkerProfile.objects.filter(category__slug__in=['ac-fridge', 'hvac']).select_related('user')[:2]
            worker_data = self._serialize_workers(workers, currency, 'ac-fridge')
            cost_str = format_price_range(65, 190, currency)
            callout_str = format_price_range(25, 45, currency)

            reply = (
                f"❄️ **Diagnostic Triage: AC, Cooling & Refrigeration**\n\n"
                f"**Suspected Mechanical & Electrical Causes:**\n"
                f"1. **Blower Impeller or Fan Motor Bearing:** Rhythmic rattling or vibration indicates loose fan blade clips, debris obstruction, or worn sleeve bearings.\n"
                f"2. **Refrigerant Pressure Drop (Gas Leak):** Hissing accompanied by lukewarm air discharge points to micro-fissures in copper flare joints (R410A / R32 / R134a loss).\n"
                f"3. **Dual Run Capacitor Degradation:** Humming or buzzing from the outdoor condensing unit without compressor engagement usually signals a blown capacitor (35–50µF).\n\n"
                f"**Estimated Service Range ({currency}):**\n"
                f"• Inspection & Diagnostic Callout: **{callout_str}**\n"
                f"• Leak Search, Nitrogen Hold & Gas Top-Up: **{cost_str}**"
            )

            return {
                'reply': reply,
                'category': 'ac-fridge',
                'recommended_workers': worker_data,
                'diagnostic_checks': [
                    'Switch off power at the isolator switch if you detect burning electrical smell.',
                    'Inspect the indoor mesh air filters — clogged filters reduce airflow by up to 60%.',
                    'Check whether ice is freezing over the indoor cooling coils.'
                ],
                'estimated_cost_range': cost_str,
                'suggested_questions': [
                    'Will you verify running amp draw with a true-RMS clamp meter?',
                    'Do you pressure test with nitrogen before recharging refrigerant?',
                    'Does your workmanship carry a 30-day LocalFix guarantee?'
                ],
                'action_links': [
                    {'label': '❄️ Browse Vetted AC & HVAC Technicians', 'url': '/services'},
                    {'label': '🗺️ View Technicians on Real Street Map', 'url': '/map'}
                ]
            }

        # ── 4. Electrical, Solar, Inverters & Battery Storage ──
        if any(w in lower for w in ['inverter', 'solar', 'tripping', 'f04', 'relay', 'battery', 'wiring', 'electrician', 'overload', 'breaker', 'panel', 'short circuit', 'ev charger', 'light switch']):
            workers = WorkerProfile.objects.filter(category__slug='electrician').select_related('user')[:2]
            worker_data = self._serialize_workers(workers, currency, 'electrician')
            cost_str = format_price_range(75, 240, currency)
            callout_str = format_price_range(30, 50, currency)

            reply = (
                f"⚡ **Diagnostic Triage: Solar, Inverter & Electrical Load**\n\n"
                f"**Root Causes Under Review:**\n"
                f"1. **Inductive Motor Inrush:** Heavy inductive equipment (pumps, compressors, motors) draws 3x to 5x their continuous rated wattage upon startup, triggering overload or F04 faults on pure sine wave inverters.\n"
                f"2. **Neutral-Earth Ground Fault:** Faulty neutral isolation between grid and inverter lines causes instantaneous Residual Current Device (RCD) tripping.\n"
                f"3. **DC Battery Bank Sag:** High internal cell resistance or BMS communication dropouts cause sudden voltage collapse under surge.\n\n"
                f"**Estimated Service Range ({currency}):**\n"
                f"• Diagnostic & Megger Insulation Test: **{callout_str}**\n"
                f"• Soft Starter / Contactor Installation & Load Balancing: **{cost_str}**"
            )

            return {
                'reply': reply,
                'category': 'electrician',
                'recommended_workers': worker_data,
                'diagnostic_checks': [
                    'Test whether the breaker trips on resistive loads (lighting, TV) or only inductive motors.',
                    'Check for hot breaker terminals inside the main distribution board.',
                    'Inspect battery cable lugs for oxidation, heat discoloration, or loose torque.'
                ],
                'estimated_cost_range': cost_str,
                'suggested_questions': [
                    'Do you carry a calibrated true-RMS multimeter and insulation resistance tester?',
                    'Can you balance the phases across our main changeover switch?',
                    'Are replacement parts billed through the official LocalFix variation order?'
                ],
                'action_links': [
                    {'label': '⚡ Hire Certified Master Electrician', 'url': '/services'},
                    {'label': '🛰️ Live Worker Dispatch Tracker', 'url': '/tracking'}
                ]
            }

        # ── 5. Plumbing, Water Pumps, Boreholes & Drainage ──
        if any(w in lower for w in ['plumber', 'pipe', 'leak', 'borehole', 'pump', 'water', 'tap', 'drain', 'sewage', 'faucet', 'toilet', 'flush', 'water heater', 'boiler']):
            workers = WorkerProfile.objects.filter(category__slug='plumber').select_related('user')[:2]
            worker_data = self._serialize_workers(workers, currency, 'plumber')
            cost_str = format_price_range(50, 180, currency)
            callout_str = format_price_range(25, 40, currency)

            reply = (
                f"🔧 **Diagnostic Triage: Plumbing, Pressure & Borehole**\n\n"
                f"**Probable Technical Causes:**\n"
                f"1. **Failed Check Valve (Non-Return):** Water columns drain backward down the riser pipe, causing pumps to lose prime or cycle continuously.\n"
                f"2. **PPR / PEX Joint Expansion Fatigue:** Thermal cycling across high-pressure water lines creates micro-leaks at elbows and soldered unions.\n"
                f"3. **Pump Control Box Capacitor Failure:** A humming pressure switch without water delivery indicates a shorted motor starter capacitor.\n\n"
                f"**Estimated Service Range ({currency}):**\n"
                f"• Hydrostatic Pressure Diagnostic: **{callout_str}**\n"
                f"• PPR Hot-Melt Pipe Repair & Valve Replacement: **{cost_str}**"
            )

            return {
                'reply': reply,
                'category': 'plumber',
                'recommended_workers': worker_data,
                'diagnostic_checks': [
                    'Isolate the water main or borehole breaker to prevent localized flooding.',
                    'Observe whether water pressure drop is localized to one faucet or property-wide.',
                    'Inspect ceilings and baseboards near concealed pipe risers for moisture dampness.'
                ],
                'estimated_cost_range': cost_str,
                'suggested_questions': [
                    'Do you perform hydrostatic leak tests with digital pressure gauges?',
                    'Do you use PPR hot-melt fusion or standard PVC solvent cements?'
                ],
                'action_links': [
                    {'label': '🔧 Book Licensed Master Plumber', 'url': '/services'},
                    {'label': '🗺️ Locate Closest Plumber on Map', 'url': '/map'}
                ]
            }

        # ── 6. Generators, Power Plants & Engines ──
        if any(w in lower for w in ['generator', 'diesel', 'petrol', 'mikano', 'caterpillar', 'avr', 'alternator', 'stator', 'carburetor', 'spark plug', 'gen']):
            workers = WorkerProfile.objects.filter(category__slug__in=['generator', 'electrician']).select_related('user')[:2]
            worker_data = self._serialize_workers(workers, currency, 'generator')
            cost_str = format_price_range(60, 210, currency)
            callout_str = format_price_range(30, 50, currency)

            reply = (
                f"⚙️ **Diagnostic Triage: Generators & Engine Mechanics**\n\n"
                f"**Identified Mechanical Issues:**\n"
                f"1. **Automatic Voltage Regulator (AVR) Burnout:** Fluctuating or zero AC voltage under normal engine RPM indicates blown diodes or AVR excitation failure.\n"
                f"2. **Carburetor Jet Clogging or Air Ingress:** Surging or hunting engine RPM is caused by contaminated gasoline deposits blocking the pilot jet.\n"
                f"3. **Stator / Rotor Winding Thermal Breakdown:** Burning varnish smell with sudden breaker trips indicates shorted copper windings requiring rewinding.\n\n"
                f"**Estimated Service Range ({currency}):**\n"
                f"• Engine Compression & Electrical Diagnosis: **{callout_str}**\n"
                f"• AVR Replacement, Carburetor Sonic Clean & Servicing: **{cost_str}**"
            )

            return {
                'reply': reply,
                'category': 'generator',
                'recommended_workers': worker_data,
                'diagnostic_checks': [
                    'Check engine oil level and viscosity before cranking.',
                    'Inspect the exhaust for heavy black (rich fuel) or blue (oil burning) smoke.',
                    'Disconnect sensitive electronics before testing unregulated generator voltage.'
                ],
                'estimated_cost_range': cost_str,
                'suggested_questions': [
                    'Do you carry replacement AVR modules for our generator KVA rating?',
                    'Will you test the generator on a 75% load bank after servicing?'
                ],
                'action_links': [
                    {'label': '⚙️ Hire Generator & Engine Tech', 'url': '/services'}
                ]
            }

        # ── 7. Carpentry, Furniture, Doors, Roofing ──
        if any(w in lower for w in ['carpenter', 'wood', 'door', 'cabinet', 'roof', 'furniture', 'hinge', 'deck', 'closet', 'partition', 'shelf']):
            workers = WorkerProfile.objects.filter(category__slug='carpenter').select_related('user')[:2]
            worker_data = self._serialize_workers(workers, currency, 'carpenter')
            cost_str = format_price_range(40, 160, currency)
            callout_str = format_price_range(20, 35, currency)

            reply = (
                f"🪵 **Diagnostic Triage: Carpentry, Joinery & Roofing**\n\n"
                f"**Diagnostic Evaluation:**\n"
                f"1. **Frame Settling & Swelling:** Sticking doors or binding jambs occur due to seasonal humidity expansion or structural foundation settling.\n"
                f"2. **Concealed Hinge Fatigue:** Sagging cabinet doors or loose soft-close European hinges require dowel reinforcement or mortise re-routing.\n"
                f"3. **Roof Truss & Flashing Seepage:** Wood rot along rafters stems from compromised valley flashings or missing drip edge seals.\n\n"
                f"**Estimated Service Range ({currency}):**\n"
                f"• On-Site Architectural Assessment: **{callout_str}**\n"
                f"• Precision Door Planing, Joint Re-anchoring & Joinery: **{cost_str}**"
            )

            return {
                'reply': reply,
                'category': 'carpenter',
                'recommended_workers': worker_data,
                'diagnostic_checks': [
                    'Examine if door sticking occurs at the top jamb or the latch side threshold.',
                    'Check wood framing for signs of termite dust or water discoloration.'
                ],
                'estimated_cost_range': cost_str,
                'suggested_questions': [
                    'Do you work with moisture-resistant hardwoods or marine plywood?',
                    'Do you supply hardware hinges and heavy-duty concealed tracks?'
                ],
                'action_links': [
                    {'label': '🪵 Hire Master Craftsman & Carpenter', 'url': '/services'}
                ]
            }

        # ── 8. Appliances, Painting, Welding, Tech, or General ──
        categories = ServiceCategory.objects.all()[:5]
        cat_list = ", ".join([f"{c.icon} {c.name}" for c in categories]) if categories else "⚡ Electrical, 🔧 Plumbing, ❄️ HVAC, 🪵 Carpentry, ⚙️ Mechanics"
        cost_str = format_price_range(30, 150, currency)

        reply = (
            f"Hello! I am your **LocalFix AI Trade Copilot** 🛠️\n\n"
            f"I diagnose repairs and connect you with vetted artisans across the globe:\n\n"
            f"• **Instant Triage & Diagnosis:** From AC refrigerant leaks and tripping 5kVA inverters to borehole pumps, generators, carpentry, and home appliances.\n"
            f"• **Worldwide Transparent Pricing:** Calibrated price estimates in your local currency (**{currency}**).\n"
            f"• **Uber-Style Live Dispatch Tracking:** Watch technician arrival with real-time turn-by-turn road navigation, night radar, and satellite imagery.\n"
            f"• **Dual Settlement Choices:** Pay via our **Protected Escrow Vault** (released only after your inspection) or **Direct In-Person Settlement** (Cash, Bank Transfer, P2P Apps).\n\n"
            f"How can I assist your home or job site today in **{location}**?"
        )

        return {
            'reply': reply,
            'category': 'general',
            'recommended_workers': [],
            'diagnostic_checks': [
                'State your equipment brand, model number, and approximate age if known.',
                'Describe any strange noises (buzzing, rattling, humming), burning smells, or error codes.',
                'You can also attach a photo of the damaged component or warning screen.'
            ],
            'estimated_cost_range': cost_str,
            'suggested_questions': [
                'How does the Uber-style live worker tracking work?',
                'Can I pay the artisan in cash or bank transfer directly on-site?',
                'How do on-site price adjustments for spare parts work?'
            ],
            'action_links': [
                {'label': '🗺️ Explore Artisans on Live Map', 'url': '/map'},
                {'label': '🛰️ Open Worker Dispatch Tracker', 'url': '/tracking'},
                {'label': '🛠️ Browse All Trade Services', 'url': '/services'}
            ]
        }

    def _serialize_workers(self, queryset, currency='USD', category_slug='electrician'):
        worker_data = []
        for w in queryset:
            rate_usd = float(w.callout_rate) if w.callout_rate else 45.0
            if rate_usd > 1000 and currency != 'NGN':
                rate_usd = rate_usd / 1400.0  # normalize NGN seed rates
            
            curr_info = CURRENCY_RATES.get(currency, CURRENCY_RATES['USD'])
            conv_rate = rate_usd * (curr_info['rate'] if currency != 'USD' else 1.0)
            rate_formatted = curr_info['fmt'].format(conv_rate)

            worker_data.append({
                'id': str(w.id),
                'name': w.user.full_name or w.display_name or 'Verified Artisan',
                'avatar': w.user.resolved_avatar or 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop',
                'profession': w.profession or 'Specialist Technician',
                'rating': float(w.rating or 4.9),
                'callout_rate': f"{rate_formatted} / callout"
            })

        return worker_data

    def call_gemini(self, text, currency, location, photo_url, api_key):
        system_instruction = (
            f"You are the LocalFix AI Technical Trade Copilot for a worldwide artisan service platform. "
            f"The user is based in or near {location}, using currency {currency}. "
            f"Provide an authoritative, friendly, expert technical diagnosis including: "
            f"1) Root causes, 2) Estimated service budget in {currency}, 3) Homeowner safety checks, "
            f"4) Mentions of LocalFix features (Uber-style live road dispatch tracking, dual payment options: Platform Escrow Vault vs Direct In-Person Cash/Bank Transfer, and on-site price variation orders for spare parts)."
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{system_instruction}\n\nUser Issue: {text}"}
                    ]
                }
            ]
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            candidate = res_data['candidates'][0]['content']['parts'][0]['text']
            return {
                'reply': candidate,
                'category': 'ai_diagnosed',
                'diagnostic_checks': [
                    'Review equipment model and safety isolate breakers before physical contact.',
                    'Check local electrical or water regulations for your jurisdiction.'
                ],
                'estimated_cost_range': f"Market Rates in {currency}",
                'suggested_questions': [
                    'Can I book a verified specialist on LocalFix right now?',
                    'How does the live GPS dispatch tracker follow the worker?'
                ]
            }


class AssistantPromptsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        prompts = [
            '5kVA Inverter tripping on borehole pump inrush load',
            'AC is rattling and blowing lukewarm air — what is wrong?',
            'How does the Uber-style live worker tracking work?',
            'Can I pay the technician in cash or bank transfer on-site?',
            'Borehole pressure switch buzzing but water is not pumping',
            'What if the price changes on-site for unexpected spare parts?',
            'What questions should I ask an electrician before hiring?',
            'Help me diagnose a generator stator burning smell'
        ]
        return Response({'prompts': prompts})

