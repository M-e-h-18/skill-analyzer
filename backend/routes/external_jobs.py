from flask import Blueprint, jsonify
import requests

external_jobs = Blueprint("external_jobs", __name__)

@external_jobs.route("/external/github", methods=["GET"])
def github_jobs():
    url = "https://jobs.github.com/positions.json?description=python"
    response = requests.get(url)
    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": "Failed to fetch from GitHub"}), 500


@external_jobs.route("/external/linkedin", methods=["GET"])
def linkedin_jobs():
    # You’ll replace this with LinkedIn Jobs API or another source
    # (for now, returning dummy response)
    return jsonify([
        {"title": "Data Analyst Intern", "company": "LinkedIn", "location": "Bangalore"},
        {"title": "Software Engineer", "company": "LinkedIn", "location": "Hyderabad"}
    ])
