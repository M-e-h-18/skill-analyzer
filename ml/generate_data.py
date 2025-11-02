# === Synthetic Tech Job Trend Dataset Generator ===
# Generates ~50,000 monthly records (2015–2025)
# For training ML models on job relevance prediction

from faker import Faker
import pandas as pd
import numpy as np
import random

fake = Faker()

# Parameters
n = 50000
start_year = 2015
end_year = 2025

tech_jobs = [
    "Software Engineer", "Data Scientist", "AI Engineer", "Machine Learning Engineer",
    "DevOps Engineer", "Cloud Architect", "Cybersecurity Analyst", "Data Engineer",
    "Full Stack Developer", "Mobile App Developer", "Backend Developer",
    "Frontend Developer", "UI/UX Designer", "Blockchain Developer", "MLOps Engineer"
]

industries = ["Technology", "IT Services", "Cloud Computing", "AI & ML", "Cybersecurity"]

skills_dict = {
    "Software Engineer": ["Python", "Java", "C++", "Git", "Agile"],
    "Data Scientist": ["Python", "SQL", "Machine Learning", "Pandas", "Statistics"],
    "AI Engineer": ["Python", "TensorFlow", "Deep Learning", "PyTorch", "NLP"],
    "Machine Learning Engineer": ["Python", "Scikit-learn", "ML Algorithms", "Data Preprocessing"],
    "DevOps Engineer": ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux"],
    "Cloud Architect": ["AWS", "Azure", "GCP", "Terraform", "Microservices"],
    "Cybersecurity Analyst": ["Network Security", "Firewalls", "Ethical Hacking", "Penetration Testing"],
    "Data Engineer": ["SQL", "ETL", "Spark", "BigQuery", "Airflow"],
    "Full Stack Developer": ["React", "Node.js", "MongoDB", "Express", "JavaScript"],
    "Mobile App Developer": ["Flutter", "Swift", "Kotlin", "Android Studio"],
    "Backend Developer": ["Node.js", "Django", "API Design", "PostgreSQL"],
    "Frontend Developer": ["HTML", "CSS", "JavaScript", "React", "Next.js"],
    "UI/UX Designer": ["Figma", "Adobe XD", "Prototyping", "Wireframing"],
    "Blockchain Developer": ["Solidity", "Smart Contracts", "Ethereum", "Web3.js"],
    "MLOps Engineer": ["Docker", "MLflow", "Kubernetes", "CI/CD", "Monitoring"]
}

education_levels = ["Bachelor's", "Master's", "PhD"]

rows = []

for _ in range(n):
    job = random.choice(tech_jobs)
    industry = random.choice(industries)
    year = random.randint(start_year, end_year)
    month = random.randint(1, 12)
    skills = random.sample(skills_dict[job], k=min(3, len(skills_dict[job])))

    # Simulate time trends — jobs get more popular post 2018
    year_factor = (year - 2015) / 10
    base_postings = np.random.poisson(lam=250)
    num_postings = int(base_postings * (1 + year_factor + random.uniform(-0.2, 0.2)))

    avg_salary = np.random.normal(95000 + 3000 * year_factor, 10000)
    applicants = int(abs(np.random.normal(120, 30)))
    automation_risk = round(random.uniform(0.05, 0.3), 2)
    industry_growth = round(random.uniform(1.0, 2.0), 2)
    remote_ratio = round(random.uniform(0.3, 1.0), 2)
    education = random.choice(education_levels)
    exp_required = random.randint(0, 10)

    # Compute future relevance (target)
    base = 0.75 + 0.1 * year_factor
    if "AI" in job or "ML" in job or "Cloud" in job:
        base += 0.1
    elif "Frontend" in job or "UI" in job:
        base -= 0.05

    future_relevance = round(
        max(0, min(1, base - automation_risk * 0.3 + industry_growth * 0.05 + remote_ratio * 0.05 + np.random.normal(0, 0.03))),
        2
    )

    rows.append({
        "year": year,
        "month": month,
        "job_title": job,
        "industry": industry,
        "required_skills": ", ".join(skills),
        "num_postings": num_postings,
        "avg_salary": int(avg_salary),
        "num_applicants": applicants,
        "automation_risk_score": automation_risk,
        "industry_growth_index": industry_growth,
        "remote_ratio": remote_ratio,
        "min_education_level": education,
        "experience_required": exp_required,
        "future_relevance_score": future_relevance
    })

# Build DataFrame
df = pd.DataFrame(rows)
df.sort_values(by=["year", "month"], inplace=True)
df.reset_index(drop=True, inplace=True)

# Save dataset
df.to_csv("synthetic_tech_job_trends.csv", index=False)
print(df.head(10))
print(f"\n✅ Generated {len(df)} tech job records — saved as synthetic_tech_job_trends.csv")
