from flask import Blueprint, request, jsonify
import requests
import os
from dotenv import load_dotenv
import time
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, JobPosting, CandidateApplication, Notification # Import your models
from mongoengine import DoesNotExist, ValidationError
from datetime import datetime
import traceback

# Import send_notification from the main app.py
try:
    from auth import socketio, send_notification
    from auth import gemini_model, COMPREHENSIVE_SKILLS_DB, gemini_analyze_text, create_improved_gemini_prompt, calculate_skill_confidence, enhanced_skill_extraction_from_text
except ImportError:
    socketio = None
    send_notification = lambda *args, **kwargs: print("Warning: send_notification not available.")
    print("SocketIO/Notification sender not found for jobs blueprint. Notifications might not work.")
    print("Gemini model/helpers not found for jobs blueprint. ATS might be affected.")

load_dotenv()
JSEARCH_API_KEY = os.getenv("JSEARCH_API_KEY")
ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
ADZUNA_API_KEY = os.getenv("ADZUNA_API_KEY")

jobs_bp = Blueprint("jobs", __name__, url_prefix="/api/jobs")

UK_CITIES = [
    "London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Edinburgh",
    "Liverpool", "Bristol", "Sheffield", "Newcastle"
]

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

        if country_code == "in" and lower_location not in ["india", "in"]:
            where_param = location_input
        elif country_code == "gb" and lower_location not in ["uk", "united kingdom", "gb"]:
            where_param = location_input
        elif country_code == "us" and lower_location not in ["us", "united states"]:
            where_param = location_input

    return country_code, where_param

def fetch_jsearch_jobs(query, location):
    try:
        url = "https://jsearch.p.rapidapi.com/search"
        headers = {
            "x-rapidapi-key": JSEARCH_API_KEY,
            "x-rapidapi-host": "jsearch.p.rapidapi.com"
        }
        params = {
            "query": f"{query} in {location}",
            "page": "1",
            "num_pages": "1"
        }
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()

        return [{
            "id": job.get("job_id"),
            "title": job.get("job_title"),
            "company": job.get("employer_name"),
            "location": job.get("job_city") or job.get("job_country"),
            "type": job.get("job_employment_type"),
            "salary": job.get("job_salary_currency") or "Not specified",
            "description": job.get("job_description", "")[:200] + "...",
            "url": job.get("job_apply_link"),
            "source": "JSearch",
            "posted_date": job.get("job_posted_at_datetime_utc"),
            "is_internal": False # Mark as external
        } for job in data.get("data", [])]
    except requests.exceptions.HTTPError as e:
        print(f"JSearch HTTP error: {e.response.status_code} {e.response.reason} for url: {e.response.url}")
        return []
    except Exception as e:
        print(f"JSearch unexpected error: {e}")
        return []

def fetch_adzuna_jobs(query, location_input="", results_per_page=10):
    try:
        country_code, where_param = determine_adzuna_location_params(location_input)

        url = f"https://api.adzuna.com/v1/api/jobs/{country_code}/search/1"
        params = {
            "app_id": ADZUNA_APP_ID,
            "app_key": ADZUNA_API_KEY,
            "what": query,
            "results_per_page": results_per_page,
            "full_time": "1",
            "sort_by": "relevance",
            "content-type": "application/json"
        }
        if where_param:
             params["where"] = where_param

        response = requests.get(url, params=params)
        response.raise_for_status()
        jobs_data = response.json()

        return [{
            "id": job.get("id"),
            "title": job.get("title"),
            "company": job.get("company", {}).get("display_name"),
            "location": job.get("location", {}).get("display_name"),
            "type": job.get("contract_type", "Not specified"),
            "salary": f"{job.get('salary_min', 'Not')} - {job.get('salary_max', 'specified')}",
            "description": job.get("description", "")[:200] + "...",
            "url": job.get("redirect_url"),
            "source": "Adzuna",
            "posted_date": job.get("created"),
            "is_internal": False # Mark as external
        } for job in jobs_data.get("results", [])]
    except requests.exceptions.HTTPError as e:
        print(f"Adzuna HTTP error: {e.response.status_code} {e.response.reason} for url: {e.response.url}")
        if e.response.status_code == 429:
            print("Adzuna: Too many requests. Waiting before retry...")
            time.sleep(5)
        return []
    except Exception as e:
        print(f"Adzuna general API error: {e}")
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

@jobs_bp.route("/search", methods=["POST"])
@jwt_required(optional=True)
def search_jobs():
    try:
        data = request.get_json(force=True)
        query = data.get("query", "").strip()
        location = data.get("location", "").strip()
        skills = data.get("skills", [])
        
        # Fetch internal jobs first
        internal_jobs = []
        user_id = get_jwt_identity()
        applied_job_ids = []
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                applied_job_ids = user.applied_jobs
            except DoesNotExist:
                pass # User not found, proceed without applied jobs info

        # Build MongoDB query for internal jobs
        mongo_query = {'is_active': True}
        if query:
            mongo_query['$or'] = [
                {'title': {'$regex': query, '$options': 'i'}},
                {'description': {'$regex': query, '$options': 'i'}},
                {'skills_required': {'$regex': query, '$options': 'i'}}
            ]
        if location:
            mongo_query['location'] = {'$regex': location, '$options': 'i'}
        if skills:
            # Match jobs that require *any* of the user's skills
            mongo_query['skills_required'] = {'$in': skills}

        internal_job_docs = JobPosting.objects(__raw__=mongo_query).order_by('-posted_at')
        
        for job in internal_job_docs:
            job_dict = job.to_mongo().to_dict()
            job_dict["id"] = str(job.id)
            job_dict["posted_by"] = str(job.posted_by.id)
            job_dict["posted_at"] = job.posted_at.isoformat()
            job_dict["source"] = "Internal"
            job_dict["is_internal"] = True
            job_dict["has_applied"] = job.id in applied_job_ids # Check if user has applied
            internal_jobs.append(job_dict)

        # External jobs logic
        suggested_roles = []
        query_for_adzuna = query
        query_for_jsearch = query

        if not query and skills:
            suggested_roles = suggest_top_roles(skills)
            query_for_adzuna = " OR ".join(suggested_roles[:3])
            query_for_jsearch = " ".join(suggested_roles[:3])
        elif query and skills: # If user provides query AND skills, combine them
            query_for_adzuna = f"{query} {' OR '.join(skills)}"
            query_for_jsearch = f"{query} {' '.join(skills)}"

        adzuna_jobs = fetch_adzuna_jobs(query_for_adzuna, location)
        jsearch_jobs = fetch_jsearch_jobs(query_for_jsearch, location)

        all_jobs = internal_jobs + adzuna_jobs + jsearch_jobs

        # If no jobs found from main search, and skills were provided without a query,
        # broaden external search using only skills.
        if not all_jobs and skills and not query:
            print("No jobs found with suggested roles, trying broader skill search on Adzuna...")
            adzuna_jobs_broad = fetch_adzuna_jobs(" ".join(skills), location)
            all_jobs.extend(adzuna_jobs_broad)

        if not all_jobs and query and not skills:
            print("No jobs found with query, trying broader query without skills on Adzuna...")
            adzuna_jobs_broad = fetch_adzuna_jobs(query, location)
            all_jobs.extend(adzuna_jobs_broad)


        if not all_jobs:
             return jsonify({"success": False, "jobs": [], "msg": "No jobs found with current criteria. Try adjusting your query or skills."}), 200

        # Deduplicate jobs based on a simple title+company+location key
        unique_jobs = {}
        for job in all_jobs:
            key = (job.get("title", "").lower(), job.get("company", "").lower(), job.get("location", "").lower())
            if key not in unique_jobs:
                unique_jobs[key] = job
            # Prioritize internal jobs if duplicates exist
            elif job.get("is_internal") and not unique_jobs[key].get("is_internal"):
                unique_jobs[key] = job

        return jsonify({
            "success": True,
            "jobs": list(unique_jobs.values()),
            "count": len(unique_jobs),
            "suggested_roles": suggested_roles if not query else []
        })

    except Exception as e:
        print(f"Search error: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@jobs_bp.route("/apply/<job_id>", methods=["POST"])
@jwt_required()
def apply_for_job(job_id):
    employee_id = get_jwt_identity()
    try:
        employee = User.objects.get(id=employee_id, role="employee")
        job = JobPosting.objects.get(id=job_id)

        # Check if already applied
        if job.id in employee.applied_jobs:
            return jsonify({"ok": False, "msg": "You have already applied for this job."}), 400
        
        for applicant in job.applicants:
            if str(applicant.candidate_id) == str(employee.id):
                return jsonify({"ok": False, "msg": "You have already applied for this job (employer side check)."}), 400


        # Get employee's latest profile and skills
        # For a full resume, you'd need to store the PDF or extracted text with the user.
        # For now, we use current user skills and a placeholder for resume text.
        resume_text_snapshot = employee.last_resume_analysis.text_preview if employee.last_resume_analysis else "Resume text not available"
        candidate_skills_snapshot = employee.skills

        # Perform ATS score calculation at the time of application
        job_description = job.description
        job_required_skills_set = set(s.lower() for s in job.skills_required)

        # Extract skills from candidate's resume snapshot
        candidate_extracted_skills = enhanced_skill_extraction_from_text(resume_text_snapshot)
        candidate_skills_set = set(s.lower() for s in candidate_extracted_skills)

        matched_skills = list(job_required_skills_set.intersection(candidate_skills_set))
        missing_skills = list(job_required_skills_set.difference(candidate_skills_set))

        match_score = (len(matched_skills) / len(job_required_skills_set) * 100) if job_required_skills_set else 0
        match_score = round(match_score, 2)

        # Create CandidateApplication embedded document
        application = CandidateApplication(
            candidate_id=employee.id,
            candidate_name=employee.name if employee.name else employee.email.split('@')[0],
            candidate_email=employee.email,
            resume_text=resume_text_snapshot,
            user_skills=candidate_skills_snapshot,
            ats_score=f"{match_score}%",
            match_percentage=f"{match_score}%",
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            applied_at=datetime.utcnow()
        )
        
        # Add application to job and employee's applied_jobs list
        job.applicants.append(application)
        job.save()
        
        employee.applied_jobs.append(job.id)
        employee.save()

        # Send real-time notification to employer
        employer_id = str(job.posted_by.id)
        notification_message = f"New applicant for your job '{job.title}': {employee.name if employee.name else employee.email} (ATS: {match_score}%)"
        notification_link = f"/employer/jobs/{job_id}/applicants" # Link to employer's job applicants view
        send_notification(employer_id, notification_message, type="job_application", link=notification_link)

        return jsonify({"ok": True, "msg": "Application submitted successfully!", "ats_score": match_score}), 200

    except DoesNotExist:
        return jsonify({"ok": False, "msg": "Job or Employee not found."}), 404
    except ValidationError as e:
        return jsonify({"ok": False, "msg": f"Validation error during application: {e}"}), 400
    except Exception as e:
        print(f"Error applying for job {job_id}: {e}")
        traceback.print_exc()
        return jsonify({"ok": False, "msg": "An error occurred while submitting your application."}), 500

@jobs_bp.route("/applied-jobs", methods=["GET"])
@jwt_required()
def get_applied_jobs():
    employee_id = get_jwt_identity()
    try:
        employee = User.objects.get(id=employee_id)
        applied_job_ids = employee.applied_jobs
        
        applied_jobs_details = []
        for job_id in applied_job_ids:
            try:
                job = JobPosting.objects.get(id=job_id)
                job_dict = job.to_mongo().to_dict()
                job_dict["id"] = str(job.id)
                job_dict["posted_by"] = str(job.posted_by.id)
                job_dict["posted_at"] = job.posted_at.isoformat()
                job_dict["source"] = "Internal" # All applied jobs are internal
                job_dict["is_internal"] = True
                
                # Find the specific application details for this employee
                application_details = None
                for app in job.applicants:
                    if str(app.candidate_id) == str(employee.id):
                        application_details = app.to_mongo().to_dict()
                        application_details["applied_at"] = application_details["applied_at"].isoformat()
                        break
                
                job_dict["my_application"] = application_details
                applied_jobs_details.append(job_dict)
            except DoesNotExist:
                print(f"Applied job {job_id} not found in DB, skipping.")
                # Optionally remove this job_id from employee.applied_jobs if it no longer exists
            except Exception as e:
                print(f"Error fetching details for applied job {job_id}: {e}")
        
        return jsonify({"ok": True, "applied_jobs": applied_jobs_details}), 200
    except DoesNotExist:
        return jsonify({"ok": False, "msg": "Employee not found"}), 404
    except Exception as e:
        print(f"Error fetching applied jobs: {e}")
        traceback.print_exc()
        return jsonify({"ok": False, "msg": "An error occurred"}), 500