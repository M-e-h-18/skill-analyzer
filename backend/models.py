from pymongo import MongoClient
from config import MONGODB_URI, MONGO_DBNAME
from datetime import datetime
from mongoengine import *

client = MongoClient(MONGODB_URI)
db = client[MONGO_DBNAME]

users = db["users"]
analyses = db["analyses"]
skills_collection = db["skills"]


class JobPosting(Document):
    title = StringField(required=True)
    company = StringField(required=True)
    description = StringField(required=True)
    requirements = ListField(StringField())
    salary_range = StringField()
    location = StringField()
    remote = BooleanField(default=False)
    employer_id = StringField(required=True)
    created_at = DateTimeField(default=datetime.utcnow)
    status = StringField(default='active')