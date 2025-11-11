import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, User, LogOut, FileText, Briefcase, Upload, Target, Search, ExternalLink, ChevronRight, AlertCircle, CheckSquare } from 'lucide-react';

import * as api from './api/api';
import EmployerDashboard from "./components/EmployerDashboard";
import { Users } from "lucide-react";
import JobSearch from './components/JobSearch';
import MyApplications from './components/MyApplications';
import { toast } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

// Import existing components
import AuthModal from './components/AuthModal';
import ThemeToggle from './components/ThemeToggle';
import ExportButtons from './components/ExportButtons';
import ResumeUpload from './components/ResumeUpload';
import SkillsInput from './components/SkillsInput';
import GraphView from './components/GraphView';
import AnalysisPanel from './components/AnalysisPanel';
import JobOutlookModal from './components/JobOutlookModal';
import ATSScoreAnalyzer from './components/ATSScoreAnalyzer';


export const TECHNICAL_SKILLS = [
  // Programming Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Scala', 'Kotlin', 'Swift', 'Objective-C', 'R', 'Perl', 'MATLAB', 'Dart', 'Shell Scripting',

  // Frontend Frameworks / Libraries
  'React', 'React.js', 'Redux', 'Vue.js', 'Angular', 'Next.js', 'Nuxt.js', 'Svelte', 'Bootstrap', 'Tailwind CSS', 'Material-UI', 'jQuery', 'Chakra UI', 'Ember.js',

  // Backend Frameworks / Libraries
  'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'Spring', 'Spring Boot', 'Laravel', 'Ruby on Rails', 'ASP.NET', 'FastAPI', 'Phoenix', 'Koa.js',

  // Databases
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Cassandra', 'SQLite', 'Oracle', 'MariaDB', 'Firebase', 'DynamoDB', 'Elasticsearch', 'Neo4j', 'InfluxDB', 'CockroachDB', 'GraphQL', 'Prisma',

  // Cloud / DevOps
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'CircleCI', 'Travis CI', 'GitHub Actions', 'CloudFormation', 'Serverless Framework', 'Helm', 'Prometheus', 'Grafana', 'ELK Stack',

  // Testing / QA
  'Jest', 'Mocha', 'Chai', 'Cypress', 'Selenium', 'PyTest', 'JUnit', 'Enzyme', 'React Testing Library', 'TestNG', 'Postman', 'Swagger', 'REST Assured',

  // Mobile Development
  'React Native', 'Flutter', 'Swift', 'Kotlin', 'Objective-C', 'Xamarin', 'Ionic', 'Cordova',

  // Data Science / AI / ML
  'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'OpenCV', 'NLTK', 'SpaCy', 'Hugging Face Transformers', 'XGBoost', 'LightGBM', 'CatBoost', 'Plotly', 'Dash', 'MLflow', 'Apache Spark', 'Hadoop', 'BigQuery',

  // Software Architecture / Patterns
  'Microservices', 'Monolithic', 'MVC', 'MVVM', 'Clean Architecture', 'SOA', 'CQRS', 'Event-driven Architecture', 'REST API', 'GraphQL API', 'gRPC',

  // Version Control / Collaboration
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN', 'Mercurial',

  // UI/UX / Design
  'Figma', 'Adobe XD', 'Sketch', 'InVision', 'Canva', 'Zeplin', 'Photoshop', 'Illustrator',

  // Networking / Security
  'TCP/IP', 'HTTP', 'HTTPS', 'REST', 'SOAP', 'OAuth', 'JWT', 'SSL/TLS', 'Firewall', 'Penetration Testing', 'Vulnerability Assessment', 'Cybersecurity', 'VPN', 'IDS/IPS', 'Active Directory', 'LDAP',

  // Misc / Tools / Others
  'Linux', 'Unix', 'Windows', 'MacOS', 'Bash', 'PowerShell', 'Vim', 'Emacs', 'VS Code', 'IntelliJ IDEA', 'Eclipse', 'PyCharm', 'NetBeans', 'WebStorm', 'JIRA', 'Confluence', 'Trello', 'Notion', 'Slack', 'Docker Compose', 'Apache Kafka', 'RabbitMQ', 'MQTT', 'Redis Streams', 'Elixir', 'Julia', 'Assembly', 'COBOL', 'Fortran', 'Blockchain', 'Solidity', 'Ethereum', 'Hyperledger', 'Smart Contracts', 'NFT', 'Web3.js', 'IPFS', 'Three.js', 'D3.js', 'Chart.js', 'Highcharts', 'Unity', 'Unreal Engine', 'Game Development', 'AR/VR', 'OpenGL', 'DirectX'
];

// Main Application Component with Tabs
const SkillAnalyzerApp = () => {

  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState('skills');
  const [skills, setSkills] = useState([]);
  const [analysis, setAnalysis] = useState([]);
  const [bestJobTitle, setBestJobTitle] = useState('');
  const [jobOutlook, setJobOutlook] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const svgRef = useRef();
  const [showJobOutlook, setShowJobOutlook] = useState(false);
  const [jobDescription, setJobDescription] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await api.getCurrentUser();
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('access_token');
          setUser(null);
        }
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchUserSkills = async () => {
      if (user && user.id) {
        try {
          const response = await api.listSkills();
          setSkills(response.skills || []);
        } catch (error) {
          console.error("Error fetching user skills:", error);
          if (error.response && error.response.status === 401) {
            handleLogout();
          }
        }
      } else {
        setSkills([]);
      }
    };
    fetchUserSkills();
  }, [user]);

  useEffect(() => {
    if (skills.length > 0) {
      setAnalysisLoading(true);
      api.evaluateSkills({ skills })
        .then(response => {
          const analysisData = response.analysis || [];
          setAnalysis(analysisData);
          setError('');

          if (analysisData.length > 0) {
            const topJob = analysisData[0].title || analysisData[0].job || '';
            setBestJobTitle(topJob);
          }
        })
        .catch(err => {
          console.error('Analysis failed:', err);
          setAnalysis([]);
          setError('Analysis failed. Please try again.');
        })
        .finally(() => {
          setAnalysisLoading(false);
        });
    } else {
      setAnalysis([]);
      setBestJobTitle('');
    }
  }, [skills]);

  useEffect(() => {
    if (bestJobTitle) {
      api.postEmployerJobOutlook({job_title: bestJobTitle})
        .then(res => setJobOutlook(res))
        .catch(err => {
          console.error('Failed to fetch job outlook:', err);
          setJobOutlook(null);
        });
    } else {
      setJobOutlook(null);
    }
  }, [bestJobTitle]);

  const handleAddSkill = async (skillName) => {
    if (skillName && !skills.includes(skillName)) {
      try {
        let mappedSkill = skillName;

        try {
          const res = await api.mapSkill({ skill: skillName });
          if (res?.mapped_skill) {
            mappedSkill = res.mapped_skill;
          }
        } catch (err) {
          console.warn("Gemini mapping failed, keeping original:", skillName);
        }

        if (user) {
          await api.addSkill({ skill: mappedSkill });
        }

        setSkills((prev) => [...prev, mappedSkill]);
        setError('');
      } catch (error) {
        console.error("Error adding skill:", error);
        setError('Failed to add skill. Please try again.');

        if (!user) {
          setSkills((prev) => [...prev, skillName]);
        }
      }
    }
  };

  const handleRemoveSkill = async (skillToRemove) => {
    try {
      if (user) {
        await api.removeSkill({ skill: skillToRemove });
      }
      setSkills(prevSkills => prevSkills.filter(skill => skill !== skillToRemove));
      setError('');
    } catch (error) {
      console.error("Error removing skill:", error);
      setError('Failed to remove skill. Please try again.');

      if (!user) {
        setSkills(prevSkills => prevSkills.filter(skill => skill !== skillToRemove));
      }
    }
  };

  const handleResetSkills = async () => {
    try {
      if (user) {
        const currentSkills = [...skills];
        for (const skill of currentSkills) {
          await api.removeSkill({ skill });
        }
      }
      setSkills([]);
      setError('');
    } catch (error) {
      console.error("Error resetting skills:", error);
      setError('Failed to reset skills. Please try again.');

      if (!user) {
        setSkills([]);
      }
    }
  };

  const handleSkillClick = (skillNode) => {
    if (skillNode.type === 'skill') {
      if (skillNode.status === 'owned') {
        handleRemoveSkill(skillNode.id);
      } else {
        handleAddSkill(skillNode.id);
      }
    }
  };

  const handleAuth = async (authData) => {
    setLoading(true);
    setError('');
    try {
      if (authData.isSignup) {
        await api.signup({
          email: authData.email,
          password: authData.password,
          name: authData.name,
          role: authData.role || 'employee'
        });
        const loginResponse = await api.login({ email: authData.email, password: authData.password });
        
        const userData = loginResponse?.data?.user || loginResponse?.user;
        const accessToken = loginResponse?.data?.access_token || loginResponse?.access_token;
        
        if (userData && accessToken) {
          setUser(userData);
          localStorage.setItem('access_token', accessToken);
        } else {
          throw new Error('Invalid response structure from login');
        }
      } else {
        const response = await api.login({ email: authData.email, password: authData.password });
        
        const userData = response?.data?.user || response?.user;
        const accessToken = response?.data?.access_token || response?.access_token;
        
        if (userData && accessToken) {
          setUser(userData);
          localStorage.setItem('access_token', accessToken);
        } else {
          throw new Error('Invalid response structure from login');
        }
      }
      setShowAuth(false);
      toast.success(authData.isSignup ? "Signup successful!" : "Login successful!");
    } catch (error) {
      console.error('Auth failed:', error);
      const errorMessage = error.response?.data?.msg || error.message || 'Authentication failed';
      setError(errorMessage);
      toast.error(`Authentication failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    localStorage.removeItem('access_token');
    setUser(null);
    setSkills([]);
    setAnalysis([]);
    setError('');
    toast.info("Logged out successfully.");
  };

  const handleResumeUpload = async (file) => {
    setLoading(true);
    setError('');
    setResumeFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.uploadResume(formData);

      const extractedSkills = response.extracted_skills || [];
      const suggestedSkills = response.suggested_skills || [];
      const allNewSkills = [...extractedSkills, ...suggestedSkills];

      const newSkills = [...skills];
      let addedCount = 0;

      for (const skill of allNewSkills) {
        if (!newSkills.includes(skill)) {
          newSkills.push(skill);
          addedCount++;

          if (user) {
            try {
              await api.addSkill({ skill });
            } catch (error) {
              console.error(`Failed to add skill ${skill} to backend:`, error);
            }
          }
        }
      }

      setSkills(newSkills);
      toast.success(`Successfully extracted ${addedCount} new skills from your resume!`);

    } catch (error) {
      console.error('Resume upload failed:', error);
      const errorMessage = error.response?.data?.msg || error.message || 'Resume upload failed';
      setError(errorMessage);
      toast.error(`Resume upload failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPNG = () => {
    const svgElement = svgRef.current;
    if (svgElement) {
      try {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();

        img.onload = () => {
          const bbox = svgElement.getBBox();
          const scale = 2;
          const canvas = document.createElement('canvas');
          canvas.width = bbox.width * scale;
          canvas.height = bbox.height * scale;

          const ctx = canvas.getContext('2d');
          ctx.setTransform(scale, 0, 0, scale, 0, 0);
          ctx.drawImage(img, 0, 0);

          const pngData = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = pngData;
          link.download = 'skill_graph.png';
          link.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
      } catch (error) {
        toast.error('PNG export failed. This is a demo limitation or browser security restriction.');
        console.error("PNG export error:", error);
      }
    }
  };

  const handleExportSVG = () => {
    const svgElement = svgRef.current;
    if (svgElement) {
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'skill_graph.svg';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportPDF = () => {
    toast.info('PDF export feature would generate a career analysis report. This is a demo limitation.');
  };

  const tabs = user?.role === 'employer' 
    ? [
        { id: 'employer', label: 'Dashboard', icon: Briefcase }
      ]
    : [
        { id: 'skills', label: 'Skills & Analysis', icon: GitBranch },
        { id: 'ats', label: 'ATS Score', icon: Target },
        { id: 'jobs', label: 'Job Search', icon: Search },
        { id: 'applications', label: 'My Applications', icon: CheckSquare }
      ];

  return (
    <div className={`min-h-screen transition-all duration-500 ${isDark ? 'bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-800' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100'}`}>
      <header className={`border-b backdrop-blur-sm sticky top-0 z-50 ${isDark ? 'border-cyan-400/30 bg-slate-900/80' : 'border-slate-300 bg-white/80'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${isDark ? 'border-cyan-400 bg-gradient-to-br from-green-400 to-cyan-500' : 'border-slate-400 bg-gradient-to-br from-green-500 to-blue-600'} shadow-lg`}>
              <GitBranch className="w-6 h-6 text-white" />
            </div>

            <div>
              <h1 className={`text-2xl font-bold ${isDark ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-green-400' : 'text-slate-800'}`}>
                Code Career Map
              </h1>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Interactive Career Path Visualization {user && `(${user.role})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ExportButtons
              onExportPNG={handleExportPNG}
              onExportSVG={handleExportSVG}
              onExportPDF={handleExportPDF}
              isDark={isDark}
            />
            <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />

            {user ? (
              <div className="flex items-center gap-2">
                <span className={`text-sm ${isDark ? 'text-cyan-300' : 'text-slate-600'}`}>
                  Hello, {user.name ? user.name.split(' ')[0] : user.email.split('@')[0]}!
                </span>
                <button
                  onClick={handleLogout}
                  className={`p-2 rounded-lg border ${isDark ? 'border-red-400/30 hover:border-red-400 text-red-400' : 'border-red-300 hover:border-red-400 text-red-600'} transition-colors`}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className={`px-4 py-2 rounded-lg border ${isDark ? 'border-cyan-400/30 hover:border-cyan-400 text-cyan-400' : 'border-slate-300 hover:border-slate-400 text-slate-600'} transition-colors flex items-center gap-2`}
              >
                <User className="w-4 h-4" />
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className={`p-3 rounded-lg border ${isDark ? 'border-red-400/30 bg-red-900/20 text-red-300' : 'border-red-300 bg-red-50 text-red-600'}`}>
            {error}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className={`flex gap-2 mb-6 border-b ${isDark ? 'border-cyan-400/20' : 'border-slate-200'} overflow-x-auto`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? isDark
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-blue-600 text-blue-600'
                  : 'border-transparent hover:border-slate-400/50 text-slate-500'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid md:grid-cols-2 gap-6">
          {user?.role === 'employer' ? (
            <div className="col-span-2">
              <EmployerDashboard isDark={isDark} />
            </div>
          ) : (
            <>
              {activeTab === 'skills' && (
                <>
                  <div className="space-y-6">
                    <ResumeUpload onUpload={handleResumeUpload} isDark={isDark} />
                    <SkillsInput
                      skills={skills}
                      onAddSkill={handleAddSkill}
                      onRemoveSkill={handleRemoveSkill}
                      onReset={handleResetSkills}
                      isDark={isDark}
                    />
                  </div>

                  <div>
                    <GraphView
                      skills={skills}
                      analysis={analysis}
                      loading={analysisLoading}
                      error={error}
                      svgRef={svgRef}
                      onSkillClick={handleSkillClick}
                      isDark={isDark}
                    />

                    <AnalysisPanel analysis={analysis} isDark={isDark} />

                    {analysis.length > 0 && (
                      <button
                        className={`mt-4 px-6 py-2 rounded-lg font-semibold transition-all ${
                          isDark
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
                        }`}
                        onClick={() => setShowJobOutlook(true)}
                      >
                        View Job Outlook
                      </button>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'ats' && (
                <div className="col-span-2">
                  <ATSScoreAnalyzer
                    isDark={isDark}
                    skills={skills}
                    jobDescription={jobDescription}
                    setJobDescription={setJobDescription}
                  />
                </div>
              )}

              {activeTab === 'jobs' && (
                <div className="col-span-2">
                  <JobSearch isDark={isDark} skills={skills} />
                </div>
              )}

              {activeTab === 'applications' && (
                <div className="col-span-2">
                  {user ? (
                    <MyApplications isDark={isDark} />
                  ) : (
                    <div className={`rounded-xl border p-12 text-center ${
                      isDark ? 'border-cyan-400/30 bg-slate-800/50' : 'border-slate-300 bg-white'
                    }`}>
                      <CheckSquare className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                      <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        Login Required
                      </h3>
                      <p className={`mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Please login to view your job applications
                      </p>
                      <button
                        onClick={() => setShowAuth(true)}
                        className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                          isDark
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
                        }`}
                      >
                        Login Now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          isDark={isDark}
          onClose={() => setShowAuth(false)}
          onAuth={handleAuth}
          loading={loading}
          error={error}
        />
      )}

      {/* Job Outlook Modal */}
      <JobOutlookModal
        jobs={analysis.slice(0, 5)}
        isOpen={showJobOutlook}
        onClose={() => setShowJobOutlook(false)}
        isDark={isDark}
      />
    </div>
  );
};

export default SkillAnalyzerApp;