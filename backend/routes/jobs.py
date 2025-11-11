from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
from bson import ObjectId
from models import JobPosting, User, CandidateApplication

load_dotenv()
JSEARCH_API_KEY = os.getenv("JSEARCH_API_KEY")
ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
ADZUNA_API_KEY = os.getenv("ADZUNA_API_KEY")

jobs_bp = Blueprint("jobs", __name__, url_prefix="/api/jobs")

UK_CITIES = [
    "London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Edinburgh",
    "Liverpool", "Bristol", "Sheffield", "Newcastle"
]

# ----------------- Utility Functions ----------------- #

def determine_adzuna_location_params(location_input):
    country_code = "in"
    where_param = None
    if location_input:
        lower_location = location_input.lower()
        if "india" in lower_location or lower_location == "in":
            country_code = "in"
        elif "uk" in lower_location or "united kingdom" in lower_location or lower_location == "gb":
            country_code = "gb"
        elif "us" in lower_location or "united states" in lower_location:
            country_code = "us"
        if lower_location not in [country_code, "india", "in", "uk", "gb", "united kingdom", "us", "united states"]:
            where_param = location_input
    return country_code, where_param

def fetch_jsearch_jobs(query, location=""):
    try:
        if not query:
            query = "developer"
        search_query = f"{query} {location}".strip()
        url = "https://jsearch.p.rapidapi.com/search"
        headers = {
            "x-rapidapi-key": JSEARCH_API_KEY,
            "x-rapidapi-host": "jsearch.p.rapidapi.com"
        }
        params = {"query": search_query, "page": "1", "num_pages": "1"}
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        return [{
            "id": job.get("job_id"),
            "title": job.get("job_title"),
            "company": job.get("employer_name"),
            "location": job.get("job_city") or job.get("job_country"),
            "type": job.get("job_employment_type") or "Not specified",
            "salary": job.get("job_salary_currency") or "Not specified",
            "description": (job.get("job_description") or "")[:200] + "...",
            "url": job.get("job_apply_link"),
            "source": "JSearch",
            "posted_date": job.get("job_posted_at_datetime_utc"),
            "is_external": True
        } for job in data.get("data", [])]
    except Exception as e:
        print(f"JSearch error: {e}")
        return []

def fetch_adzuna_jobs(query, location_input="", results_per_page=10):
    try:
        country_code, where_param = determine_adzuna_location_params(location_input)
        if not query:
            query = "developer"
        url = f"https://api.adzuna.com/v1/api/jobs/{country_code}/search/1"
        params = {
            "app_id": ADZUNA_APP_ID,
            "app_key": ADZUNA_API_KEY,
            "what": query,
            "results_per_page": results_per_page,
            "sort_by": "relevance",
        }
        if where_param:
            params["where"] = where_param
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        jobs_data = response.json()
        return [{
            "id": job.get("id"),
            "title": job.get("title"),
            "company": job.get("company", {}).get("display_name"),
            "location": job.get("location", {}).get("display_name"),
            "type": job.get("contract_type") or "Not specified",
            "salary": f"{job.get('salary_min') or 'Not'} - {job.get('salary_max') or 'specified'}",
            "description": (job.get("description") or "")[:200] + "...",
            "url": job.get("redirect_url"),
            "source": "Adzuna",
            "posted_date": job.get("created"),
            "is_external": True
        } for job in jobs_data.get("results", [])]
    except Exception as e:
        print(f"Adzuna error: {e}")
        return []

def fetch_internal_jobs(query="", location="", skills=[]):
    try:
        filters = {"is_active": True}
        if query:
            filters["$or"] = [
                {"title": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}}
            ]
        if location and location.lower() not in ["in", "india"]:
            filters["location"] = {"$regex": location, "$options": "i"}
        if skills:
            filters["skills_required"] = {"$elemMatch": {"$regex": "|".join([s.lower() for s in skills]), "$options": "i"}}

        jobs = JobPosting.objects(__raw__=filters).order_by('-posted_at')
        internal_jobs = []
        for job in jobs:
            internal_jobs.append({
                "id": str(job.id),
                "title": job.title,
                "company": job.company,
                "location": job.location or "Remote",
                "type": job.job_type,
                "salary": job.salary or "Not specified",
                "description": job.description[:200] + "..." if len(job.description) > 200 else job.description,
                "skills_required": job.skills_required,
                "source": "Internal",
                "posted_date": job.posted_at.isoformat() if job.posted_at else None,
                "is_external": False,
                "posted_by": str(job.posted_by.id) if job.posted_by else None
            })
        return internal_jobs
    except Exception as e:
        print(f"Error fetching internal jobs: {e}")
        return []

def suggest_top_roles(skills):
    skill_to_role_map = {
        "python": ["Python Developer", "Data Scientist", "Backend Developer"],
        "javascript": ["Frontend Developer", "Full Stack Developer", "Node.js Developer"],
        "react": ["React Developer", "Frontend Developer"],
        "aws": ["Cloud Engineer", "DevOps Engineer"],
        "docker": ["DevOps Engineer", "Software Engineer"],
        "sql": ["Database Developer", "Data Analyst"],
        "java": ["Java Developer", "Backend Developer"],
        "c++": ["Software Engineer", "Game Developer"],
        "machine learning": ["Machine Learning Engineer", "Data Scientist"],
        "data science": ["Data Scientist", "Data Analyst"],
    }
    suggested_roles = set()
    for skill in skills:
        for k, v in skill_to_role_map.items():
            if skill.lower() in k.lower():
                suggested_roles.update(v)
    return list(suggested_roles) if suggested_roles else ["Software Engineer", "Developer"]

# ----------------- Routes ----------------- #

@jobs_bp.route("/search", methods=["POST"])
def search_jobs():
    try:
        data = request.get_json(force=True)
        query = data.get("query", "").strip()
        location = data.get("location", "").strip()
        skills = data.get("skills", [])

        internal_jobs = fetch_internal_jobs(query, location, skills)
        if not query and skills:
            suggested_roles = suggest_top_roles(skills)
            query_for_adzuna = " OR ".join(suggested_roles[:3])
            query_for_jsearch = " ".join(suggested_roles[:3])
        else:
            combined_query = f"{query} {' '.join(skills)}".strip()
            query_for_adzuna = combined_query
            query_for_jsearch = combined_query

        adzuna_jobs = fetch_adzuna_jobs(query_for_adzuna, location)
        jsearch_jobs = fetch_jsearch_jobs(query_for_jsearch, location)
        all_jobs = internal_jobs + adzuna_jobs + jsearch_jobs

        return jsonify({
            "success": True,
            "jobs": all_jobs,
            "count": len(all_jobs),
            "internal_count": len(internal_jobs),
            "suggested_roles": suggest_top_roles(skills) if not query else []
        })
    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({"error": str(e)}), 500

@jobs_bp.route("/apply/<job_id>", methods=["POST"])
@jwt_required()
def apply_to_job(job_id):
    try:
        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({"msg": "Invalid or missing JWT token"}), 401

        candidate = User.objects(id=ObjectId(user_id), role__iexact="employee").first()
        if not candidate:
            return jsonify({"msg": "Not authorized. Candidate role required."}), 403

        candidate_skills = set([s.lower() for s in (getattr(candidate.last_resume_analysis, 'extracted_skills', []) or [])])
        job = JobPosting.objects(id=ObjectId(job_id)).first()
        if not job:
            return jsonify({"msg": "Job not found"}), 404

        # Already applied check
        if any(str(app.candidate_id) == str(user_id) for app in job.applicants):
            return jsonify({"msg": "You have already applied to this job"}), 400

        required_skills = set([s.lower() for s in job.skills_required or []])
        matched_skills = list(candidate_skills & required_skills)
        missing_skills = list(required_skills - candidate_skills)
        ats_score = int((len(matched_skills) / len(required_skills)) * 100) if required_skills else None

        application = CandidateApplication(
            candidate_id=str(user_id),
            candidate_name=candidate.name,
            candidate_email=candidate.email,
            resume_text="",
            user_skills=list(candidate_skills),
            gemini_skills=getattr(candidate.last_resume_analysis, 'gemini_skills', []) or [],
            ats_score=f"{ats_score}%" if ats_score is not None else None,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            applied_at=datetime.now(timezone.utc),
            status="Pending"
        )

        job.applicants.append(application)
        job.save()
        
        return jsonify({
            "msg": "Application submitted successfully!",
            "ats_score": ats_score,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills
        }), 200
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"msg": "Failed to submit application", "error": str(e)}), 500

@jobs_bp.route("/my-applications", methods=["GET"])
@jwt_required()
def get_my_applications():
    try:
        user_id = get_jwt_identity()
        jobs = JobPosting.objects(applicants__candidate_id=str(user_id))
        applications = []
        for job in jobs:
            for app in job.applicants:
                if str(app.candidate_id) == str(user_id):
                    applications.append({
                        "job_id": str(job.id),
                        "job_title": job.title,
                        "company": job.company,
                        "location": job.location,
                        "applied_at": app.applied_at.isoformat() if app.applied_at else None,
                        "status": app.status,
                        "ats_score": app.ats_score,
                        "matched_skills": app.matched_skills,
                        "missing_skills": app.missing_skills
                    })
        return jsonify({"applications": applications}), 200
    except Exception as e:
        print(f"Error fetching applications: {e}")
        return jsonify({"error": str(e)}), 500

@jobs_bp.route("/outlook", methods=["POST"])
def get_job_outlook():
    data = request.get_json()
    job_title = data.get("job_title", "")
    if not job_title:
        return jsonify({"error": "job_title is required"}), 400

    outlook_data = {
        "job_title": job_title,
        "growth_percentage": 10,
        "demand_trend": "rising",
        "average_salary": "₹700,000",
    }

    return jsonify({"success": True, "data": outlook_data}), 200
