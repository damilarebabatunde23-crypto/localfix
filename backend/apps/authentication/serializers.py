from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Notification

class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    worker_profile_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'role', 'avatar', 'avatar_url', 'location_name',
            'latitude', 'longitude', 'is_verified', 'nin_verified',
            'tier', 'bio', 'languages', 'worker_profile_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_verified', 'nin_verified', 'created_at', 'updated_at']

    def get_avatar(self, obj):
        return obj.resolved_avatar

    def get_worker_profile_id(self, obj):
        if hasattr(obj, 'worker_profile') and obj.worker_profile:
            return str(obj.worker_profile.id)
        return None

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'body', 'notification_type', 'is_read', 'action_url', 'created_at']
        read_only_fields = ['id', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    # Optional profile / onboarding fields
    location_name = serializers.CharField(required=False, allow_blank=True, default='')
    bio = serializers.CharField(required=False, allow_blank=True, default='')
    languages = serializers.JSONField(required=False, default=list, write_only=True)

    # Employer specific fields
    employer_type = serializers.CharField(required=False, allow_blank=True, default='individual', write_only=True)

    # Employee / Worker specific fields
    profession = serializers.CharField(required=False, allow_blank=True, default='', write_only=True)
    category_id = serializers.CharField(required=False, allow_blank=True, default='', write_only=True)
    years_experience = serializers.IntegerField(required=False, default=3, write_only=True)
    callout_rate = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=10000.00, write_only=True)
    service_area = serializers.CharField(required=False, allow_blank=True, default='', write_only=True)
    specialisms = serializers.JSONField(required=False, default=list, write_only=True)

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'email', 'phone', 'role',
            'password', 'confirm_password', 'location_name', 'bio',
            'languages', 'employer_type', 'profession', 'category_id',
            'years_experience', 'callout_rate', 'service_area', 'specialisms'
        ]

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords must match."})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')

        # Pop worker & employer & language fields
        employer_type = validated_data.pop('employer_type', 'individual')
        profession = validated_data.pop('profession', '')
        category_id = validated_data.pop('category_id', '')
        years_experience = validated_data.pop('years_experience', 3)
        callout_rate = validated_data.pop('callout_rate', 10000.00)
        service_area = validated_data.pop('service_area', '')
        specialisms = validated_data.pop('specialisms', None)
        user_languages = validated_data.pop('languages', None)

        if not user_languages:
            user_languages = ['English', 'Nigerian Pidgin']
        elif isinstance(user_languages, str):
            user_languages = [l.strip() for l in user_languages.split(',') if l.strip()]
        validated_data['languages'] = user_languages

        role = validated_data.get('role', 'customer')
        location_name = validated_data.get('location_name', '').strip()
        if not location_name:
            location_name = 'Ikeja GRA, Lagos'
            validated_data['location_name'] = location_name

        if role == 'customer':
            if employer_type == 'commercial':
                validated_data['tier'] = 'Verified Commercial Employer'
            else:
                validated_data['tier'] = 'Tier 3 Gold Resident'
            if not validated_data.get('bio'):
                validated_data['bio'] = 'Active employer on LocalFix hiring vetted artisans for home and corporate projects.'
            validated_data['is_verified'] = True
        elif role == 'worker':
            validated_data['tier'] = 'Vetted Pro Artisan'
            if not validated_data.get('bio'):
                prof_label = profession or 'Artisan Craftsman'
                validated_data['bio'] = f"Certified {prof_label} delivering dependable, high-quality work across {location_name}."
            validated_data['is_verified'] = True

        email = validated_data.get('email', '')
        if 'username' not in validated_data or not validated_data['username']:
            validated_data['username'] = email

        user = User.objects.create_user(**validated_data)

        if user.role == 'worker' and not hasattr(user, 'worker_profile'):
            try:
                from apps.services.models import WorkerProfile, ServiceCategory

                cat = None
                if category_id:
                    try:
                        cat = ServiceCategory.objects.filter(id=category_id).first()
                        if not cat:
                            cat = ServiceCategory.objects.filter(slug__iexact=category_id).first()
                    except Exception:
                        cat = None
                if not cat:
                    cat = ServiceCategory.objects.first()

                # Process specialisms
                clean_specialisms = []
                if isinstance(specialisms, list):
                    clean_specialisms = [str(s).strip() for s in specialisms if str(s).strip()]
                elif isinstance(specialisms, str):
                    clean_specialisms = [s.strip() for s in specialisms.split(',') if s.strip()]

                if not clean_specialisms:
                    clean_specialisms = ['Emergency Repairs', 'Diagnostic Check', 'Certified Safe Hand']

                resolved_profession = profession.strip() if profession else (f"{cat.name} Specialist" if cat else 'Artisan Craftsman')
                resolved_area = service_area.strip() if service_area else (location_name or 'Lagos Central & Suburbs')

                WorkerProfile.objects.create(
                    user=user,
                    profession=resolved_profession,
                    category=cat,
                    bio=user.bio,
                    years_experience=max(1, int(years_experience or 3)),
                    service_area=resolved_area,
                    service_radius_km=20,
                    latitude=user.latitude,
                    longitude=user.longitude,
                    callout_rate=float(callout_rate or 10000.00),
                    rating=0.00,
                    review_count=0,
                    completed_jobs=0,
                    is_verified=True,
                    verification_badge='Vetted Pro',
                    is_online=True,
                    is_available=True,
                    specialisms=clean_specialisms
                )
            except Exception as e:
                print(f"WorkerProfile creation warning: {e}")

        # Create initial onboarding notifications for the user
        try:
            Notification.objects.create(
                user=user,
                title='🎉 Welcome to LocalFix!',
                body=f'Welcome, {user.first_name}! Your account is active and protected under the LocalFix Escrow Protocol.',
                notification_type='system',
            )
            Notification.objects.create(
                user=user,
                title='🛡️ Smart Escrow Protection Active',
                body='Your payments and milestone funds are held in cryptographic custody until work is inspected and approved.',
                notification_type='escrow',
            )
            if user.role == 'worker':
                Notification.objects.create(
                    user=user,
                    title='🔨 Artisan Profile Live',
                    body='Your trade profile is ready. As you receive and complete client jobs, your verified reviews, ratings, and portfolio items will appear here.',
                    notification_type='job',
                )
            else:
                Notification.objects.create(
                    user=user,
                    title='📍 Ready to Hire Artisans',
                    body='Explore vetted craftsmen in your neighborhood with guaranteed escrow protection on every project.',
                    notification_type='job',
                )
        except Exception as e:
            print(f"Initial notification creation note: {e}")

        return user

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    avatar_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    bio = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    tier = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    location_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    languages = serializers.JSONField(required=False, default=list)

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone', 'location_name',
            'latitude', 'longitude', 'bio', 'tier', 'avatar_url', 'languages'
        ]
