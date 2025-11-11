from flask import Blueprint, request, jsonify
import textrazor
import os
from dotenv import load_dotenv

ats_bp = Blueprint("ats", __name__, url_prefix="/api/ats")

load_dotenv()
textrazor.api_key = os.getenv("TEXTRAZOR_API_KEY")

def extract_skills_with_textrazor(text):
    """Extract relevant skills from text using TextRazor API."""
    if not text.strip():
        return []

    client = textrazor.TextRazor(extractors=["entities", "topics"])
    response = client.analyze(text)
    skills = set()

    # Extract entities based on relevance
    for entity in response.entities():
        if hasattr(entity, 'relevance_score') and entity.relevance_score > 0.1:
            skills.add(entity.matched_text.lower())

    # Extract topics based on score
    for topic in response.topics():
        if hasattr(topic, 'score') and topic.score > 0.3:
            skills.add(topic.label.lower())

    return list(skills)

@ats_bp.route("/analyze", methods=["POST"])
def analyze_ats():
    try:
        data = request.get_json()
        resume_text = data.get("resume_text", "")
        job_description = data.get("job_description", "")

        if not resume_text or not job_description:
            return jsonify({"error": "Missing resume or job description"}), 400

        # Extract skills
        resume_skills = extract_skills_with_textrazor(resume_text)
        job_skills = extract_skills_with_textrazor(job_description)

        # Compute matched skills and score
        matched_skills = list(set(resume_skills).intersection(set(job_skills)))
        score = round((len(matched_skills) / len(job_skills) * 100), 2) if job_skills else 0

        return jsonify({
            "score": score,
            "matched_skills": matched_skills,
            "required_skills": job_skills,
            "found_skills": resume_skills
        })

    except textrazor.TextRazorAnalysisException as tre:
        return jsonify({"error": f"TextRazor API error: {str(tre)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
