import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, User, LogOut, FileText, Briefcase, Upload, Target, Search, ExternalLink, ChevronRight, AlertCircle } from 'lucide-react';
import * as api from './api/api';

// Import existing components
import AuthModal from './components/AuthModal';
import ThemeToggle from './components/ThemeToggle';
import ExportButtons from './components/ExportButtons';
import ResumeUpload from './components/ResumeUpload';
import SkillsInput from './components/SkillsInput';
import GraphView from './components/GraphView';
import AnalysisPanel from './components/AnalysisPanel';
import JobOutlookModal from './components/JobOutlookModal';
//import EmployerDashboard from './components/EmployerDashboard';
//import EmployeeDashboard from './components/EmployeeDashboard';

// New ATS Score Component
const ATSScoreAnalyzer = ({ isDark, resumeFile, skills }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [atsScore, setAtsScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const analyzeATS = async () => {
    if (!jobDescription.trim()) {
      alert('Please enter a job description');
      return;
    }

    setLoading(true);
    try {
      // Prepare data for backend
      const payload = {
        job_description: jobDescription,
        resume_text: resumeFile ? 'Resume uploaded' : '', // You'll need to extract text
        skills: skills
      };

      const response = await api.analyzeATSScore(payload);
      
      setAtsScore(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('ATS analysis failed:', error);
      alert('Failed to analyze ATS score. Please try again.');
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
    <div className={`rounded-xl border ${isDark ? 'border-cyan-400/30 bg-slate-800/50' : 'border-slate-300 bg-white'} backdrop-blur-sm p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <Target className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
          ATS Score Analyzer
        </h2>
      </div>

      {!showResults ? (
        <div className="space-y-4">
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Paste the job description below to see how well your resume matches
          </p>
          
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste job description here..."
            className={`w-full h-48 p-4 rounded-lg border ${
              isDark 
                ? 'bg-slate-900/50 border-cyan-400/20 text-white placeholder-slate-500' 
                : 'bg-gray-50 border-slate-300 text-slate-800 placeholder-gray-400'
            } focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-cyan-400/50' : 'focus:ring-blue-500/50'}`}
          />

          <button
            onClick={analyzeATS}
            disabled={loading || !jobDescription.trim()}
            className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
              loading || !jobDescription.trim()
                ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                : isDark
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
            }`}
          >
            {loading ? 'Analyzing...' : 'Analyze ATS Score'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Score Display */}
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={isDark ? '#1e293b' : '#e2e8f0'}
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="url(#scoreGradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(atsScore?.score || 0) * 3.51} 351.86`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="scoreGradient">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${getScoreColor(atsScore?.score || 0)}`}>
                  {atsScore?.score || 0}%
                </span>
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  ATS Score
                </span>
              </div>
            </div>
          </div>

          {/* Matched Skills */}
          <div>
            <h3 className={`font-semibold mb-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              Matched Skills ({atsScore?.matched_skills?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {atsScore?.matched_skills?.map((skill, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1 rounded-full text-sm ${
                    isDark 
                      ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                      : 'bg-green-100 text-green-700 border border-green-300'
                  }`}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Missing Skills */}
          <div>
            <h3 className={`font-semibold mb-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              Missing Skills ({atsScore?.missing_skills?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {atsScore?.missing_skills?.map((skill, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1 rounded-full text-sm ${
                    isDark 
                      ? 'bg-red-500/20 text-red-300 border border-red-400/30' 
                      : 'bg-red-100 text-red-700 border border-red-300'
                  }`}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              setShowResults(false);
              setJobDescription('');
              setAtsScore(null);
            }}
            className={`w-full px-4 py-2 rounded-lg border ${
              isDark 
                ? 'border-cyan-400/30 hover:border-cyan-400 text-cyan-400' 
                : 'border-slate-300 hover:border-slate-400 text-slate-600'
            } transition-colors`}
          >
            Analyze Another Job
          </button>
        </div>
      )}
    </div>
  );
};


// New Job Search Component
const JobSearch = ({ isDark, skills }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');

  const searchJobs = async () => {
    setLoading(true);
    try {
      const payload = {
        skills: skills,
        query: searchQuery,
        location: location
      };
      
      const response = await api.searchJobs(payload);
      setJobs(response.data.jobs || []);
    } catch (error) {
      console.error('Job search failed:', error);
      // Fallback to mock data for demo
      setJobs([
        {
          id: 1,
          title: 'Senior Full Stack Developer',
          company: 'TechCorp Inc.',
          location: 'San Francisco, CA',
          type: 'Full-time',
          salary: '$120k - $180k',
          posted: '2 days ago',
          match_score: 85,
          url: 'https://example.com/job1'
        },
        {
          id: 2,
          title: 'React Developer',
          company: 'StartupXYZ',
          location: 'Remote',
          type: 'Contract',
          salary: '$90k - $130k',
          posted: '1 week ago',
          match_score: 78,
          url: 'https://example.com/job2'
        },
        {
          id: 3,
          title: 'Backend Engineer',
          company: 'DataSystems Ltd',
          location: 'New York, NY',
          type: 'Full-time',
          salary: '$100k - $150k',
          posted: '3 days ago',
          match_score: 72,
          url: 'https://example.com/job3'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (skills.length > 0) {
      searchJobs();
    }
  }, [skills]);

  return (
    <div className={`rounded-xl border ${isDark ? 'border-cyan-400/30 bg-slate-800/50' : 'border-slate-300 bg-white'} backdrop-blur-sm p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Briefcase className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Matching Jobs
          </h2>
        </div>
        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {jobs.length} jobs found
        </span>
      </div>

      {/* Search Controls */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Job title or keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`flex-1 px-4 py-2 rounded-lg border ${
            isDark 
              ? 'bg-slate-900/50 border-cyan-400/20 text-white placeholder-slate-500' 
              : 'bg-gray-50 border-slate-300 text-slate-800 placeholder-gray-400'
          } focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-cyan-400/50' : 'focus:ring-blue-500/50'}`}
        />
        <input
          type="text"
          placeholder="Location..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={`flex-1 px-4 py-2 rounded-lg border ${
            isDark 
              ? 'bg-slate-900/50 border-cyan-400/20 text-white placeholder-slate-500' 
              : 'bg-gray-50 border-slate-300 text-slate-800 placeholder-gray-400'
          } focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-cyan-400/50' : 'focus:ring-blue-500/50'}`}
        />
        <button
          onClick={searchJobs}
          disabled={loading}
          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
            loading
              ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
              : isDark
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
          }`}
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Job Cards */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className={`text-center py-8 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Searching for matching jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No jobs found. Try adjusting your skills or search criteria.</p>
          </div>
        ) : (
          jobs.map(job => (
            <div
              key={job.id}
              className={`p-4 rounded-lg border transition-all hover:shadow-lg ${
                isDark 
                  ? 'border-cyan-400/20 bg-slate-900/50 hover:border-cyan-400/40' 
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {job.title}
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                    {job.company}
                  </p>
                </div>
                {job.match_score && (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    job.match_score >= 80 
                      ? isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                      : job.match_score >= 60
                        ? isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                        : isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                  }`}>
                    {job.match_score}% Match
                  </span>
                )}
              </div>
              
              <div className={`flex gap-4 text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <span>{job.location}</span>
                <span>•</span>
                <span>{job.type}</span>
                {job.salary && (
                  <>
                    <span>•</span>
                    <span>{job.salary}</span>
                  </>
                )}
                <span>•</span>
                <span>{job.posted}</span>
              </div>

              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  isDark 
                    ? 'border-cyan-400/30 hover:border-cyan-400 text-cyan-400' 
                    : 'border-blue-300 hover:border-blue-400 text-blue-600'
                }`}
              >
                Apply Now
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))
        )}
      </div>
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const svgRef = useRef();
  const [showJobOutlook, setShowJobOutlook] = useState(false);
  //const [userRole, setUserRole] = useState(null);

  // Keep all existing useEffect hooks and handlers from original code
  // useEffect(() => {
  //   const checkAuth = async () => {
  //     const token = localStorage.getItem('access_token');
  //     if (token) {
  //       try {
  //         const response = await api.getCurrentUser();
  //         setUser(response.data.user);
  //       } catch (error) {
  //         console.error('Auth check failed:', error);
  //         localStorage.removeItem('access_token');
  //       }
  //     }
  //   };
  //   checkAuth();
  // }, []);

  useEffect(() => {
    const fetchUserSkills = async () => {
      if (user && user.id) {
        try {
          const response = await api.listSkills();
          setSkills(response.data.skills || []);
        } catch (error) {
          console.error("Error fetching user skills:", error);
          // if (error.response && error.response.status === 401) {
          //   handleLogout();
          // }
        }
      }
    };
    fetchUserSkills();
  }, [user]);

  // useEffect(() => {
  //   if (skills.length > 0) {
  //     setAnalysisLoading(true);
  //     api.evaluateSkills({ skills })
  //       .then(response => {
  //         setAnalysis(response.data.analysis || []);
  //         setError('');
  //       })
  //       .catch(err => {
  //         console.error('Analysis failed:', err);
  //         setAnalysis([]);
  //         setError('Analysis failed. Please try again.');
  //       })
  //       .finally(() => {
  //         setAnalysisLoading(false);
  //       });
  //   } else {
  //     setAnalysis([]);
  //   }
  // }, [skills]);

  useEffect(() => {
  if (skills.length > 0) {
    setAnalysisLoading(true);
    api.evaluateSkills({ skills })
      .then(response => {
        const analysisData = response.data.analysis || [];
        setAnalysis(analysisData);
        setError('');

        // 🔹 NEW: Pick the top recommended job title
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
  }
}, [skills]);


  useEffect(() => {
  if (bestJobTitle) {
    api.getJobOutlook(bestJobTitle)
      .then(res => setJobOutlook(res.data))
      .catch(err => {
        console.error('Failed to fetch job outlook:', err);
        setJobOutlook(null);
      });
  }
}, [bestJobTitle]);


  // Keep all existing handlers from original code
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

  // const handleAuth = async (authData) => {
  //   setLoading(true);
  //   setError('');
  //   try {
  //     if (authData.isSignup) {
  //       await api.signup(authData);
  //       const loginResponse = await api.login(authData);
  //       setUser(loginResponse.data.user);
  //     } else {
  //       const response = await api.login(authData);
  //       setUser(response.data.user);
  //     }
  //     setShowAuth(false);
  //   } catch (error) {
  //     console.error('Auth failed:', error);
  //     const errorMessage = error.response?.data?.msg || error.message || 'Authentication failed';
  //     setError(errorMessage);
  //     alert(`Authentication failed: ${errorMessage}`);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

//   const handleAuth = async (authData) => {
//   setLoading(true);
//   setError('');
//   try {
//     if (authData.isSignup) {
//       await api.signup({
//         ...authData,
//         role: authData.role || 'employee' // Default to employee role
//       });
//       const loginResponse = await api.login(authData);
//       setUser(loginResponse.data.user);
//       setUserRole(loginResponse.data.user.role);
//       localStorage.setItem('token', loginResponse.data.token);
//     } else {
//       const response = await api.login(authData);
//       setUser(response.data.user);
//       setUserRole(response.data.user.role);
//       localStorage.setItem('token', response.data.token);
//     }
//     setShowAuth(false);
//   } catch (error) {
//     console.error('Auth failed:', error);
//     const errorMessage = error.response?.data?.msg || error.message || 'Authentication failed';
//     setError(errorMessage);
//     alert(`Authentication failed: ${errorMessage}`);
//   } finally {
//     setLoading(false);
//   }
// };

//   const handleLogout = () => {
//     api.logout();
//     setUser(null);
//     setSkills([]);
//     setAnalysis([]);
//     setError('');
//   };

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
      alert(`Successfully extracted ${addedCount} new skills from your resume!`);
      
    } catch (error) {
      console.error('Resume upload failed:', error);
      const errorMessage = error.response?.data?.msg || error.message || 'Resume upload failed';
      setError(errorMessage);
      alert(`Resume upload failed: ${errorMessage}`);
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
        alert('PNG export failed. This is a demo limitation.');
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
    alert('PDF export feature would generate a career analysis report. This is a demo limitation.');
  };

  const tabs = [
    { id: 'skills', label: 'Skills & Analysis', icon: GitBranch },
    { id: 'ats', label: 'ATS Score', icon: Target },
    { id: 'jobs', label: 'Job Search', icon: Briefcase }
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
            
            {/* {user ? (
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
            )} */}
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
  </div>
</main>

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
