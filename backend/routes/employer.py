# backend/routes/employer.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import JobPosting, User
from datetime import datetime
from bson import ObjectId
import google.generativeai as genai
from config import GEMINI_API_KEY

employer_bp = Blueprint("employer", __name__, url_prefix="/api/employer")

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

@employer_bp.route("/post_job", methods=["POST"])
@jwt_required()
def post_job():
    user_id = get_jwt_identity()
    employer = User.objects(id=user_id, role="employer").first()
    
    if not employer:
        return jsonify({"msg": "Not authorized. Employer role required."}), 403
    
    data = request.get_json() or {}
    
    if not data.get("title") or not data.get("description"):
        return jsonify({"msg": "Title and description are required"}), 400
    
    job = JobPosting(
        title=data.get("title"),
        company=data.get("company", employer.name or ""),
        description=data.get("description"),
        location=data.get("location", ""),
        salary=data.get("salary", ""),
        job_type=data.get("job_type", "Full-time"),
        skills_required=data.get("skills_required", []),
        posted_by=employer,
        posted_at=datetime.utcnow()
    )
    job.save()
    
    return jsonify({
        "msg": "Job posted successfully",
        "job_id": str(job.id)
    }), 201

@employer_bp.route("/my-jobs", methods=["GET"])
@jwt_required()
def my_jobs():
    user_id = get_jwt_identity()
    employer = User.objects(id=user_id, role="employer").first()
    
    if not employer:
        return jsonify({"msg": "Not authorized"}), 403
    
    jobs = JobPosting.objects(posted_by=user_id)
    
    jobs_list = []
    for job in jobs:
        jobs_list.append({
            "id": str(job.id),
            "title": job.title,
            "company": job.company,
            "description": job.description,
            "location": job.location,
            "salary": job.salary,
            "job_type": job.job_type,
            "skills_required": job.skills_required,
            "posted_at": job.posted_at.isoformat() if job.posted_at else None,
            "is_active": job.is_active,
            "applicants": [
                {
                    "candidate_id": str(app.candidate_id),
                    "candidate_name": app.candidate_name,
                    "candidate_email": app.candidate_email,
                    "ats_score": app.ats_score,
                    "matched_skills": app.matched_skills,
                    "missing_skills": app.missing_skills,
                    "applied_at": app.applied_at.isoformat() if app.applied_at else None,
                    "status": app.status
                }
                for app in job.applicants
            ]
        })
    
    return jsonify({"jobs": jobs_list}), 200

@employer_bp.route("/delete-job/<job_id>", methods=["DELETE"])
@jwt_required()
def delete_job(job_id):
    user_id = get_jwt_identity()
    
    try:
        job = JobPosting.objects(id=job_id, posted_by=user_id).first()
    except Exception:
        return jsonify({"msg": "Invalid job ID"}), 400
    
    if not job:
        return jsonify({"msg": "Job not found or unauthorized"}), 404
    
    job.delete()
    return jsonify({"msg": "Job deleted successfully"}), 200

@employer_bp.route("/job-applicants/<job_id>", methods=["GET"])
@jwt_required()
def get_job_applicants(job_id):
    user_id = get_jwt_identity()
    
    try:
        job = JobPosting.objects(id=job_id, posted_by=user_id).first()
    except Exception:
        return jsonify({"msg": "Invalid job ID"}), 400
    
    if not job:
        return jsonify({"msg": "Job not found or unauthorized"}), 404
    
    applicants = []
    for app in job.applicants:
        applicants.append({
            "candidate_id": str(app.candidate_id),
            "candidate_name": app.candidate_name,
            "candidate_email": app.candidate_email,
            "ats_score": app.ats_score,
            "matched_skills": app.matched_skills,
            "missing_skills": app.missing_skills,
            "applied_at": app.applied_at.isoformat() if app.applied_at else None,
            "status": app.status
        })
    
    return jsonify({"applicants": applicants}), 200

@employer_bp.route("/job_skills/suggest", methods=["POST"])
@jwt_required()
def suggest_job_skills():
    """Suggest skills for a job posting using Gemini AI"""
    user_id = get_jwt_identity()
    employer = User.objects(id=user_id, role="employer").first()
    
    if not employer:
        return jsonify({"msg": "Not authorized"}), 403
    
    data = request.get_json() or {}
    title = data.get("title", "")
    description = data.get("description", "")
    
    if not title and not description:
        return jsonify({"msg": "Please provide either job title or description"}), 400
    
    try:
        # Try different model names in order
        model_names = ['models/gemini-2.5-pro', 'models/gemini-2.5-flash', 'models/gemini-pro-latest', "models/gemma-3-27b-it"]
        model = None
        
        for model_name in model_names:
            try:
                model = genai.GenerativeModel(model_name)
                break
            except:
                continue
        
        if not model:
            return jsonify({"msg": "Could not initialize Gemini model"}), 500
        
        prompt = f"""Based on this job posting, suggest relevant technical skills:
Job Title: {title}
Job Description: {description}

Please provide:
1. Required Skills: Core technical skills absolutely needed for this role (5-8 skills)
2. Complementary Skills: Nice-to-have skills that would be beneficial (3-5 skills)

Return ONLY a JSON object in this exact format with no additional text:
{{
  "required_skills": ["skill1", "skill2", ...],
  "complementary_skills": ["skill1", "skill2", ...]
}}"""
        
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Clean up the response
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        
        result_text = result_text.strip()
        
        import json
        skills_data = json.loads(result_text)
        
        return jsonify({
            "required_skills": skills_data.get("required_skills", []),
            "complementary_skills": skills_data.get("complementary_skills", [])
        }), 200
        
    except Exception as e:
        print(f"Error suggesting skills: {e}")
        return jsonify({
            "msg": "Failed to suggest skills",
            "error": str(e)
        }), 500
@employer_bp.route("/list-models", methods=["GET"])
def list_models():
    """Debug: List available Gemini models"""
    try:
        models = genai.list_models()
        model_list = []
        for m in models:
            if 'generateContent' in m.supported_generation_methods:
                model_list.append(m.name)
        return jsonify({"models": model_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@employer_bp.route("/analyze-candidate/<job_id>", methods=["POST"])
@jwt_required()
def analyze_candidate_ats(job_id):
    """Analyze a candidate's ATS score for a specific job"""
    user_id = get_jwt_identity()
    
    try:
        job = JobPosting.objects(id=job_id, posted_by=user_id).first()
    except Exception:
        return jsonify({"msg": "Invalid job ID"}), 400
    
    if not job:
        return jsonify({"msg": "Job not found or unauthorized"}), 404
    
    data = request.get_json() or {}
    candidate_id = data.get("candidate_id")
    
    if not candidate_id:
        return jsonify({"msg": "Candidate ID required"}), 400
    
    # Find the candidate in applicants
    candidate_app = None
    for app in job.applicants:
        if str(app.candidate_id) == str(candidate_id):
            candidate_app = app
            break
    
    if not candidate_app:
        return jsonify({"msg": "Candidate not found for this job"}), 404
    
    try:
        # Calculate ATS score
        matched = set(candidate_app.matched_skills)
        required = set(job.skills_required)
        
        if len(required) > 0:
            score = int((len(matched) / len(required)) * 100)
        else:
            score = 0
        
        # Update the candidate's ATS score
        candidate_app.ats_score = f"{score}%"
        job.save()
        
        return jsonify({
            "score": score,
            "matched_skills": list(matched),
            "missing_skills": list(required - matched)
        }), 200
        
    except Exception as e:
        print(f"Error analyzing candidate: {e}")
        return jsonify({
            "msg": "Failed to analyze candidate",
            "error": str(e)
        }), 500