from pymongo import MongoClient
from mongoengine import *
from bson import ObjectId
from datetime import datetime

from config import MONGODB_URI, MONGO_DBNAME

client = MongoClient(MONGODB_URI)
db = client[MONGO_DBNAME]

# ------------------ Embedded Documents ------------------

class SkillScore(EmbeddedDocument):
    skill = StringField(required=True)
    score = StringField(required=True)  # e.g., "Matched", "Missing"

class AnalysisHistory(EmbeddedDocument):
    timestamp = DateTimeField(default=datetime.utcnow)
    skills_analyzed = ListField(StringField(), default=list)
    results = ListField(DictField(), default=list)

class ResumeAnalysis(EmbeddedDocument):
    timestamp = DateTimeField(default=datetime.utcnow)
    extracted_skills = ListField(StringField(), default=list)
    suggested_skills = ListField(StringField(), default=list)
    skills_by_category = DictField(default=dict)
    text_preview = StringField(default="")
    gemini_skills = ListField(StringField(), default=list)

class Notification(EmbeddedDocument):
    message = StringField(required=True)
    timestamp = DateTimeField(default=datetime.utcnow)
    read = BooleanField(default=False)
    type = StringField(default="info")
    link = StringField(default="")

class CandidateApplication(EmbeddedDocument):
    candidate_id = ObjectIdField(required=True)
    candidate_name = StringField(required=True)
    candidate_email = StringField(required=True)
    resume_text = StringField(default="")
    user_skills = ListField(StringField(), default=list)
    gemini_skills = ListField(StringField(), default=list)
    ats_score = StringField(default="N/A")
    match_percentage = StringField(default="0%")
    matched_skills = ListField(StringField(), default=list)
    missing_skills = ListField(StringField(), default=list)
    applied_at = DateTimeField(default=datetime.utcnow)
    status = StringField(default="Pending")  # e.g., Pending, Reviewed, Interview, Rejected

class MessagingRequest(EmbeddedDocument):
    id = ObjectIdField(default=ObjectId, required=True)
    from_user_id = StringField(required=True)
    from_user_name = StringField()
    from_user_email = StringField()
    job_id = StringField()
    job_title = StringField()
    message = StringField()
    status = StringField(default='pending')  # pending, accepted, rejected
    created_at = DateTimeField(default=datetime.utcnow)

    def to_json(self):
        return {
            'id': str(self.id),
            'from_user_id': self.from_user_id,
            'from_user_name': self.from_user_name,
            'from_user_email': self.from_user_email,
            'job_id': self.job_id,
            'job_title': self.job_title,
            'message': self.message,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Message(EmbeddedDocument):
    id = ObjectIdField(default=ObjectId, required=True)
    sender_id = StringField(required=True)
    sender_name = StringField()
    content = StringField(required=True)
    timestamp = DateTimeField(default=datetime.utcnow)
    read = BooleanField(default=False)
    
    def to_json(self):
        return {
            'id': str(self.id),
            'sender_id': self.sender_id,
            'sender_name': self.sender_name,
            'content': self.content,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'read': self.read
        }

class Conversation(EmbeddedDocument):
    id = ObjectIdField(default=ObjectId, required=True)
    participant_id = StringField(required=True)
    participant_name = StringField()
    participant_email = StringField()
    job_id = StringField()
    job_title = StringField()
    messages = ListField(EmbeddedDocumentField(Message))
    last_message_at = DateTimeField(default=datetime.utcnow)
    unread_count = IntField(default=0)
    
    def to_json(self):
        return {
            'id': str(self.id),
            'participant_id': self.participant_id,
            'participant_name': self.participant_name,
            'participant_email': self.participant_email,
            'job_id': self.job_id,
            'job_title': self.job_title,
            'messages': [msg.to_json() for msg in self.messages],
            'last_message_at': self.last_message_at.isoformat() if self.last_message_at else None,
            'unread_count': self.unread_count
        }

# ------------------ Documents ------------------

class User(Document):
    email = StringField(required=True, unique=True)
    password = StringField(required=True)
    name = StringField(default="")
    role = StringField(choices=["employee", "employer"], default="employee")
    created_at = DateTimeField(default=datetime.utcnow)
    profile_picture = StringField(default="")
    bio = StringField(default="")
    contact_number = StringField(default="")
    linkedin_url = StringField(default="")
    github_url = StringField(default="")
    portfolio_url = StringField(default="")
    skills = ListField(StringField(), default=list)
    analysis_history = ListField(EmbeddedDocumentField(AnalysisHistory), default=list)
    last_resume_analysis = EmbeddedDocumentField(ResumeAnalysis, default=ResumeAnalysis)
    resume = StringField(default="")
    applied_jobs = ListField(ObjectIdField(), default=list)
    notifications = ListField(EmbeddedDocumentField(Notification), default=list)
    messaging_requests = ListField(EmbeddedDocumentField(MessagingRequest))
    conversations = ListField(EmbeddedDocumentField(Conversation))

    meta = {'collection': 'users'}

class JobPosting(Document):
    posted_by = ReferenceField(User, required=True, reverse_delete_rule=CASCADE)
    title = StringField(required=True)
    company = StringField(default="")
    description = StringField(required=True)
    location = StringField(default="Remote")
    salary = StringField(default="Not specified")
    job_type = StringField(default="Full-time")
    skills_required = ListField(StringField(), default=list)
    posted_at = DateTimeField(default=datetime.utcnow)
    applicants = ListField(EmbeddedDocumentField(CandidateApplication), default=list)
    is_active = BooleanField(default=True)

    meta = {'collection': 'job_postings'}

class Employer(Document):
    name = StringField(required=True)
    email = StringField(required=True, unique=True)
    password = StringField(required=True)
    company = StringField(default="")
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {'collection': 'employers'}
