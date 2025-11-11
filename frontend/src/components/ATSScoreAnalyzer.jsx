import React, { useState } from 'react';
import { toast } from 'react-toastify';

// A large technical skills database
export const TECHNICAL_SKILLS = [
  'JavaScript','TypeScript','Python','Java','C','C++','C#','Go','Rust','Ruby','PHP','Scala','Kotlin','Swift','Objective-C','R','Perl','MATLAB','Dart','Shell Scripting',
  'React','React.js','Redux','Vue.js','Angular','Next.js','Nuxt.js','Svelte','Bootstrap','Tailwind CSS','Material-UI','jQuery','Chakra UI','Ember.js',
  'Node.js','Express','NestJS','Django','Flask','Spring','Spring Boot','Laravel','Ruby on Rails','ASP.NET','FastAPI','Phoenix','Koa.js',
  'MySQL','PostgreSQL','MongoDB','Redis','Cassandra','SQLite','Oracle','MariaDB','Firebase','DynamoDB','Elasticsearch','Neo4j','InfluxDB','CockroachDB','GraphQL','Prisma',
  'AWS','Azure','GCP','Docker','Kubernetes','Terraform','Ansible','Jenkins','CircleCI','Travis CI','GitHub Actions','CloudFormation','Serverless Framework','Helm','Prometheus','Grafana','ELK Stack',
  'Jest','Mocha','Chai','Cypress','Selenium','PyTest','JUnit','Enzyme','React Testing Library','TestNG','Postman','Swagger','REST Assured',
  'React Native','Flutter','Swift','Kotlin','Objective-C','Xamarin','Ionic','Cordova',
  'TensorFlow','PyTorch','Keras','Scikit-learn','Pandas','NumPy','Matplotlib','Seaborn','OpenCV','NLTK','SpaCy','Hugging Face Transformers','XGBoost','LightGBM','CatBoost','Plotly','Dash','MLflow','Apache Spark','Hadoop','BigQuery',
  'Microservices','Monolithic','MVC','MVVM','Clean Architecture','SOA','CQRS','Event-driven Architecture','REST API','GraphQL API','gRPC',
  'Git','GitHub','GitLab','Bitbucket','SVN','Mercurial',
  'Figma','Adobe XD','Sketch','InVision','Canva','Zeplin','Photoshop','Illustrator',
  'TCP/IP','HTTP','HTTPS','REST','SOAP','OAuth','JWT','SSL/TLS','Firewall','Penetration Testing','Vulnerability Assessment','Cybersecurity','VPN','IDS/IPS','Active Directory','LDAP'
];

const normalize = (skill) => skill.toLowerCase().replace(/[^a-z0-9]/g, '');

const ATSScoreAnalyzer = ({ isDark, skills, jobDescription, setJobDescription }) => {
  const [atsScore, setAtsScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [matchedSkills, setMatchedSkills] = useState([]);
  const [missingSkills, setMissingSkills] = useState([]);
  const [foundSkills, setFoundSkills] = useState([]);

  const analyzeATS = () => {
    if (!skills.length || !jobDescription) {
      toast.error('Please provide both skills and job description');
      return;
    }

    setLoading(true);

    try {
      // Normalize job description
      const jdText = jobDescription.toLowerCase();

      // Filter only technical skills from user resume
      const userTechSkills = skills.filter(skill =>
        TECHNICAL_SKILLS.some(ts => normalize(ts) === normalize(skill))
      );

      // Find required skills in JD
      const requiredSkills = TECHNICAL_SKILLS.filter(skill =>
        jdText.includes(skill.toLowerCase())
      );

      // Match user skills
      const matched = requiredSkills.filter(rs =>
        userTechSkills.some(us => normalize(us) === normalize(rs))
      );

      const missing = requiredSkills.filter(rs => !matched.includes(rs));

      // Optional skills found in JD that user has (extra points)
      const found = userTechSkills.filter(us =>
        !matched.includes(us) && requiredSkills.some(rs => jdText.includes(us.toLowerCase()))
      );

      // Weighted scoring
      const requiredScore = requiredSkills.length ? matched.length / requiredSkills.length : 0;
      const optionalScore = requiredSkills.length ? found.length / requiredSkills.length * 0.5 : 0; // 50% weight for optional
      const score = Math.min(100, Math.round((requiredScore + optionalScore) * 100));

      setAtsScore(score);
      setMatchedSkills(matched);
      setMissingSkills(missing);
      setFoundSkills(found);
      setShowResults(true);

    } catch (err) {
      console.error('ATS Analysis failed:', err);
      toast.error('Failed to analyze ATS score');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={`p-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
      <h2 className="text-2xl font-bold mb-4">ATS Score Analyzer</h2>

      <textarea
        className={`w-full p-2 mb-4 rounded ${isDark ? 'bg-gray-700' : 'bg-white'}`}
        rows="6"
        placeholder="Paste job description here..."
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />

      <button
        onClick={analyzeATS}
        disabled={loading || !skills.length || !jobDescription}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Analyzing...' : 'Analyze ATS Score'}
      </button>

      {showResults && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold">Results:</h3>
          <p className="text-lg">
            ATS Score: <span className={getScoreColor(atsScore)}> {atsScore}%</span>
          </p>

          <div className="mt-2">
            <h4 className="font-semibold">Matched Technical Skills:</h4>
            <div className="flex flex-wrap gap-2">
              {matchedSkills.map((skill, i) => (
                <span key={i} className="bg-green-500 text-white px-2 py-1 rounded">{skill}</span>
              ))}
            </div>
          </div>

          <div className="mt-2">
            <h4 className="font-semibold">Missing Technical Skills:</h4>
            <div className="flex flex-wrap gap-2">
              {missingSkills.map((skill, i) => (
                <span key={i} className="bg-red-500 text-white px-2 py-1 rounded">{skill}</span>
              ))}
            </div>
          </div>

          <div className="mt-2">
            <h4 className="font-semibold">Other Skills Found:</h4>
            <div className="flex flex-wrap gap-2">
              {foundSkills.map((skill, i) => (
                <span key={i} className="bg-blue-500 text-white px-2 py-1 rounded">{skill}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ATSScoreAnalyzer;
