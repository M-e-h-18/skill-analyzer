from flask import Blueprint, request, jsonify
from models import JobPosting
from flask_jwt_extended import jwt_required, get_jwt_identity

jobs = Blueprint('jobs', __name__)

@jobs.route('/api/jobs', methods=['POST'])
@jwt_required()
def create_job():
    current_user = get_jwt_identity()
    data = request.get_json()
    
    job = JobPosting(
        title=data['title'],
        company=data['company'],
        description=data['description'],
        requirements=data['requirements'],
        salary_range=data.get('salary_range'),
        location=data.get('location'),
        remote=data.get('remote', False),
        employer_id=current_user
    )
    job.save()
    return jsonify({'message': 'Job posted successfully'}), 201

@jobs.route('/api/jobs', methods=['GET'])
@jwt_required()
def get_jobs():
    jobs = JobPosting.objects(status='active')
    return jsonify([{
        'id': str(job.id),
        'title': job.title,
        'company': job.company,
        'description': job.description,
        'requirements': job.requirements,
        'salary_range': job.salary_range,
        'location': job.location,
        'remote': job.remote,
        'created_at': job.created_at.isoformat()
    } for job in jobs]), 200