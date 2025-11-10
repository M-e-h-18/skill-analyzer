# backend/routes/employer.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import JobPosting, User
from datetime import datetime

employer_bp = Blueprint("employer", __name__, url_prefix="/api/employer")

@employer_bp.route("/post_job", methods=["POST"])
@jwt_required()
def post_job():
    user_id = get_jwt_identity()
    employer = User.objects(id=user_id, role="employer").first()
    if not employer:
        return jsonify({"error": "Not authorized"}), 403

    data = request.get_json() or {}
    job = JobPosting(
        title=data.get("title"),
        company=data.get("company"),
        description=data.get("description"),
        location=data.get("location"),
        salary=data.get("salary"),
        job_type=data.get("job_type", "Full-time"),
        skills_required=data.get("skills_required", []),
        posted_by=employer,
        posted_at=datetime.utcnow()
    )
    job.save()
    return jsonify({"message": "Job posted successfully", "job_id": str(job.id)}), 201


@employer_bp.route("/my-jobs", methods=["GET"])
@jwt_required()
def my_jobs():
    user_id = get_jwt_identity()
    jobs = JobPosting.objects(posted_by=user_id)
    return jsonify(jobs), 200


@employer_bp.route("/delete-job/<job_id>", methods=["DELETE"])
@jwt_required()
def delete_job(job_id):
    user_id = get_jwt_identity()
    job = JobPosting.objects(id=job_id, posted_by=user_id).first()
    if not job:
        return jsonify({"error": "Job not found or unauthorized"}), 404
    job.delete()
    return jsonify({"message": "Job deleted successfully"}), 200
