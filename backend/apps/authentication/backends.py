from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed, TokenError

class CaseInsensitiveEmailBackend(ModelBackend):
    """
    Authenticate using case-insensitive email matching.
    Prevents login failure when mobile devices or users auto-capitalize the email.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)
        if username is None or password is None:
            return None

        # Clean trailing/leading spaces
        email_clean = str(username).strip()

        try:
            user = UserModel.objects.get(email__iexact=email_clean)
        except (UserModel.DoesNotExist, UserModel.MultipleObjectsReturned):
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None


class SafeJWTAuthentication(JWTAuthentication):
    """
    Enhanced JWTAuthentication that prevents 'Given token not valid' crashes.
    When an invalid, malformed, or expired token is sent, it returns None,
    allowing Django REST Framework to treat the user as AnonymousUser.
    DRF's permission classes (e.g. IsAuthenticated vs AllowAny) will then
    cleanly enforce access control without SimpleJWT aborting prematurely.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, AuthenticationFailed, TokenError):
            # Gracefully fall back to AnonymousUser so permission classes handle authorization
            return None
