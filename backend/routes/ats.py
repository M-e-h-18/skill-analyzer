from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import textrazor, os
from dotenv import load_dotenv

ats_bp = Blueprint("ats", __name__, url_prefix="/api/ats")

load_dotenv()
textrazor.api_key = os.getenv("TEXTRAZOR_API_KEY")

base_skills = [
    "python", "java", "javascript", "react", "nodejs", "sql", "mongodb",
    "html", "css", "angular", "vue", "docker", "kubernetes", "aws",
    "azure", "git", "agile", "scrum", "ci/cd", "rest api"
]


def extract_keywords(text):
    """Use TextRazor to extract keywords/entities."""
    client = textrazor.TextRazor(extractors=["entities", "topics", "words"])
    response = client.analyze(text)
    keywords = set()
    for entity in response.entities():
        if entity.confidence_score > 4.0:
            keywords.add(entity.id.lower())
    for topic in response.topics():
        if topic.score > 0.3:
            keywords.add(topic.label.lower())
    return keywords


'''@ats_bp.route("/analyze", methods=["POST"])
def analyze_ats():
    try:
        data = request.get_json()
        print("Received data:", data)  # Debug log

        resume_text = data.get("resume_text")
        job_description = data.get("job_description")

        if not resume_text or not job_description:
            return jsonify({"error": "Missing resume or job description"}), 400

        # Extract skills using TextRazor
        client = textrazor.TextRazor(extractors=["entities", "topics"])
        
        # Process resume
        print("Analyzing resume...")  # Debug log
        resume_response = client.analyze(resume_text)
        resume_skills = set()
        for entity in resume_response.entities():
            if entity.relevance_score > 0.1:  # Lowered threshold
                resume_skills.add(entity.matched_text.lower())
        print("Resume skills:", resume_skills)  # Debug log

        # Process job description
        print("Analyzing job description...")  # Debug log
        job_response = client.analyze(job_description)
        job_skills = set()
        for entity in job_response.entities():
            if entity.relevance_score > 0.1:  # Lowered threshold
                job_skills.add(entity.matched_text.lower())
        print("Job skills:", job_skills)  # Debug log

        # Calculate matches
        matched_skills = resume_skills.intersection(job_skills)
        print("Matched skills:", matched_skills)  # Debug log

        # Calculate score
        if len(job_skills) > 0:
            score = (len(matched_skills) / len(job_skills)) * 100
        else:
            score = 0

        result = {
            "score": round(score, 2),
            "matched_skills": list(matched_skills),
            "required_skills": list(job_skills),
            "found_skills": list(resume_skills)
        }
        print("Final result:", result)  # Debug log
        return jsonify(result)

    except Exception as e:
        print(f"Error in ATS analysis: {str(e)}")
        return jsonify({"error": str(e)}), 500'''