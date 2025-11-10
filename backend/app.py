from flask import Flask, request, jsonify, Blueprint
from flask_cors import CORS
from pymongo import MongoClient
import pymongo
from mongoengine import connect, DoesNotExist, ValidationError
from models import User, JobPosting, CandidateApplication, Notification # Import your MongoEngine models

from routes.external_jobs import external_jobs
from flask_jwt_extended import (
    create_access_token, JWTManager, jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
import os, datetime, fitz, json, re
import google.generativeai as genai
from dotenv import load_dotenv
from bson import ObjectId
import re
import json
import fitz  # PyMuPDF
from collections import defaultdict
from routes.employer import employer_bp
import requests
from routes.ats import ats_bp
import textrazor
import traceback
from flask_socketio import SocketIO, emit, join_room, leave_room # Import SocketIO

load_dotenv()

ADZUNA_APP_ID = os.getenv('ADZUNA_APP_ID')
ADZUNA_API_KEY = os.getenv('ADZUNA_API_KEY')
textrazor.api_key = os.getenv("TEXTRAZOR_API_KEY")

ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs"
ADZUNA_SEARCH_COUNTRY = "in"
app = Flask(__name__)
CORS(app, 
     supports_credentials=True,
     resources={r"/api/*": {"origins": "*"}},
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

# SocketIO Setup
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True, manage_session=False)


@app.route("/api/job_outlook", methods=["POST"])
def job_outlook():
    data = request.json or {}
    job_title = data.get("job_title", "")
    countries = data.get("countries", ["in", "gb"])  # Default: India and UK

    if not job_title:
        return jsonify({"ok": False, "msg": "Job title required"}), 400

    if not ADZUNA_APP_ID or not ADZUNA_API_KEY:
        print("Adzuna API credentials not found in environment variables.")
        return jsonify({"ok": False, "msg": "Adzuna API credentials not configured"}), 500

    try:
        results = {}

        for country_code in countries:
            country_name = "India" if country_code == "in" else "UK" if country_code == "gb" else country_code.upper()

            current_data = fetch_adzuna_data(job_title, country_code, ADZUNA_APP_ID, ADZUNA_API_KEY, max_age_days=30)
            historical_6m = fetch_adzuna_data(job_title, country_code, ADZUNA_APP_ID, ADZUNA_API_KEY, max_age_days=180)
            historical_12m = fetch_adzuna_data(job_title, country_code, ADZUNA_APP_ID, ADZUNA_API_KEY, max_age_days=365)


            job_growth = calculate_growth_trend(
                historical_12m.get("total_jobs", 0),
                historical_6m.get("total_jobs", 0),
                current_data.get("total_jobs", 0)
            )

            salary_growth = calculate_growth_trend(
                historical_12m.get("avg_salary", 0),
                historical_6m.get("avg_salary", 0),
                current_data.get("avg_salary", 0)
            )

            results[country_code] = {
                "country": country_name,
                "country_code": country_code,
                "demand": current_data.get("demand_score", 0),
                "salary": current_data.get("avg_salary", 0),
                "currency": "INR" if country_code == "in" else "GBP" if country_code == "gb" else "USD",
                "is_remote_friendly": current_data.get("is_remote_friendly", False),
                "total_jobs_found": current_data.get("total_jobs", 0),
                "trends": {
                    "job_growth_6m": job_growth.get("6m", 0),
                    "job_growth_12m": job_growth.get("12m", 0),
                    "salary_growth_6m": salary_growth.get("6m", 0),
                    "salary_growth_12m": salary_growth.get("12m", 0),
                    "trend_direction": "growing" if job_growth.get("12m", 0) > 5 else "declining" if job_growth.get("12m", 0) < -5 else "stable"
                },
                "historical": {
                    "6_months_ago": {
                        "total_jobs": historical_6m.get("total_jobs", 0),
                        "avg_salary": historical_6m.get("avg_salary", 0)
                    },
                    "12_months_ago": {
                        "total_jobs": historical_12m.get("total_jobs", 0),
                        "avg_salary": historical_12m.get("avg_salary", 0)
                    },
                    "current": {
                        "total_jobs": current_data.get("total_jobs", 0),
                        "avg_salary": current_data.get("avg_salary", 0)
                    }
                }
            }

        return jsonify({
            "ok": True,
            "job_title": job_title,
            "countries": results,
            "comparison": compare_countries(results)
        })

    except requests.exceptions.RequestException as e:
        print(f"Adzuna API request error for '{job_title}': {e}")
        return jsonify({"ok": False, "msg": f"Failed to fetch job outlook: {str(e)}"}), 500
    except Exception as e:
        print(f"Error in job outlook processing for '{job_title}': {e}")
        traceback.print_exc() # Print full traceback
        return jsonify({"ok": False, "msg": f"An unexpected error occurred: {str(e)}"}), 500


def fetch_adzuna_data(job_title, country, app_id, app_key, max_age_days=None):
    """Fetch current or approximate historical Adzuna data using the search endpoint."""
    adzuna_params = {
        "app_id": app_id,
        "app_key": app_key,
        "results_per_page": 50, # Increased for better salary averaging
        "what": job_title,
        "content-type": "application/json",
    }

    if max_age_days:
        adzuna_params["max_days_old"] = max_age_days

    adzuna_url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"

    print(f"Calling Adzuna API for '{job_title}' in '{country.upper()}' with max_days_old={max_age_days}")
    response = requests.get(adzuna_url, params=adzuna_params, timeout=10)
    response.raise_for_status()
    adzuna_data = response.json()

    jobs_found = adzuna_data.get("results", [])
    total_jobs = adzuna_data.get("count", 0)

    demand_score = 0
    if total_jobs > 0:
        if total_jobs < 50: demand_score = 10 + (total_jobs // 2)
        elif total_jobs < 200: demand_score = 35 + ((total_jobs - 50) // 5)
        elif total_jobs < 1000: demand_score = 65 + ((total_jobs - 200) // 30)
        else: demand_score = min(91 + ((total_jobs - 1000) // 500), 100)
    demand_score = max(0, min(100, demand_score))

    salaries = []
    remote_count = 0
    on_site_count = 0

    for job in jobs_found:
        min_sal = job.get("salary_min")
        max_sal = job.get("salary_max")

        if min_sal and max_sal:
            salaries.append((min_sal + max_sal) / 2)
        elif min_sal:
            salaries.append(min_sal)
        elif max_sal:
            salaries.append(max_sal)

        title_lower = job.get("title", "").lower()
        description_lower = job.get("description", "").lower()

        remote_keywords = ["remote", "work from home", "wfh", "hybrid", "flexible"]
        if any(kw in title_lower or kw in description_lower for kw in remote_keywords):
            remote_count += 1
        else:
            on_site_count += 1

    avg_salary = int(sum(salaries) / len(salaries)) if salaries else 0
    is_remote_friendly = (remote_count / total_jobs) > 0.2 if total_jobs > 0 else False

    return {
        "total_jobs": total_jobs,
        "demand_score": demand_score,
        "avg_salary": avg_salary,
        "is_remote_friendly": is_remote_friendly,
        "remote_count": remote_count,
        "on_site_count": on_site_count
    }

def calculate_growth_trend(old_value, mid_value, current_value):
    """Calculate percentage growth over time periods, handling zero values."""
    growth_6m = 0
    growth_12m = 0

    if mid_value > 0:
        growth_6m = round(((current_value - mid_value) / mid_value) * 100, 1)
    elif current_value > 0:
        growth_6m = 1000

    if old_value > 0:
        growth_12m = round(((current_value - old_value) / old_value) * 100, 1)
    elif current_value > 0:
        growth_12m = 1000

    return {
        "6m": growth_6m,
        "12m": growth_12m
    }

def compare_countries(results):
    """Compare data across countries"""
    if len(results) < 2:
        return {}

    comparison = {
        "highest_demand": None,
        "highest_salary": None,
        "best_growth": None,
        "most_remote_friendly": None
    }

    max_demand = -1
    for code, data in results.items():
        if data["demand"] > max_demand:
            max_demand = data["demand"]
            comparison["highest_demand"] = {
                "country": data["country"],
                "value": data["demand"]
            }

    max_salary = -1
    for code, data in results.items():
        if data["salary"] > max_salary:
            max_salary = data["salary"]
            comparison["highest_salary"] = {
                "country": data["country"],
                "value": data["salary"],
                "currency": data["currency"]
            }

    max_growth = -float('inf')
    for code, data in results.items():
        growth = data["trends"]["job_growth_12m"]
        if growth > max_growth:
            max_growth = growth
            comparison["best_growth"] = {
                "country": data["country"],
                "value": growth
            }

    max_remote_jobs = -1
    for code, data in results.items():
        remote_count_for_country = data.get("remote_count", 0)
        if remote_count_for_country > max_remote_jobs:
            max_remote_jobs = remote_count_for_country
            comparison["most_remote_friendly"] = {
                "country": data["country"],
                "value": remote_count_for_country
            }

    return comparison
# ------------------------------
# Flask App Setup
# ------------------------------

# JWT Setup
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "super-secret-jwt-key")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = datetime.timedelta(hours=24)
jwt = JWTManager(app)

# MongoDB Setup using MongoEngine
MONGO_URI = os.getenv("MONGODB_URI")
MONGO_DBNAME = os.getenv("MONGO_DBNAME", "skill_graph_db")
connect(db=MONGO_DBNAME, host=MONGO_URI)

# Gemini API Setup
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-1.5-flash")
else:
    print("⚠️ GEMINI_API_KEY not found. Gemini features disabled.")
    gemini_model = None

# Uploads folder
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ------------------------------
# PDF Text Extraction Function
# ------------------------------
def extract_text_from_pdf(file_path):
    """Extract text from PDF file"""
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""

# ------------------------------
# Enhanced Skills Database & Helpers
# ------------------------------
COMPREHENSIVE_SKILLS_DB = {
    "JavaScript": {"category": "Programming Languages", "aliases": ["js", "javascript", "ecmascript"], "weight": 1.0},
    "Python": {"category": "Programming Languages", "aliases": ["python3", "py"], "weight": 1.0},
    "Java": {"category": "Programming Languages", "aliases": ["java"], "weight": 1.0},
    "TypeScript": {"category": "Programming Languages", "aliases": ["ts", "typescript"], "weight": 1.0},
    "C++": {"category": "Programming Languages", "aliases": ["cpp", "c++", "cplusplus"], "weight": 1.0},
    "C#": {"category": "Programming Languages", "aliases": ["csharp", "c#"], "weight": 1.0},
    "C": {"category": "Programming Languages", "aliases": ["c"], "weight": 1.0},
    "Go": {"category": "Programming Languages", "aliases": ["golang", "go"], "weight": 1.0},
    "Rust": {"category": "Programming Languages", "aliases": ["rust"], "weight": 1.0},
    "PHP": {"category": "Programming Languages", "aliases": ["php"], "weight": 1.0},
    "Ruby": {"category": "Programming Languages", "aliases": ["ruby"], "weight": 1.0},
    "Swift": {"category": "Programming Languages", "aliases": ["swift"], "weight": 1.0},
    "Kotlin": {"category": "Programming Languages", "aliases": ["kotlin"], "weight": 1.0},
    "Dart": {"category": "Programming Languages", "aliases": ["dart"], "weight": 1.0},
    "Scala": {"category": "Programming Languages", "aliases": ["scala"], "weight": 1.0},
    "R": {"category": "Programming Languages", "aliases": ["r"], "weight": 1.0},
    "MATLAB": {"category": "Programming Languages", "aliases": ["matlab"], "weight": 1.0},
    
    "React": {"category": "Frontend Frameworks", "aliases": ["reactjs", "react.js"], "weight": 1.0},
    "Angular": {"category": "Frontend Frameworks", "aliases": ["angularjs", "angular"], "weight": 1.0},
    "Vue.js": {"category": "Frontend Frameworks", "aliases": ["vue", "vuejs"], "weight": 1.0},
    "Next.js": {"category": "Frontend Frameworks", "aliases": ["nextjs", "next"], "weight": 1.0},
    "Nuxt.js": {"category": "Frontend Frameworks", "aliases": ["nuxtjs", "nuxt"], "weight": 1.0},
    "Svelte": {"category": "Frontend Frameworks", "aliases": ["svelte"], "weight": 1.0},
    "HTML": {"category": "Web Technologies", "aliases": ["html5", "html"], "weight": 0.8},
    "CSS": {"category": "Web Technologies", "aliases": ["css3", "css"], "weight": 0.8},
    "Sass": {"category": "Web Technologies", "aliases": ["scss", "sass"], "weight": 0.9},
    "Tailwind CSS": {"category": "Web Technologies", "aliases": ["tailwind", "tailwindcss"], "weight": 0.9},
    "Bootstrap": {"category": "Web Technologies", "aliases": ["bootstrap"], "weight": 0.8},
    "jQuery": {"category": "Web Technologies", "aliases": ["jquery"], "weight": 0.7},
    
    "Node.js": {"category": "Backend Technologies", "aliases": ["nodejs", "node"], "weight": 1.0},
    "Express.js": {"category": "Backend Technologies", "aliases": ["express", "expressjs"], "weight": 0.9},
    "Django": {"category": "Backend Technologies", "aliases": ["django"], "weight": 1.0},
    "Flask": {"category": "Backend Technologies", "aliases": ["flask"], "weight": 0.9},
    "FastAPI": {"category": "Backend Technologies", "aliases": ["fastapi"], "weight": 0.9},
    "Spring": {"category": "Backend Technologies", "aliases": ["spring boot", "spring"], "weight": 1.0},
    "ASP.NET": {"category": "Backend Technologies", "aliases": ["asp.net", "aspnet"], "weight": 1.0},
    "Laravel": {"category": "Backend Technologies", "aliases": ["laravel"], "weight": 0.9},
    "Ruby on Rails": {"category": "Backend Technologies", "aliases": ["rails", "ror"], "weight": 1.0},
    
    "MySQL": {"category": "Databases", "aliases": ["mysql"], "weight": 1.0},
    "PostgreSQL": {"category": "Databases", "aliases": ["postgres", "postgresql"], "weight": 1.0},
    "MongoDB": {"category": "Databases", "aliases": ["mongo", "mongodb"], "weight": 1.0},
    "Redis": {"category": "Databases", "aliases": ["redis"], "weight": 0.9},
    "SQLite": {"category": "Databases", "aliases": ["sqlite"], "weight": 0.8},
    "Oracle": {"category": "Databases", "aliases": ["oracle db", "oracle"], "weight": 1.0},
    "SQL Server": {"category": "Databases", "aliases": ["sqlserver", "mssql"], "weight": 1.0},
    "Cassandra": {"category": "Databases", "aliases": ["cassandra"], "weight": 0.9},
    "DynamoDB": {"category": "Databases", "aliases": ["dynamodb"], "weight": 0.9},
    "Elasticsearch": {"category": "Databases", "aliases": ["elasticsearch", "elastic"], "weight": 0.9},
    
    "AWS": {"category": "Cloud Platforms", "aliases": ["amazon web services", "aws"], "weight": 1.0},
    "Azure": {"category": "Cloud Platforms", "aliases": ["microsoft azure", "azure"], "weight": 1.0},
    "GCP": {"category": "Cloud Platforms", "aliases": ["google cloud", "gcp", "google cloud platform"], "weight": 1.0},
    "Heroku": {"category": "Cloud Platforms", "aliases": ["heroku"], "weight": 0.8},
    "DigitalOcean": {"category": "Cloud Platforms", "aliases": ["digitalocean", "digital ocean"], "weight": 0.8},
    "Vercel": {"category": "Cloud Platforms", "aliases": ["vercel"], "weight": 0.7},
    "Netlify": {"category": "Cloud Platforms", "aliases": ["netlify"], "weight": 0.7},
    
    "Docker": {"category": "DevOps Tools", "aliases": ["docker"], "weight": 1.0},
    "Kubernetes": {"category": "DevOps Tools", "aliases": ["k8s", "kubernetes"], "weight": 1.0},
    "Jenkins": {"category": "DevOps Tools", "aliases": ["jenkins"], "weight": 0.9},
    "GitLab CI": {"category": "DevOps Tools", "aliases": ["gitlab ci/cd", "gitlab ci"], "weight": 0.9},
    "GitHub Actions": {"category": "DevOps Tools", "aliases": ["github actions"], "weight": 0.9},
    "Terraform": {"category": "DevOps Tools", "aliases": ["terraform"], "weight": 1.0},
    "Ansible": {"category": "DevOps Tools", "aliases": ["ansible"], "weight": 0.9},
    "Vagrant": {"category": "DevOps Tools", "aliases": ["vagrant"], "weight": 0.8},
    
    "Git": {"category": "Version Control", "aliases": ["git"], "weight": 0.9},
    "GitHub": {"category": "Version Control", "aliases": ["github"], "weight": 0.8},
    "GitLab": {"category": "Version Control", "aliases": ["gitlab"], "weight": 0.8},
    "Bitbucket": {"category": "Version Control", "aliases": ["bitbucket"], "weight": 0.8},
    "SVN": {"category": "Version Control", "aliases": ["subversion", "svn"], "weight": 0.7},
    
    "React Native": {"category": "Mobile Development", "aliases": ["react native", "react-native"], "weight": 1.0},
    "Flutter": {"category": "Mobile Development", "aliases": ["flutter"], "weight": 1.0},
    "iOS Development": {"category": "Mobile Development", "aliases": ["ios", "ios development"], "weight": 1.0},
    "Android Development": {"category": "Mobile Development", "aliases": ["android", "android development"], "weight": 1.0},
    "Xamarin": {"category": "Mobile Development", "aliases": ["xamarin"], "weight": 0.9},
    "Ionic": {"category": "Mobile Development", "aliases": ["ionic"], "weight": 0.8},
    
    "Machine Learning": {"category": "Data Science & AI", "aliases": ["ml", "machine learning"], "weight": 1.0},
    "Deep Learning": {"category": "Data Science & AI", "aliases": ["deep learning", "dl"], "weight": 1.0},
    "TensorFlow": {"category": "Data Science & AI", "aliases": ["tensorflow", "tf"], "weight": 1.0},
    "PyTorch": {"category": "Data Science & AI", "aliases": ["pytorch", "torch"], "weight": 1.0},
    "Scikit-learn": {"category": "Data Science & AI", "aliases": ["sklearn", "scikit-learn"], "weight": 0.9},
    "Pandas": {"category": "Data Science & AI", "aliases": ["pandas"], "weight": 0.9},
    "NumPy": {"category": "Data Science & AI", "aliases": ["numpy"], "weight": 0.9},
    "Matplotlib": {"category": "Data Science & AI", "aliases": ["matplotlib"], "weight": 0.8},
    "Seaborn": {"category": "Data Science & AI", "aliases": ["seaborn"], "weight": 0.8},
    "Jupyter": {"category": "Data Science & AI", "aliases": ["jupyter notebook", "jupyter"], "weight": 0.8},
    "OpenCV": {"category": "Data Science & AI", "aliases": ["opencv", "cv2"], "weight": 0.9},
    "NLP": {"category": "Data Science & AI", "aliases": ["natural language processing", "nlp"], "weight": 0.9},
    "Computer Vision": {"category": "Data Science & AI", "aliases": ["computer vision", "cv"], "weight": 0.9},
    
    "Jest": {"category": "Testing", "aliases": ["jest"], "weight": 0.8},
    "Mocha": {"category": "Testing", "aliases": ["mocha"], "weight": 0.8},
    "Cypress": {"category": "Testing", "aliases": ["cypress"], "weight": 0.8},
    "Selenium": {"category": "Testing", "aliases": ["selenium"], "weight": 0.9},
    "Pytest": {"category": "Testing", "aliases": ["pytest"], "weight": 0.8},
    "Unit Testing": {"category": "Testing", "aliases": ["unit testing", "unit test"], "weight": 0.7},
    
    "Linux": {"category": "Operating Systems", "aliases": ["linux", "ubuntu", "centos"], "weight": 0.9},
    "Windows": {"category": "Operating Systems", "aliases": ["windows"], "weight": 0.7},
    "macOS": {"category": "Operating Systems", "aliases": ["macos", "mac os"], "weight": 0.7},
    
    "GraphQL": {"category": "APIs", "aliases": ["graphql"], "weight": 0.9},
    "REST API": {"category": "APIs", "aliases": ["rest", "restful", "rest api"], "weight": 0.9},
    "Microservices": {"category": "Architecture", "aliases": ["microservices"], "weight": 1.0},
    "API Design": {"category": "APIs", "aliases": ["api design"], "weight": 0.8},
    "Agile": {"category": "Methodologies", "aliases": ["agile", "scrum"], "weight": 0.7},
    "CI/CD": {"category": "DevOps Tools", "aliases": ["ci/cd", "continuous integration"], "weight": 0.9},
}

mock_skills_list = list(COMPREHENSIVE_SKILLS_DB.keys())
mock_skills_data = {}

for skill, info in COMPREHENSIVE_SKILLS_DB.items():
    mock_skills_data[skill] = {
        "category": info["category"],
        "weight": info["weight"],
        "aliases": info.get("aliases", [])
    }

def enhanced_skill_extraction_from_text(text):
    if not text or len(text.strip()) < 10:
        return []
    
    text = re.sub(r'\s+', ' ', text)
    text_lower = text.lower()
    
    found_skills = {}
    
    for skill_name, skill_info in COMPREHENSIVE_SKILLS_DB.items():
        max_confidence = 0
        all_names = [skill_name] + skill_info.get("aliases", [])
        
        for name in all_names:
            name_lower = name.lower()
            
            if len(name_lower) <= 1:
                continue
                
            positions = []
            start = 0
            while True:
                pos = text_lower.find(name_lower, start)
                if pos == -1:
                    break
                positions.append(pos)
                start = pos + 1
            
            for pos in positions:
                before_ok = (pos == 0 or not text_lower[pos-1].isalnum())
                after_ok = (pos + len(name_lower) >= len(text_lower) or 
                           not text_lower[pos + len(name_lower)].isalnum())
                
                if before_ok and after_ok:
                    confidence = calculate_skill_confidence(text_lower, pos, name_lower, skill_info)
                    max_confidence = max(max_confidence, confidence)
        
        if max_confidence > 0.3:
            found_skills[skill_name] = max_confidence * skill_info.get("weight", 1.0)
    
    sorted_skills = sorted(found_skills.items(), key=lambda x: x[1], reverse=True)
    
    result_skills = []
    for skill_name, confidence in sorted_skills:
        if confidence > 0.4 and len(result_skills) < 25:
            result_skills.append(skill_name)
    
    return result_skills

def calculate_skill_confidence(text, position, skill_name, skill_info):
    confidence = 0.5
    
    context_start = max(0, position - 100)
    context_end = min(len(text), position + len(skill_name) + 100)
    context = text[context_start:context_end]
    
    positive_indicators = [
        "experience", "worked", "using", "with", "in", "knowledge", "familiar", 
        "proficient", "expert", "skilled", "developed", "built", "created", 
        "implemented", "programming", "coding", "development", "project",
        "years", "months", "framework", "library", "language", "database",
        "tool", "platform", "technology", "stack", "api", "application"
    ]
    
    negative_indicators = [
        "learning", "want to learn", "interested in", "planning to", 
        "considering", "might", "could", "should", "wish", "hope"
    ]
    
    positive_count = sum(1 for indicator in positive_indicators if indicator in context)
    confidence += min(0.3, positive_count * 0.1)
    
    negative_count = sum(1 for indicator in negative_indicators if indicator in context)
    confidence -= min(0.4, negative_count * 0.2)
    
    technical_sections = [
        "technical skills", "programming", "technologies", "experience", 
        "projects", "work experience", "skills", "expertise", "tools"
    ]
    if any(section in context for section in technical_sections):
        confidence += 0.2
    
    return min(1.0, max(0.0, confidence))

def create_improved_gemini_prompt(resume_text):
    example_skills = list(COMPREHENSIVE_SKILLS_DB.keys())[:30]
    
    return f"""
CRITICAL: Extract ONLY technical skills that are explicitly mentioned in this resume. Do NOT invent skills.

Return ONLY valid JSON in this format:
{{
    "extractedSkills": ["skill1", "skill2", "skill3"]
}}

RULES:
1. ONLY include skills clearly mentioned in the resume
2. Use standard names (e.g., "JavaScript" not "JS")
3. Maximum 15 skills to avoid noise
4. Focus on technical skills: programming languages, frameworks, tools, databases
5. Examples: {', '.join(example_skills[:15])}

Resume Text:
{resume_text[:2500]}

Return only JSON, no explanation.
"""
@app.route("/api/skills/map", methods=["POST"])
@jwt_required(optional=True)
def map_skill():
    data = request.json or {}
    skill = data.get("skill")
    
    if not skill:
        return jsonify({"ok": False, "msg": "Skill required"}), 400
    
    # Use Gemini to map/standardize the skill name
    if gemini_model:
        try:
            prompt = f"Standardize this skill name to match industry standards: '{skill}'. Return only the standardized name, nothing else."
            result = gemini_model.generate_content(prompt)
            if result and result.candidates:
                mapped = result.candidates[0].content.parts[0].text.strip()
                return jsonify({"ok": True, "mapped_skill": mapped})
        except Exception as e:
            print(f"Gemini mapping error: {e}")
    
    # Fallback: return original skill
    return jsonify({"ok": True, "mapped_skill": skill})
def create_job_skill_suggestion_prompt(job_description, job_title=""):
    """
    Creates a prompt for Gemini to suggest required and complementary skills for a job.
    """
    example_skills = list(COMPREHENSIVE_SKILLS_DB.keys())[:20]

    return f"""
CRITICAL: Analyze the following job {job_title if job_title else "description"} and suggest the MOST RELEVANT
technical skills a candidate should possess. Also, suggest a few complementary skills that would make a candidate stand out.

Return ONLY valid JSON in this format:
{{
    "requiredSkills": ["skill1", "skill2"],
    "complementarySkills": ["skillX", "skillY"]
}}

RULES:
1. REQUIRED_SKILLS: Extract 5-10 core technical skills explicitly mentioned or strongly implied.
2. COMPLEMENTARY_SKILLS: Suggest 2-5 additional technical skills that are often paired with the required skills
   for this type of role, even if not explicitly mentioned.
3. Use standard names (e.g., "JavaScript" not "JS", "Kubernetes" not "K8s").
4. Focus on technical skills: programming languages, frameworks, tools, databases, cloud, DevOps, AI/ML.
5. Examples of skills: {', '.join(example_skills)}

Job Title: {job_title}
Job Description:
{job_description[:3000]}

Return only JSON, no explanation.
"""

def suggest_complementary_skills(extracted_skills, max_suggestions=6):
    if not extracted_skills:
        return ["Git", "Linux", "Docker", "REST API", "SQL", "Testing"]
    
    suggestions = set()
    
    skill_pairings = {
        "JavaScript": ["TypeScript", "Node.js", "React", "HTML", "CSS"],
        "Python": ["Django", "Flask", "Pandas", "NumPy", "SQL"],
        "React": ["JavaScript", "TypeScript", "Redux", "Next.js"],
        "Java": ["Spring", "Maven", "Hibernate", "JUnit"],
        "Node.js": ["Express.js", "MongoDB", "JavaScript", "npm"],
        "HTML": ["CSS", "JavaScript", "Bootstrap"],
        "CSS": ["HTML", "JavaScript", "Sass", "Bootstrap"],
        "AWS": ["Docker", "Kubernetes", "Linux", "Terraform"],
        "Docker": ["Kubernetes", "Linux", "CI/CD"],
        "SQL": ["MySQL", "PostgreSQL", "Database Design"],
        "Git": ["GitHub", "GitLab", "CI/CD"],
    }
    
    for skill in extracted_skills:
        if skill in skill_pairings:
            for complement in skill_pairings[skill]:
                if complement not in extracted_skills:
                    suggestions.add(complement)
    
    universal_skills = ["Git", "Linux", "Docker", "Testing", "CI/CD", "REST API"]
    for skill in universal_skills:
        if skill not in extracted_skills:
            suggestions.add(skill)
    
    return list(suggestions)[:max_suggestions]

def repair_json_string(text):
    try:
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        text = re.sub(r',(\s*[}\]])', r'\1', text)
        
        if text.strip().endswith(','):
            text = text.strip()[:-1]
        
        open_braces = text.count('{') - text.count('}')
        open_brackets = text.count('[') - text.count(']')
        
        text += '}' * max(0, open_braces)
        text += ']' * max(0, open_brackets)
        
        return text
    except:
        return text

def extract_skills_from_partial_json(partial_text):
    try:
        skill_pattern = r'"([A-Za-z][A-Za-z0-9\s\.\+\-/]+)"'
        matches = re.findall(skill_pattern, partial_text)
        
        exclude_terms = {'extractedSkills', 'suggestedSkills', 'title', 'description', 'readiness', 'missingSkills', 'pathways', 'requiredSkills', 'complementarySkills'}
        
        skills = []
        for match in matches:
            if (len(match) > 2 and 
                match not in exclude_terms and 
                not match.isdigit() and
                len(match.split()) <= 3):
                skills.append(match.strip())
        
        return list(set(skills))
    except:
        return []

def gemini_analyze_text(prompt, max_output_tokens=3000):
    if not gemini_model:
        print("Gemini model not available")
        return None
    
    try:
        response = gemini_model.generate_content(
            prompt,
            generation_config={
                "max_output_tokens": max_output_tokens,
                "temperature": 0.1,
                "top_p": 0.8,
                "top_k": 40
            }
        )
        
        if response and response.candidates:
            candidate = response.candidates[0]
            if candidate.content and candidate.content.parts:
                raw_text = candidate.content.parts[0].text.strip()
                print(f"Raw Gemini response: {raw_text[:200]}...")
                
                try:
                    repaired_text = repair_json_string(raw_text)
                    parsed = json.loads(repaired_text)
                    print("Successfully parsed JSON from Gemini")
                    return parsed
                except json.JSONDecodeError as e:
                    print(f"JSON parsing failed: {e}")
                    extracted_skills = extract_skills_from_partial_json(raw_text)
                    if extracted_skills:
                        return {
                            "extractedSkills": extracted_skills[:8],
                            "suggestedSkills": ["Docker", "Kubernetes", "AWS", "Git", "CI/CD"]
                        }
                    return None
            else:
                print("No content in Gemini response")
        else:
            print("No candidates in Gemini response")
            
    except Exception as e:
        print(f"Gemini API error: {e}")
    
    return None

# ------------------------------
# Real-time Notifications with SocketIO
# ------------------------------
@socketio.on('connect')
def test_connect():
    print('Client connected')

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')

@socketio.on('join_room')
def on_join(data):
    user_id = data.get('user_id')
    if user_id:
        room = str(user_id)
        join_room(room)
        print(f"User {user_id} joined room {room}")
        emit('status', {'msg': f'Joined room: {room}'}, room=room)
    else:
        print("Attempted to join room without user_id")

def send_notification(user_id, message, type="info", link=""):
    try:
        user = User.objects.get(id=user_id)
        notification = Notification(
            message=message,
            type=type,
            link=link
        )
        user.notifications.append(notification)
        user.save()
        socketio.emit('new_notification', notification.to_json(), room=str(user_id))
        print(f"Notification sent to {user_id}: {message}")
    except DoesNotExist:
        print(f"User {user_id} not found for notification.")
    except Exception as e:
        print(f"Error sending notification: {e}")

# ------------------------------
# Routes
# ------------------------------
@app.route("/", methods=["GET"])
def home():
    return jsonify({"ok": True, "msg": "Welcome to Skill Graph API"})

@app.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({"ok": True, "msg": "Backend alive"})

# Auth Routes
@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.json or {}
    email, password, role = data.get("email"), data.get("password"), data.get("role", "employee") # Default to employee
    name = data.get("name", "")

    if not email or not password:
        return jsonify({"ok": False, "msg": "Email and password required"}), 400
    
    if role not in ["employee", "employer"]:
        return jsonify({"ok": False, "msg": "Invalid role specified"}), 400

    try:
        if User.objects(email=email).first():
            return jsonify({"ok": False, "msg": "User already exists"}), 409

        hashed_pw = generate_password_hash(password, method="pbkdf2:sha256")
        user = User(
            email=email,
            password=hashed_pw,
            name=name,
            role=role,
            # Other fields will be default or updated later
        )
        user.save()
        return jsonify({"ok": True, "msg": "User created successfully"}), 201
    except Exception as e:
        print(f"Signup error: {e}")
        return jsonify({"ok": False, "msg": "An error occurred during signup"}), 500

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json or {}
    email, password = data.get("email"), data.get("password")
    
    try:
        user = User.objects(email=email).first()
        if not user or not check_password_hash(user.password, password):
            return jsonify({"ok": False, "msg": "Invalid credentials"}), 401
        
        token = create_access_token(identity=str(user.id))
        return jsonify({
            "ok": True,
            "access_token": token,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "profile_complete": bool(user.name and user.contact_number) # Simple check
            }
        })
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"ok": False, "msg": "An error occurred during login"}), 500

@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    uid = get_jwt_identity()
    try:
        user = User.objects.get(id=uid)
        return jsonify({
            "ok": True,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "profile_picture": user.profile_picture,
                "bio": user.bio,
                "contact_number": user.contact_number,
                "linkedin_url": user.linkedin_url,
                "github_url": user.github_url,
                "portfolio_url": user.portfolio_url,
                "skills": user.skills,
                "applied_jobs": [str(job_id) for job_id in user.applied_jobs],
                "notifications": [notif.to_mongo().to_dict() for notif in user.notifications]
            }
        })
    except DoesNotExist:
        return jsonify({"ok": False, "msg": "User not found"}), 404
    except Exception as e:
        print(f"Error fetching user profile: {e}")
        return jsonify({"ok": False, "msg": "An error occurred"}), 500

@app.route("/api/auth/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    uid = get_jwt_identity()
    data = request.json or {}
    
    try:
        user = User.objects.get(id=uid)
        
        # Only update fields that are provided
        if "name" in data: user.name = data["name"]
        if "profile_picture" in data: user.profile_picture = data["profile_picture"]
        if "bio" in data: user.bio = data["bio"]
        if "contact_number" in data: user.contact_number = data["contact_number"]
        if "linkedin_url" in data: user.linkedin_url = data["linkedin_url"]
        if "github_url" in data: user.github_url = data["github_url"]
        if "portfolio_url" in data: user.portfolio_url = data["portfolio_url"]
        
        user.save()
        return jsonify({"ok": True, "msg": "Profile updated successfully"})
    except DoesNotExist:
        return jsonify({"ok": False, "msg": "User not found"}), 404
    except ValidationError as e:
        return jsonify({"ok": False, "msg": f"Validation error: {e}"}), 400
    except Exception as e:
        print(f"Error updating profile: {e}")
        return jsonify({"ok": False, "msg": "An error occurred"}), 500

@app.route("/api/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    uid = get_jwt_identity()
    try:
        user = User.objects.get(id=uid)
        notifications_data = []
        for notif in user.notifications:
            notif_dict = notif.to_mongo().to_dict()
            notif_dict['id'] = str(notif_dict['_id']) # Add string ID for frontend
            notifications_data.append(notif_dict)
        return jsonify({"ok": True, "notifications": notifications_data})
    except DoesNotExist:
        return jsonify({"ok": False, "msg": "User not found"}), 404
    except Exception as e:
        print(f"Error fetching notifications: {e}")
        return jsonify({"ok": False, "msg": "An error occurred"}), 500

@app.route("/api/notifications/mark-read/<notif_id>", methods=["POST"])
@jwt_required()
def mark_notification_read(notif_id):
    uid = get_jwt_identity()
    try:
        user = User.objects.get(id=uid)
        found = False
        for notif in user.notifications:
            if str(notif.id) == notif_id:
                notif.read = True
                found = True
                break
        if found:
            user.save()
            return jsonify({"ok": True, "msg": "Notification marked as read"})
        else:
            return jsonify({"ok": False, "msg": "Notification not found"}), 404
    except DoesNotExist:
        return jsonify({"ok": False, "msg": "User not found"}), 404
    except Exception as e:
        print(f"Error marking notification read: {e}")
        return jsonify({"ok": False, "msg": "An error occurred"}), 500

@app.route("/api/skills/all", methods=["GET"])
def get_all_skills():
    return jsonify({"ok": True, "skills": mock_skills_list, "skills_data": mock_skills_data})

@app.route("/api/skills", methods=["GET"])
@jwt_required()
def get_user_skills():
    uid = get_jwt_identity()
    try:
        user = User.objects.get(id=uid)
        return jsonify({"ok": True, "skills": user.skills})
    except DoesNotExist:
        return jsonify({"ok": False, "msg": "User not found"}), 404

@app.route("/api/skills/add", methods=["POST"])
@jwt_required()
def add_skill():
    uid = get_jwt_identity()
    skill = request.json.get("skill")
    if not skill:
        return jsonify({"ok": False, "msg": "Skill required"}), 400
    try:
        user = User.objects.get(id=uid)
        if skill not in user.skills:
            user.skills.append(skill)
            user.save()
        return jsonify({"ok": True, "msg": f"Skill '{skill}' added"})
    except DoesNotExist:
        return jsonify({"ok": False, "msg": "User not found"}), 404

@app.route("/api/skills/remove", methods=["POST"])
@jwt_required()
def remove_skill():
    uid = get_jwt_identity()
    skill = request.json.get("skill")
    if not skill:
        return jsonify({"ok": False, "msg": "Skill required"}), 400
    try:
        user = User.objects.get(id=uid)
        if skill in user.skills:
            user.skills.remove(skill)
            user.save()
        return jsonify({"ok": True, "msg": f"Skill '{skill}' removed"})
    except DoesNotExist:
        return jsonify({"ok": False, "msg": "User not found"}), 404

@app.route("/api/skills/suggestions", methods=["GET"])
def skill_suggestions():
    query = request.args.get("query", "").strip().lower()
    if not query:
        return jsonify({"ok": True, "suggestions": []})

    suggestions = [
        {"name": skill, "category": mock_skills_data[skill].get("category", "General")}
        for skill in mock_skills_data
        if skill.lower().startswith(query) or query in skill.lower()
    ]

    return jsonify({"ok": True, "suggestions": suggestions[:10]})

@app.route("/api/job_skills/suggest", methods=["POST"])
@jwt_required()
def suggest_job_skills():
    uid = get_jwt_identity()
    user = User.objects.get(id=uid)
    if user.role != 'employer':
        return jsonify({"ok": False, "msg": "Unauthorized. Only employers can request job skill suggestions."}), 403

    data = request.json or {}
    job_description = data.get("description")
    job_title = data.get("title", "")

    if not job_description:
        return jsonify({"ok": False, "msg": "Job description required for skill suggestions."}), 400
    
    if not gemini_model:
        return jsonify({"ok": False, "msg": "Gemini API not configured."}), 500

    try:
        prompt = create_job_skill_suggestion_prompt(job_description, job_title)
        gemini_result = gemini_analyze_text(prompt, max_output_tokens=500)

        required_skills = []
        complementary_skills = []

        if gemini_result:
            required_skills = gemini_result.get("requiredSkills", [])
            complementary_skills = gemini_result.get("complementarySkills", [])

            # Validate against COMPREHENSIVE_SKILLS_DB to ensure consistency
            required_skills = [s for s in required_skills if s in COMPREHENSIVE_SKILLS_DB]
            complementary_skills = [s for s in complementary_skills if s in COMPREHENSIVE_SKILLS_DB]

        return jsonify({
            "ok": True,
            "required_skills": required_skills,
            "complementary_skills": complementary_skills
        })

    except Exception as e:
        print(f"Error suggesting job skills with Gemini: {e}")
        return jsonify({"ok": False, "msg": f"Failed to suggest skills: {str(e)}"}), 500


# Resume Upload
@app.route("/api/resume/upload", methods=["POST"])
@jwt_required(optional=True)
def upload_resume():
    file = request.files.get("file")
    if not file or file.filename == "":
        return jsonify({"ok": False, "msg": "No file uploaded"}), 400

    file_extension = file.filename.split('.')[-1].lower()
    if file_extension != 'pdf':
        return jsonify({"ok": False, "msg": "Only PDF files are supported"}), 400

    filename = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S_") + file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    
    try:
        file.save(filepath)
        raw_text = extract_text_from_pdf(filepath)

        if not isinstance(raw_text, str) or not raw_text.strip():
            return jsonify({
                "ok": False,
                "msg": "Could not extract text from PDF. The file may be image-based or corrupted.",
                "extracted_skills": [],
                "suggested_skills": []
            }), 400

        print(f"Extracted {len(raw_text)} characters from PDF")
        print(f"Sample text: {raw_text[:200]}...")

        extracted_skills = enhanced_skill_extraction_from_text(raw_text)
        print(f"Enhanced extraction found: {extracted_skills}")

        gemini_skills = []
        if gemini_model and len(raw_text) > 50:
            try:
                improved_prompt = create_improved_gemini_prompt(raw_text)
                gemini_result = gemini_analyze_text(improved_prompt, max_output_tokens=800)
                if gemini_result and isinstance(gemini_result, dict):
                    gemini_skills = gemini_result.get("extractedSkills", [])
                    print(f"Gemini extraction found: {gemini_skills}")
                    for skill in gemini_skills:
                        if skill in COMPREHENSIVE_SKILLS_DB and skill not in extracted_skills:
                            if skill.lower() in raw_text.lower():
                                extracted_skills.append(skill)
                else:
                    print("Gemini analysis failed or returned invalid format")
            except Exception as e:
                print(f"Gemini analysis error: {e}")

        extracted_skills = list(dict.fromkeys(extracted_skills))
        extracted_skills = extracted_skills[:20]

        suggested_skills = suggest_complementary_skills(extracted_skills)

        if not extracted_skills:
            extracted_skills = []
            suggested_skills = ["Git", "Linux", "Problem Solving", "Communication", "Teamwork"]
            print("No technical skills found in resume")

        print(f"Final extracted skills: {extracted_skills}")
        print(f"Suggested skills: {suggested_skills}")

        skills_by_category = {}
        for skill in extracted_skills:
            if skill in COMPREHENSIVE_SKILLS_DB:
                category = COMPREHENSIVE_SKILLS_DB[skill]["category"]
                if category not in skills_by_category:
                    skills_by_category[category] = []
                skills_by_category[category].append(skill)

        uid = get_jwt_identity()
        if uid:
            try:
                user = User.objects.get(id=uid)
                user.skills.clear() # Clear existing skills or merge carefully
                for skill in extracted_skills:
                    if skill not in user.skills:
                        user.skills.append(skill)
                user.last_resume_analysis = {
                    "timestamp": datetime.utcnow(),
                    "extracted_skills": extracted_skills,
                    "suggested_skills": suggested_skills,
                    "skills_by_category": skills_by_category
                }
                user.save()
                print(f"Saved {len(extracted_skills)} skills to user profile")
            except Exception as e:
                print(f"Database update error for resume skills: {e}")

        return jsonify({
            "ok": True,
            "extracted_skills": extracted_skills,
            "suggested_skills": suggested_skills,
            "skills_by_category": skills_by_category,
            "extraction_method": "enhanced_keyword_matching" + (" + gemini" if gemini_skills else ""),
            "text_preview": raw_text[:400] + ("..." if len(raw_text) > 400 else ""),
            "total_text_length": len(raw_text)
        })

    except Exception as e:
        print(f"Resume upload error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            "ok": False,
            "msg": f"Resume processing failed: {str(e)}"
        }), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

# Analysis Endpoint
@app.route("/api/analysis/evaluate", methods=["POST"])
@jwt_required(optional=True)
def evaluate():
    try:
        data = request.json or {}
        user_skills = data.get("skills", [])
        if not isinstance(user_skills, list):
            user_skills = []

        print(f"Analyzing {len(user_skills)} skills for role matching")

        role_skills_map = {
            "Web Developer": ["HTML", "CSS", "JavaScript", "React", "Angular", "Vue.js", "Node.js", "Git", "Webpack", "Babel", "REST API", "GraphQL"],
            "Frontend Developer": ["HTML", "CSS", "JavaScript", "React", "Vue.js", "SASS", "TypeScript", "Redux", "Tailwind CSS", "Responsive Design"],
            "Backend Developer": ["Python", "Node.js", "Java", "C#", "SQL", "MongoDB", "REST API", "GraphQL", "Docker", "Microservices", "Spring", "Express.js"],
            "Full Stack Developer": ["HTML", "CSS", "JavaScript", "React", "Node.js", "Python", "SQL", "NoSQL", "Docker", "Git", "REST API", "GraphQL", "Redux", "TypeScript"],
            "Mobile Developer": ["Java", "Kotlin", "Swift", "React Native", "Flutter", "Android Development", "iOS Development", "Xamarin", "UI/UX Design"],
            "Data Scientist": ["Python", "R", "SQL", "Machine Learning", "Statistics", "Pandas", "NumPy", "Matplotlib", "Seaborn", "TensorFlow", "PyTorch", "Scikit-learn", "Data Visualization", "Deep Learning", "NLP", "Data Cleaning"],
            "AI/ML Engineer": ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Scikit-learn", "Keras", "NLP", "Computer Vision", "Reinforcement Learning", "Data Analysis", "Model Deployment"],
            "Data Engineer": ["Python", "SQL", "ETL", "Apache Spark", "Hadoop", "Airflow", "Kafka", "AWS", "GCP", "BigQuery", "Data Warehousing", "Data Modeling"],
            "BI Analyst": ["SQL", "Power BI", "Tableau", "Data Visualization", "Excel", "Analytics", "DAX", "Data Storytelling"],
            "DevOps Engineer": ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "Linux", "CI/CD", "Terraform", "Ansible", "Jenkins", "Monitoring", "Prometheus", "CloudFormation"],
            "Cloud Engineer": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Linux", "Cloud Security", "Networking", "Serverless Architecture"],
            "System Administrator": ["Linux", "Windows", "macOS", "Ansible", "Terraform", "Docker", "Networking", "Server Maintenance", "Active Directory"],
            "Database Administrator": ["SQL", "MySQL", "PostgreSQL", "MongoDB", "Oracle", "Redis", "Database Design", "Indexing", "Backup & Recovery", "Query Optimization"],
            "QA Engineer": ["Selenium", "Pytest", "Jest", "Mocha", "Unit Testing", "Integration Testing", "Cypress", "Test Automation", "Performance Testing", "Load Testing"],
            "Security Engineer": ["Linux", "Python", "AWS", "Docker", "Kubernetes", "CI/CD", "Penetration Testing", "Vulnerability Assessment", "Network Security", "Cryptography", "Compliance"],
            "Product Manager": ["Agile", "Scrum", "Kanban", "API Design", "Roadmapping", "Communication", "Teamwork", "Prioritization", "Stakeholder Management", "Market Analysis"],
            "Project Manager": ["Agile", "Scrum", "Kanban", "Budgeting", "Risk Management", "Scheduling", "Team Coordination", "Communication"],
            "Blockchain Developer": ["Solidity", "Ethereum", "Smart Contracts", "Web3.js", "Truffle", "Hardhat", "NFTs", "Blockchain Architecture"],
            "IoT Engineer": ["C", "C++", "Embedded Systems", "Microcontrollers", "Raspberry Pi", "Arduino", "MQTT", "Sensors", "IoT Protocols"],
            "Game Developer": ["C++", "C#", "Unity", "Unreal Engine", "3D Modeling", "Animation", "Shader Programming", "Game Physics"],
            "AR/VR Developer": ["Unity", "Unreal Engine", "C#", "3D Modeling", "XR Interaction", "OpenXR", "ARKit", "ARCore"],
            "UX/UI Designer": ["Figma", "Sketch", "Adobe XD", "Wireframing", "Prototyping", "User Research", "Interaction Design", "Responsive Design", "Accessibility"],
            "Technical Writer": ["Documentation", "Markdown", "API Docs", "Confluence", "Git", "Communication", "Editing", "Research"],
            "Cloud Security Engineer": ["AWS Security", "Azure Security", "GCP Security", "IAM", "Encryption", "SIEM", "Vulnerability Assessment", "Compliance"],
            "Big Data Engineer": ["Hadoop", "Spark", "Kafka", "Airflow", "Hive", "SQL", "NoSQL", "Data Lakes", "ETL", "Python", "Scala"],
            "Computer Vision Engineer": ["Python", "OpenCV", "TensorFlow", "PyTorch", "Deep Learning", "Image Processing", "Object Detection", "YOLO", "GANs"],
            "NLP Engineer": ["Python", "NLP", "Spacy", "NLTK", "Transformers", "BERT", "GPT", "Text Classification", "Sentiment Analysis"],
            "Embedded Systems Engineer": ["C", "C++", "Microcontrollers", "RTOS", "Circuit Design", "PCB Design", "IoT", "Firmware"],
            "Robotics Engineer": ["Python", "ROS", "C++", "Sensors", "Actuators", "Control Systems", "Kinematics", "Simulation"],
        }

        analysis_result = []

        user_skills_set = set([s.lower() for s in user_skills])

        for role, required_skills in role_skills_map.items():
            required_skills_lower = [s.lower() for s in required_skills]
            overlap = user_skills_set & set(required_skills_lower)
            match_count = len(overlap)
            total_required = len(required_skills)
            readiness_score = int((match_count / total_required) * 100) if total_required else 0

            if match_count > 0:
                missing_skills = [s for s in required_skills if s.lower() not in user_skills_set]
                suggested_skills = missing_skills[:5]
                analysis_result.append({
                    "title": role,
                    "readiness": readiness_score,
                    "description": f"Matched {match_count} skills for {role}.",
                    "missingSkills": missing_skills,
                    "suggestedSkills": suggested_skills,
                    "pathways": [required_skills]
                })

        analysis_result.sort(key=lambda x: x["readiness"], reverse=True)

        uid = get_jwt_identity()
        if uid:
            try:
                user = User.objects.get(id=uid)
                user.analysis_history.append({
                    "timestamp": datetime.utcnow(),
                    "skills_analyzed": user_skills,
                    "results": analysis_result
                })
                user.save()
            except DoesNotExist:
                print(f"User {uid} not found for analysis history update.")
            except Exception as e:
                print(f"Error saving analysis history: {e}")

        return jsonify({"ok": True, "analysis": analysis_result})

    except Exception as e:
        print(f"Analysis error: {e}")
        return jsonify({
            "ok": False,
            "msg": "Analysis failed",
            "analysis": []
        }), 500

@app.route("/api/history", methods=["GET"])
@jwt_required()
def history():
    uid = get_jwt_identity()
    try:
        user = User.objects.get(id=uid)
        # Convert MongoEngine EmbeddedDocumentList to a serializable list of dicts
        history_data = [item.to_mongo().to_dict() for item in user.analysis_history]
        # Convert ObjectId in nested structures if necessary
        for entry in history_data:
            entry['timestamp'] = entry['timestamp'].isoformat() # Convert datetime to string
            # No other ObjectIds expected in this particular structure based on models.py
        return jsonify({"ok": True, "history": history_data})
    except DoesNotExist:
        return jsonify({"ok": False, "msg": "User not found"}), 404
    except Exception as e:
        print(f"Error fetching history: {e}")
        return jsonify({"ok": False, "msg": "An error occurred"}), 500

# Error Handling
@app.errorhandler(404)
def not_found(_):
    return jsonify({"ok": False, "msg": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(_):
    return jsonify({"ok": False, "msg": "Internal server error"}), 500

# Register job routes
from routes.jobs import jobs_bp
app.register_blueprint(jobs_bp, url_prefix='/api/jobs')
app.register_blueprint(external_jobs)
app.register_blueprint(employer_bp, url_prefix="/api/employer")
app.register_blueprint(ats_bp)

if __name__ == "__main__":
    socketio.run(app, debug=True, port=5000, use_reloader=False)