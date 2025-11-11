from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, JobPosting, MessagingRequest, Conversation, Message
from datetime import datetime, timezone
from bson import ObjectId

messaging_bp = Blueprint("messaging", __name__, url_prefix="/api/messaging")

@messaging_bp.route("/send-request", methods=["POST"])
@jwt_required()
def send_message_request():
    employer_id = get_jwt_identity()
    employer = User.objects(id=employer_id, role="employer").first()
    
    if not employer:
        print(f"DEBUG: Employer not found or not employer role for ID: {employer_id}")
        return jsonify({"msg": "Not authorized. Employer role required."}), 403
        
    data = request.get_json() or {}
    print(f"DEBUG: Incoming request data: {data}") # <-- Add this
    
    candidate_id = data.get("candidate_id")
    job_id = data.get("job_id")
    initial_message = data.get("message", "")
    
    print(f"DEBUG: Extracted candidate_id: {candidate_id}, job_id: {job_id}") # <-- And this
    print(f"DEBUG: Employer fetching name: {employer.name}")
    if not candidate_id or not job_id:
        print(f"DEBUG: Missing candidate_id or job_id. candidate_id={candidate_id}, job_id={job_id}")
        return jsonify({"msg": "Candidate ID and Job ID required"}), 400
    
    try:
        candidate = User.objects(id=ObjectId(candidate_id)).first()
        if not candidate:
            return jsonify({"msg": "Candidate not found"}), 404
        
        job = JobPosting.objects(id=ObjectId(job_id)).first()
        if not job:
            return jsonify({"msg": "Job not found"}), 404
        
        # Check if request already exists
        existing = any(
            req.from_user_id == employer_id and req.job_id == job_id and req.status == 'pending'
            for req in candidate.messaging_requests
        )
        
        if existing:
            return jsonify({"msg": "Messaging request already sent"}), 400
        
        # Create messaging request
        msg_request = MessagingRequest(
            from_user_id=employer_id,
            from_user_name=employer.name,
            from_user_email=employer.email,
            job_id=job_id,
            job_title=job.title,
            message=initial_message,
            status='pending',
            created_at=datetime.now(timezone.utc)
        )
        
        candidate.messaging_requests.append(msg_request)
        candidate.save()
        
        # Send notification to candidate
        from app import send_notification
        send_notification(
            candidate_id,
            f"{employer.name} wants to connect with you regarding {job.title}",
            type="messaging_request",
            link=f"/messages"
        )
        
        return jsonify({
            "msg": "Messaging request sent successfully",
            "request_id": str(msg_request.id)
        }), 200
        
    except Exception as e:
        print(f"Error sending messaging request: {e}")
        return jsonify({"msg": "Failed to send request", "error": str(e)}), 500

@messaging_bp.route("/requests", methods=["GET"])
@jwt_required()
def get_messaging_requests():
    """Get all messaging requests for the current user"""
    user_id = get_jwt_identity()
    
    try:
        user = User.objects(id=user_id).first()
        if not user:
            return jsonify({"msg": "User not found"}), 404
        
        requests_data = [req.to_json() for req in user.messaging_requests]
        return jsonify({"requests": requests_data}), 200
        
    except Exception as e:
        print(f"Error fetching requests: {e}")
        return jsonify({"msg": "Failed to fetch requests", "error": str(e)}), 500

@messaging_bp.route("/requests/<request_id>/respond", methods=["POST"])
@jwt_required()
def respond_to_request(request_id):
    """Accept or reject a messaging request"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    action = data.get("action")  # 'accept' or 'reject'
    
    if action not in ['accept', 'reject']:
        return jsonify({"msg": "Invalid action. Must be 'accept' or 'reject'"}), 400
    
    try:
        user = User.objects(id=user_id).first()
        if not user:
            return jsonify({"msg": "User not found"}), 404
        
        # Find the request
        msg_request = None
        for req in user.messaging_requests:
            if str(req.id) == request_id:
                msg_request = req
                break
        
        if not msg_request:
            return jsonify({"msg": "Request not found"}), 404
        
        if msg_request.status != 'pending':
            return jsonify({"msg": "Request already processed"}), 400
        
        msg_request.status = 'accepted' if action == 'accept' else 'rejected'
        
        if action == 'accept':
            # Create conversations for both users
            employer = User.objects(id=msg_request.from_user_id).first()
            
            # Add conversation to candidate
            candidate_conv = Conversation(
                participant_id=msg_request.from_user_id,
                participant_name=msg_request.from_user_name,
                participant_email=msg_request.from_user_email,
                job_id=msg_request.job_id,
                job_title=msg_request.job_title,
                messages=[],
                last_message_at=datetime.now(timezone.utc)
            )
            user.conversations.append(candidate_conv)
            
            # Add conversation to employer
            employer_conv = Conversation(
                participant_id=user_id,
                participant_name=user.name,
                participant_email=user.email,
                job_id=msg_request.job_id,
                job_title=msg_request.job_title,
                messages=[],
                last_message_at=datetime.now(timezone.utc)
            )
            employer.conversations.append(employer_conv)
            
            employer.save()
            
            # Send notification to employer
            from app import send_notification
            send_notification(
                msg_request.from_user_id,
                f"{user.name} accepted your messaging request",
                type="messaging_accepted",
                link="/messages"
            )
        
        user.save()
        
        return jsonify({
            "msg": f"Request {action}ed successfully",
            "status": msg_request.status
        }), 200
        
    except Exception as e:
        print(f"Error responding to request: {e}")
        return jsonify({"msg": "Failed to respond", "error": str(e)}), 500

@messaging_bp.route("/conversations", methods=["GET"])
@jwt_required()
def get_conversations():
    """Get all conversations for the current user"""
    user_id = get_jwt_identity()
    
    try:
        user = User.objects(id=user_id).first()
        if not user:
            return jsonify({"msg": "User not found"}), 404
        
        conversations_data = [conv.to_json() for conv in user.conversations]
        return jsonify({"conversations": conversations_data}), 200
        
    except Exception as e:
        print(f"Error fetching conversations: {e}")
        return jsonify({"msg": "Failed to fetch conversations", "error": str(e)}), 500

@messaging_bp.route("/conversations/<conversation_id>/messages", methods=["GET"])
@jwt_required()
def get_messages(conversation_id):
    """Get all messages in a conversation"""
    user_id = get_jwt_identity()
    
    try:
        user = User.objects(id=user_id).first()
        if not user:
            return jsonify({"msg": "User not found"}), 404
        
        conversation = None
        for conv in user.conversations:
            if str(conv.id) == conversation_id:
                conversation = conv
                break
        
        if not conversation:
            return jsonify({"msg": "Conversation not found"}), 404
        
        # Mark messages as read
        for msg in conversation.messages:
            if msg.sender_id != user_id:
                msg.read = True
        conversation.unread_count = 0
        user.save()
        
        messages_data = [msg.to_json() for msg in conversation.messages]
        return jsonify({"messages": messages_data}), 200
        
    except Exception as e:
        print(f"Error fetching messages: {e}")
        return jsonify({"msg": "Failed to fetch messages", "error": str(e)}), 500

@messaging_bp.route("/conversations/<conversation_id>/send", methods=["POST"])
@jwt_required()
def send_message(conversation_id):
    """Send a message in a conversation"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    content = data.get("content", "").strip()
    
    if not content:
        return jsonify({"msg": "Message content required"}), 400
    
    try:
        user = User.objects(id=user_id).first()
        if not user:
            return jsonify({"msg": "User not found"}), 404
        
        # Find conversation
        conversation = None
        for conv in user.conversations:
            if str(conv.id) == conversation_id:
                conversation = conv
                break
        
        if not conversation:
            return jsonify({"msg": "Conversation not found"}), 404
        
        # Create message
        message = Message(
            sender_id=user_id,
            sender_name=user.name,
            content=content,
            timestamp=datetime.now(timezone.utc),
            read=False
        )
        
        conversation.messages.append(message)
        conversation.last_message_at = datetime.now(timezone.utc)
        user.save()
        
        # Add message to other participant's conversation
        other_user = User.objects(id=conversation.participant_id).first()
        if other_user:
            for other_conv in other_user.conversations:
                if other_conv.participant_id == user_id and other_conv.job_id == conversation.job_id:
                    other_conv.messages.append(message)
                    other_conv.last_message_at = datetime.now(timezone.utc)
                    other_conv.unread_count += 1
                    break
            other_user.save()
            
            # Send real-time notification via SocketIO
            from app import socketio
            socketio.emit('new_message', {
                'conversation_id': str(other_conv.id),
                'message': message.to_json()
            }, room=conversation.participant_id)
            
            # Send notification
            from app import send_notification
            send_notification(
                conversation.participant_id,
                f"New message from {user.name}",
                type="new_message",
                link=f"/messages/{conversation_id}"
            )
        
        return jsonify({
            "msg": "Message sent successfully",
            "message": message.to_json()
        }), 200
        
    except Exception as e:
        print(f"Error sending message: {e}")
        return jsonify({"msg": "Failed to send message", "error": str(e)}), 500