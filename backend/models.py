from pymongo import MongoClient
from mongoengine import *
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
    type = StringField(default="info")  # e.g., "job_application", "skill_suggestion", "alert"
    link = StringField(default="")  # Optional link to relevant page

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
    resume = StringField(default="")  # <-- Add this line to store resume text
    applied_jobs = ListField(ObjectIdField(), default=list)
    notifications = ListField(EmbeddedDocumentField(Notification), default=list)

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
