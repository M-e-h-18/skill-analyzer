import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, User, LogOut, FileText, Briefcase, Upload, Target, Search, ExternalLink, ChevronRight, AlertCircle } from 'lucide-react';
import * as api from './api/api';
import EmployerDashboard from "./components/EmployerDashboard";
import { Users } from "lucide-react";
import JobSearch from './components/JobSearch';
import { toast } from 'react-toastify';
import { analyzeATSScore } from './api/api';
import 'react-toastify/dist/ReactToastify.css';

// Import existing components
import AuthModal from './components/AuthModal'; // Make sure this path is correct
import ThemeToggle from './components/ThemeToggle';
import ExportButtons from './components/ExportButtons';
import ResumeUpload from './components/ResumeUpload';
import SkillsInput from './components/SkillsInput';
import GraphView from './components/GraphView';
import AnalysisPanel from './components/AnalysisPanel';
import JobOutlookModal from './components/JobOutlookModal';

// New ATS Score Component (kept as is)
const ATSScoreAnalyzer = ({ isDark, resumeFile, skills }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [atsScore, setAtsScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [matchedSkills, setMatchedSkills] = useState([]);
  const [requiredSkills, setRequiredSkills] = useState([]);

  const analyzeATS = async () => {
    if (!resumeFile || !jobDescription) {
      toast.error('Please provide both resume and job description');
      return;
    }

    setLoading(true);
    try {
      // Read resume file content
      const reader = new FileReader();
      reader.onload = async (e) => {
        const resumeText = e.target.result;

        const response = await analyzeATSScore(resumeText, jobDescription);

        if (response) {
          setAtsScore(response.score);
          setMatchedSkills(response.matched_skills || []);
          setRequiredSkills(response.required_skills || []);
          setShowResults(true);
        }
      };

      reader.readAsText(resumeFile);
    } catch (error) {
      console.error('ATS Analysis failed:', error);
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
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        {loading ? 'Analyzing...' : 'Analyze ATS Score'}
      </button>

      {showResults && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold">Results:</h3>
          <p className="text-lg">
            ATS Score:
            <span className={getScoreColor(atsScore)}>
              {' '}{atsScore}%
            </span>
          </p>

          <div className="mt-2">
            <h4 className="font-semibold">Matched Skills:</h4>
            <div className="flex flex-wrap gap-2">
              {matchedSkills.map((skill, index) => (
                <span key={index} className="bg-green-500 text-white px-2 py-1 rounded">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-2">
            <h4 className="font-semibold">Required Skills:</h4>
            <div className="flex flex-wrap gap-2">
              {requiredSkills.map((skill, index) => (
                <span
                  key={index}
                  className={`px-2 py-1 rounded ${
                    matchedSkills.includes(skill)
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// Main Application Component with Tabs
const SkillAnalyzerApp = () => {

  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState('skills'); // 'skills', 'ats', 'jobs'
  const [skills, setSkills] = useState([]);
  const [analysis, setAnalysis] = useState([]);
  const [bestJobTitle, setBestJobTitle] = useState('');
  const [jobOutlook, setJobOutlook] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null); // Uncommented
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const svgRef = useRef();
  const [showJobOutlook, setShowJobOutlook] = useState(false);
  // const [userRole, setUserRole] = useState(null); // Keep or remove based on actual usage, `user.role` is usually sufficient


  // Re-enabled and updated useEffect for authentication check
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token'); // Ensure this matches your API
      if (token) {
        try {
          const response = await api.getCurrentUser(); // Your API call to get user details
          setUser(response.data.user);
          // setUserRole(response.data.user.role); // If you use a separate userRole state
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('access_token');
          setUser(null);
          // setUserRole(null);
        }
      }
    };
    checkAuth();
  }, []); // Run once on component mount

  useEffect(() => {
    const fetchUserSkills = async () => {
      if (user && user.id) {
        try {
          const response = await api.listSkills();
          setSkills(response.data.skills || []);
        } catch (error) {
          console.error("Error fetching user skills:", error);
          if (error.response && error.response.status === 401) {
            handleLogout(); // Log out if token is invalid
          }
        }
      } else {
        // If no user, clear skills to prevent showing skills from previous logged-in sessions
        setSkills([]);
      }
    };
    fetchUserSkills();
  }, [user]); // Depend on user changing

  useEffect(() => {
    if (skills.length > 0) {
      setAnalysisLoading(true);
      api.evaluateSkills({ skills })
        .then(response => {
          const analysisData = response.data.analysis || [];
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
      setBestJobTitle(''); // Clear best job title if no skills
    }
  }, [skills]);


  useEffect(() => {
    if (bestJobTitle) {
      api.postEmployerJobOutlook({job_title: bestJobTitle}) // Ensure the payload matches your API
        .then(res => setJobOutlook(res.data))
        .catch(err => {
          console.error('Failed to fetch job outlook:', err);
          setJobOutlook(null);
        });
    } else {
      setJobOutlook(null); // Clear outlook if no best job title
    }
  }, [bestJobTitle]);


  const handleAddSkill = async (skillName) => {
    if (skillName && !skills.includes(skillName)) {
      try {
        let mappedSkill = skillName;

        try {
          const res = await api.mapSkill({ skill: skillName });
          if (res.data?.mapped_skill) {
            mappedSkill = res.data.mapped_skill;
          }
        } catch (err) {
          console.warn("Gemini mapping failed, keeping original:", skillName);
        }

        if (user) { // Only call API if user is logged in
          await api.addSkill({ skill: mappedSkill });
        }

        setSkills((prev) => [...prev, mappedSkill]);
        setError('');
      } catch (error) {
        console.error("Error adding skill:", error);
        setError('Failed to add skill. Please try again.');

        // Allow adding to local state even if not logged in (for demo purposes)
        if (!user) {
          setSkills((prev) => [...prev, skillName]);
        }
      }
    }
  };

  const handleRemoveSkill = async (skillToRemove) => {
    try {
      if (user) { // Only call API if user is logged in
        await api.removeSkill({ skill: skillToRemove });
      }
      setSkills(prevSkills => prevSkills.filter(skill => skill !== skillToRemove));
      setError('');
    } catch (error) {
      console.error("Error removing skill:", error);
      setError('Failed to remove skill. Please try again.');

      // Allow removing from local state even if not logged in
      if (!user) {
        setSkills(prevSkills => prevSkills.filter(skill => skill !== skillToRemove));
      }
    }
  };

  const handleResetSkills = async () => {
    try {
      if (user) { // Only call API if user is logged in
        const currentSkills = [...skills];
        for (const skill of currentSkills) {
          await api.removeSkill({ skill }); // Assuming your backend can handle multiple removes or you iterate
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

  // Re-enabled and updated handleAuth
  const handleAuth = async (authData) => {
    setLoading(true);
    setError('');
    try {
      if (authData.isSignup) {
        await api.signup({
          email: authData.email,
          password: authData.password,
          name: authData.name,
          role: authData.role || 'employee' // Default to employee role
        });
        const loginResponse = await api.login({ email: authData.email, password: authData.password });
        setUser(loginResponse.data.user);
        // setUserRole(loginResponse.data.user.role); // If you use a separate userRole state
        localStorage.setItem('access_token', loginResponse.data.access_token); // Store the token
      } else {
        const response = await api.login({ email: authData.email, password: authData.password });
        setUser(response.data.user);
        // setUserRole(response.data.user.role); // If you use a separate userRole state
        localStorage.setItem('access_token', response.data.access_token); // Store the token
      }
      setShowAuth(false);
      toast.success(authData.isSignup ? "Signup successful!" : "Login successful!");
    } catch (error) {
      console.error('Auth failed:', error);
      const errorMessage = error.response?.data?.msg || error.message || 'Authentication failed';
      setError(errorMessage);
      toast.error(`Authentication failed: ${errorMessage}`); // Use toast for errors too
    } finally {
      setLoading(false);
    }
  };

  // Re-enabled handleLogout
  const handleLogout = () => {
    api.logout(); // This should clear the token on the backend if needed, or simply clear local storage
    localStorage.removeItem('access_token'); // Clear token from local storage
    setUser(null);
    // setUserRole(null);
    setSkills([]); // Clear skills on logout
    setAnalysis([]);
    setError('');
    toast.info("Logged out successfully.");
  };

  const handleResumeUpload = async (file) => {
    setLoading(true);
    setError('');
    setResumeFile(file); // Store for ATS analysis

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.uploadResume(formData);

      const extractedSkills = response.data.extracted_skills || [];
      const suggestedSkills = response.data.suggested_skills || [];
      const allNewSkills = [...extractedSkills, ...suggestedSkills];

      const newSkills = [...skills];
      let addedCount = 0;

      for (const skill of allNewSkills) {
        if (!newSkills.includes(skill)) {
          newSkills.push(skill);
          addedCount++;

          if (user) { // Only add to backend if user is logged in
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

        // You might need to adjust this depending on how your SVG is structured for styling
        // For inline SVGs or SVGs loaded from local files, this should be fine.
        // For external SVG resources or complex styling, you might need a more robust approach.
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

  const tabs = [
    { id: 'skills', label: 'Skills & Analysis', icon: GitBranch },
    { id: 'ats', label: 'ATS Score', icon: Target },
    { id: 'jobs', label: 'Job Search', icon: Briefcase },
    ...(user?.role === 'employer'
      ? [{ id: 'employer', label: 'Employer Dashboard', icon: Users }]
      : []),
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
        <div className="flex gap-2 mb-6 border-b">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-all border-b-2 ${
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
                resumeFile={resumeFile}
                skills={skills}
              />
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="col-span-2">
              <JobSearch isDark={isDark} skills={skills} />
            </div>
          )}
          {activeTab === 'employer' && user?.role === 'employer' && (
            <div className="col-span-2">
              <EmployerDashboard isDark={isDark} />
            </div>
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
        jobs={analysis.slice(0, 5)} // Pass relevant data to the modal
        isOpen={showJobOutlook}
        onClose={() => setShowJobOutlook(false)}
        isDark={isDark}
      />

    </div>
  );
};

export default SkillAnalyzerApp;