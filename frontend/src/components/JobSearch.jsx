import React, { useState, useRef, useEffect } from 'react';
import { Briefcase, Search, ExternalLink, AlertCircle, Lightbulb, Building2, CheckCircle } from 'lucide-react';
import { searchJobs, applyToJob } from '../api/api';
import { toast } from 'react-toastify';

const JobSearch = ({ isDark, skills = [] }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('in');
  const [hasSearched, setHasSearched] = useState(false);
  const [suggestedRoles, setSuggestedRoles] = useState([]);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [appliedJobs, setAppliedJobs] = useState(new Set());

  const lastSearchTime = useRef(0);
  const searchCount = useRef(0);
  const isSearching = useRef(false);

  // Auto-search when skills are provided
  useEffect(() => {
    if (skills && skills.length > 0 && !hasSearched && !isSearching.current) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [skills]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    if (isSearching.current) return;

    const now = Date.now();
    if (now - lastSearchTime.current < 2000) {
      toast.warning('Please wait a moment before searching again');
      return;
    }

    if (searchCount.current >= 5) {
      toast.error('Too many search attempts. Please refresh the page or wait.');
      return;
    }

    lastSearchTime.current = now;
    searchCount.current += 1;
    const timeoutId = setTimeout(() => {
      searchCount.current = 0;
    }, 10000);

    const queryTrimmed = searchQuery.trim();
    const locationTrimmed = location.trim();

    if (!queryTrimmed && !locationTrimmed && skills.length === 0) {
      toast.warning('Please enter a job title, location, or provide some skills.');
      return;
    }

    isSearching.current = true;
    setLoading(true);
    setSuggestedRoles([]);

    try {
      const payload = {
        skills: skills,
        query: queryTrimmed,
        location: locationTrimmed || 'in',
      };

      const response = await searchJobs(payload);

      const jobsArray = Array.isArray(response.jobs) ? response.jobs : [];
      const receivedSuggestedRoles = Array.isArray(response.suggested_roles) ? response.suggested_roles : [];

      setJobs(jobsArray);
      setSuggestedRoles(receivedSuggestedRoles);
      setHasSearched(true);

      if (jobsArray.length > 0) {
        const internalCount = response.internal_count || 0;
        const externalCount = jobsArray.length - internalCount;
        toast.success(
          `Found ${jobsArray.length} jobs! (${internalCount} from employers, ${externalCount} external)`
        );
      } else {
        toast.info('No jobs found. Try different criteria or check suggestions.');
      }
    } catch (error) {
      console.error('Search error:', error);
      clearTimeout(timeoutId);

      if (error.response?.status === 400) {
        toast.error(error.response.data?.msg || 'Invalid search parameters.');
      } else if (error.response?.status === 429) {
        toast.error('Too many requests. Please wait a bit and try again.');
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Network error or backend not responding.');
      } else {
        toast.error('An unexpected error occurred during search.');
      }

      setJobs([]);
      setSuggestedRoles([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
      isSearching.current = false;
    }
  };

  const handleApplyToInternalJob = async (jobId) => {
    setApplyingJobId(jobId);
    try {
      const response = await applyToJob(jobId);
      
      toast.success(
        `Application submitted! ATS Score: ${response.ats_score}%`,
        { autoClose: 5000 }
      );
      
      // Mark job as applied
      setAppliedJobs(prev => new Set([...prev, jobId]));
      
      // Show match details
      if (response.matched_skills && response.matched_skills.length > 0) {
        setTimeout(() => {
          toast.info(
            `Matched skills: ${response.matched_skills.join(', ')}`,
            { autoClose: 5000 }
          );
        }, 500);
      }
      
      if (response.missing_skills && response.missing_skills.length > 0) {
        setTimeout(() => {
          toast.warning(
            `Skills to improve: ${response.missing_skills.join(', ')}`,
            { autoClose: 5000 }
          );
        }, 1000);
      }
    } catch (error) {
      console.error('Application error:', error);
      
      if (error.response?.status === 400) {
        toast.error(error.response.data?.msg || 'Cannot apply to this job');
      } else if (error.response?.status === 403) {
        toast.error('Please login as a candidate to apply');
      } else {
        toast.error('Failed to submit application. Please try again.');
      }
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <div
      className={`rounded-xl border ${
        isDark ? 'border-cyan-400/30 bg-slate-800/50' : 'border-slate-300 bg-white'
      } backdrop-blur-sm p-6`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Briefcase className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            Job Search
          </h2>
        </div>
        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {jobs.length} jobs found
        </span>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Job title (e.g., 'Frontend Developer')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`flex-1 px-4 py-2 rounded-lg border ${
            isDark
              ? 'bg-slate-900/50 border-cyan-400/20 text-white placeholder-slate-500'
              : 'bg-gray-50 border-slate-300 text-slate-800 placeholder-gray-400'
          } focus:outline-none focus:ring-2 ${
            isDark ? 'focus:ring-cyan-400/50' : 'focus:ring-blue-500/50'
          }`}
        />
        <input
          type="text"
          placeholder="Location (e.g., 'London', 'Remote')"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={`flex-1 px-4 py-2 rounded-lg border ${
            isDark
              ? 'bg-slate-900/50 border-cyan-400/20 text-white placeholder-slate-500'
              : 'bg-gray-50 border-slate-300 text-slate-800 placeholder-gray-400'
          } focus:outline-none focus:ring-2 ${
            isDark ? 'focus:ring-cyan-400/50' : 'focus:ring-blue-500/50'
          }`}
        />
        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            loading
              ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
              : isDark
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600'
              : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
          }`}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Search
            </>
          )}
        </button>
      </form>

      {/* Skills Display */}
      {skills.length > 0 && (
        <div
          className={`mb-4 p-3 rounded-lg border ${
            isDark
              ? 'bg-blue-500/10 border-blue-400/30 text-blue-300'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}
        >
          <p className="text-sm">
            🎯 Your skills: {skills.slice(0, 5).join(', ')}
            {skills.length > 5 ? '...' : ''}
          </p>
        </div>
      )}

      {/* Suggested Roles Display */}
      {suggestedRoles.length > 0 && !searchQuery.trim() && (
        <div
          className={`mb-4 p-3 rounded-lg border ${
            isDark
              ? 'bg-indigo-500/10 border-indigo-400/30 text-indigo-300'
              : 'bg-purple-50 border-purple-200 text-purple-700'
          }`}
        >
          <p className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Suggested roles based on your skills:
            <span className="font-semibold ml-1">{suggestedRoles.join(', ')}</span>
          </p>
        </div>
      )}

      {/* Jobs Container */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Searching for jobs...</p>
          </div>
        ) : !hasSearched ? (
          <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">Ready to find jobs?</p>
            <p className="mb-4">Enter a job title and location, or let your skills guide the search!</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">No jobs found</p>
            <p>Try different search criteria or adjust your skills.</p>
          </div>
        ) : (
          jobs.map((job, index) => (
            <div
              key={job.id || index}
              className={`p-4 rounded-lg border transition-all hover:shadow-lg ${
                isDark
                  ? 'border-cyan-400/20 bg-slate-900/50 hover:border-cyan-400/40'
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {job.title}
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-cyan-400' : 'text-blue-600'} font-medium`}>
                    {job.company}
                  </p>
                </div>
                {job.source && (
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-md ${
                      job.source === 'Internal'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-400/30'
                        : job.source === 'Adzuna'
                        ? 'bg-green-500/10 text-green-400 border border-green-400/30'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-400/30'
                    }`}
                  >
                    {job.source === 'Internal' ? (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        Internal
                      </span>
                    ) : (
                      job.source
                    )}
                  </span>
                )}
              </div>

              <div
                className={`flex flex-wrap gap-3 text-sm mb-3 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                <span>📍 {job.location || 'N/A'}</span>
                <span>•</span>
                <span>💼 {job.type || 'Full-time'}</span>
                {job.salary && job.salary !== 'Not specified' && (
                  <>
                    <span>•</span>
                    <span>💰 {job.salary}</span>
                  </>
                )}
              </div>

              {/* Skills Required (for internal jobs) */}
              {job.skills_required && job.skills_required.length > 0 && (
                <div className="mb-3">
                  <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Skills Required:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {job.skills_required.map((skill, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-1 rounded ${
                          isDark
                            ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-400/30'
                            : 'bg-blue-100 text-blue-700 border border-blue-300'
                        }`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {job.is_external ? (
                  // External job - open in new tab
                  job.url && (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        isDark
                          ? 'border-cyan-400/30 hover:border-cyan-400 text-cyan-400 hover:bg-cyan-400/10'
                          : 'border-blue-300 hover:border-blue-400 text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      Apply Now
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )
                ) : (
                  // Internal job - apply through platform
                  <button
                    onClick={() => handleApplyToInternalJob(job.id)}
                    disabled={applyingJobId === job.id || appliedJobs.has(job.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                      appliedJobs.has(job.id)
                        ? isDark
                          ? 'bg-green-500/20 text-green-400 border border-green-400/30 cursor-not-allowed'
                          : 'bg-green-100 text-green-700 border border-green-300 cursor-not-allowed'
                        : applyingJobId === job.id
                        ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                        : isDark
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                    }`}
                  >
                    {applyingJobId === job.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Applying...
                      </>
                    ) : appliedJobs.has(job.id) ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Applied
                      </>
                    ) : (
                      <>
                        <Building2 className="w-4 h-4" />
                        Quick Apply
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JobSearch;