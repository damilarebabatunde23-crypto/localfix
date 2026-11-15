from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import Conversation, ChatMessage, CallSession
from .serializers import ConversationSerializer, ChatMessageSerializer, CallSessionSerializer
from apps.services.models import WorkerProfile

User = get_user_model()

class ConversationListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conversations = Conversation.objects.filter(participants=request.user).prefetch_related('participants', 'messages')
        serializer = ConversationSerializer(conversations, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        recipient_id = request.data.get('recipient_id')
        worker_id = request.data.get('worker_id')
        booking_id = request.data.get('booking_id')

        target_id = recipient_id or worker_id
        if not target_id:
            return Response({'error': 'recipient_id or worker_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        recipient = None
        # Try resolving directly as a User
        try:
            recipient = User.objects.filter(id=target_id).first()
        except Exception:
            recipient = None

        # If not found as User, try resolving as a WorkerProfile
        if not recipient:
            try:
                worker = WorkerProfile.objects.filter(id=target_id).first()
                if worker:
                    recipient = worker.user
            except Exception:
                recipient = None

        if not recipient:
            return Response({'error': f'Artisan or user with ID "{target_id}" was not found.'}, status=status.HTTP_404_NOT_FOUND)

        if recipient == request.user:
            return Response({'error': 'Cannot start a conversation with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if conversation already exists between these two
        conv = Conversation.objects.filter(participants=request.user).filter(participants=recipient).first()
        if not conv:
            conv = Conversation.objects.create(booking_id=booking_id)
            conv.participants.add(request.user, recipient)

        serializer = ConversationSerializer(conv, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class ConversationDetailView(generics.RetrieveAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)

class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conv_id = self.kwargs.get('id')
        conv = get_object_or_404(Conversation, id=conv_id, participants=self.request.user)
        return conv.messages.all()

    def perform_create(self, serializer):
        conv_id = self.kwargs.get('id')
        conv = get_object_or_404(Conversation, id=conv_id, participants=self.request.user)
        msg = serializer.save(sender=self.request.user, conversation=conv)
        conv.save() # bump updated_at

        try:
            from apps.authentication.models import Notification
            recipient = conv.participants.exclude(id=self.request.user.id).first()
            if recipient:
                sender_name = self.request.user.full_name or self.request.user.email
                snippet = msg.content[:100] if msg.content else f"Sent a {msg.message_type} attachment"
                Notification.objects.create(
                    user=recipient,
                    title=f"Message from {sender_name}",
                    body=snippet,
                    notification_type='system',
                    action_url=f"/messages?conversation={conv.id}"
                )
        except Exception:
            pass

class MarkConversationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        conv = get_object_or_404(Conversation, id=id, participants=request.user)
        updated_count = conv.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        return Response({'marked_read': updated_count})


class StartCallView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        recipient_id = request.data.get('recipient_id')
        call_type = request.data.get('call_type', 'audio')
        offer = request.data.get('offer')
        conversation_id = request.data.get('conversation_id')

        if not recipient_id:
            return Response({'error': 'recipient_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        recipient = None
        try:
            recipient = User.objects.filter(id=recipient_id).first()
        except Exception:
            recipient = None

        if not recipient:
            try:
                worker = WorkerProfile.objects.filter(id=recipient_id).first()
                if worker:
                    recipient = worker.user
            except Exception:
                recipient = None

        if not recipient:
            return Response({'error': f'Artisan or user "{recipient_id}" was not found.'}, status=status.HTTP_404_NOT_FOUND)

        if recipient == request.user:
            return Response({'error': 'Cannot initiate a call to yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        conv = None
        if conversation_id:
            try:
                conv = Conversation.objects.filter(id=conversation_id, participants=request.user).first()
            except Exception:
                pass

        # End any old pending calls between these two users
        CallSession.objects.filter(
            caller=request.user,
            recipient=recipient,
            status='ringing'
        ).update(status='ended')

        call = CallSession.objects.create(
            caller=request.user,
            recipient=recipient,
            conversation=conv,
            call_type=call_type,
            status='ringing',
            offer=offer
        )

        # Notify recipient
        try:
            from apps.authentication.models import Notification
            sender_name = request.user.full_name or request.user.email
            Notification.objects.create(
                user=recipient,
                title=f"Incoming {call_type.title()} Call from {sender_name}",
                body=f"Tap to answer the secure {call_type} call.",
                notification_type='system',
                action_url=f"/messages?call_id={call.id}"
            )
        except Exception:
            pass

        serializer = CallSessionSerializer(call)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class GetActiveCallView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cutoff = timezone.now() - timedelta(seconds=45)
        # Check if someone is actively ringing the logged-in user
        incoming = CallSession.objects.filter(
            recipient=request.user,
            status='ringing',
            created_at__gte=cutoff
        ).first()

        if incoming:
            return Response({'active_call': CallSessionSerializer(incoming).data})
        return Response({'active_call': None})


class CallDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        call = get_object_or_404(CallSession, id=id)
        if request.user != call.caller and request.user != call.recipient:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        return Response(CallSessionSerializer(call).data)


class AnswerCallView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        call = get_object_or_404(CallSession, id=id)
        if request.user != call.recipient:
            return Response({'error': 'Only the recipient can answer this call.'}, status=status.HTTP_403_FORBIDDEN)

        answer = request.data.get('answer')
        call.answer = answer
        call.status = 'accepted'
        call.save()
        return Response(CallSessionSerializer(call).data)


class SendIceCandidateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        call = get_object_or_404(CallSession, id=id)
        candidate = request.data.get('candidate')
        if not candidate:
            return Response({'error': 'candidate is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.user == call.caller:
            candidates = list(call.caller_candidates or [])
            candidates.append(candidate)
            call.caller_candidates = candidates
            call.save()
        elif request.user == call.recipient:
            candidates = list(call.recipient_candidates or [])
            candidates.append(candidate)
            call.recipient_candidates = candidates
            call.save()
        else:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        return Response({
            'caller_candidates': call.caller_candidates,
            'recipient_candidates': call.recipient_candidates
        })


class EndCallView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        call = get_object_or_404(CallSession, id=id)
        if request.user != call.caller and request.user != call.recipient:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status', 'ended')
        call.status = new_status if new_status in ['rejected', 'ended'] else 'ended'
        call.save()
        return Response({'status': call.status})

