from pymongo import MongoClient
from config import MONGODB_URI, MONGO_DBNAME
from datetime import datetime
from mongoengine import *

client = MongoClient(MONGODB_URI)
db = client[MONGO_DBNAME]
users = db["users"]
analyses = db["analyses"]
skills_collection = db["skills"]

# Define EmbeddedDocuments FIRST before they're referenced

class SkillScore(EmbeddedDocument):
    skill = StringField(required=True)
    score = StringField(required=True) # e.g., "Matched", "Missing"

class AnalysisHistory(EmbeddedDocument):
    timestamp = DateTimeField(default=datetime.utcnow)
    skills_analyzed = ListField(StringField())
    results = ListField(DictField()) # Store analysis result structure here

class ResumeAnalysis(EmbeddedDocument):
    timestamp = DateTimeField(default=datetime.utcnow)
    extracted_skills = ListField(StringField())
    suggested_skills = ListField(StringField())
    skills_by_category = DictField()
    text_preview = StringField(default="") # Add this field

class Notification(EmbeddedDocument):
    message = StringField(required=True)
    timestamp = DateTimeField(default=datetime.utcnow)
    read = BooleanField(default=False)
    type = StringField(default="info") # e.g., "job_application", "skill_suggestion", "alert"
    link = StringField(default="") # Optional link to relevant page

class CandidateApplication(EmbeddedDocument):
    candidate_id = ObjectIdField(required=True)
    candidate_name = StringField(required=True)
    candidate_email = StringField(required=True)
    resume_text = StringField() # Snapshot of resume text at time of application
    user_skills = ListField(StringField()) # Snapshot of user's skills at application
    ats_score = StringField(default="N/A")
    match_percentage = StringField(default="0%")
    matched_skills = ListField(StringField())
    missing_skills = ListField(StringField())
    applied_at = DateTimeField(default=datetime.utcnow)
    status = StringField(default="Pending") # e.g., Pending, Reviewed, Interview, Rejected

# Define Documents AFTER all EmbeddedDocuments

class User(Document):
    email = StringField(required=True, unique=True)
    password = StringField(required=True)
    name = StringField(default="")
    role = StringField(choices=["employee", "employer"], default="employee")
    profile_picture = StringField(default="")
    bio = StringField(default="")
    contact_number = StringField(default="")
    linkedin_url = StringField(default="")
    github_url = StringField(default="")
    portfolio_url = StringField(default="")
    skills = ListField(StringField(), default=list) # Skills identified from resume/manual
    analysis_history = ListField(EmbeddedDocumentField(AnalysisHistory), default=list)
    last_resume_analysis = EmbeddedDocumentField(ResumeAnalysis)
    # For employee: jobs they have applied to
    applied_jobs = ListField(ObjectIdField(), default=list) # Stores JobPosting IDs
    notifications = ListField(EmbeddedDocumentField(Notification), default=list)
    meta = {'collection': 'users'}

class JobPosting(Document):
    posted_by = ReferenceField(User, required=True, reverse_delete_rule=CASCADE)
    title = StringField(required=True)
    company = StringField() # Can be inferred from employer's profile or manually entered
    description = StringField(required=True)
    location = StringField()
    salary = StringField()
    job_type = StringField(default="Full-time")
    skills_required = ListField(StringField(), default=list) # Skills needed for the job
    posted_at = DateTimeField(default=datetime.utcnow)
    applicants = ListField(EmbeddedDocumentField(CandidateApplication), default=list)
    is_active = BooleanField(default=True)
    meta = {'collection': 'job_postings'}

class Employer(Document):
    name = StringField(required=True)
    email = StringField(required=True, unique=True)
    password = StringField(required=True)
    company = StringField()
    created_at = DateTimeField(default=datetime.utcnow)