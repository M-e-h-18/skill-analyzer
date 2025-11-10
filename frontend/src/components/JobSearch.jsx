import React, { useState, useRef, useEffect } from 'react'; // Import useEffect
import { Briefcase, Search, ExternalLink, AlertCircle, Lightbulb } from 'lucide-react'; // Import Lightbulb icon
import { searchJobs } from '../api/api';
import { toast } from 'react-toastify';

const JobSearch = ({ isDark, skills = [] }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // Default to empty for flexible search
  const [location, setLocation] = useState('in'); // Default location to 'uk' as per backend
  const [hasSearched, setHasSearched] = useState(false);
  const [suggestedRoles, setSuggestedRoles] = useState([]); // New state for suggested roles

  const lastSearchTime = useRef(0);
  const searchCount = useRef(0);
  const isSearching = useRef(false);

  // Effect to automatically trigger a search if skills are passed initially
  // and no manual search has been performed yet.
  useEffect(() => {
    if (skills && skills.length > 0 && !hasSearched && !isSearching.current) {
      // Small delay to ensure all initial component states are set
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [skills]); // Re-run when skills change or initially mounted

  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    if (isSearching.current) return;

    const now = Date.now();
    // Basic rate limiting for UI
    if (now - lastSearchTime.current < 2000) {
      toast.warning('Please wait a moment before searching again');
      return;
    }

    // This client-side rate limit is quite aggressive, consider removing or making it server-side.
    // For now, let's keep it to prevent accidental hammering.
    if (searchCount.current >= 5) { // Changed to >= 5 to allow 5 searches within the window
      toast.error('Too many search attempts. Please refresh the page or wait.');
      return;
    }

    lastSearchTime.current = now;
    searchCount.current += 1;
    // Reset search count after 10 seconds
    const timeoutId = setTimeout(() => {
      searchCount.current = 0;
    }, 10000); // 10 seconds

    const queryTrimmed = searchQuery.trim();
    const locationTrimmed = location.trim();

    // The backend now handles role suggestions if query is empty,
    // so it's okay for queryTrimmed to be empty if skills are present.
    if (!queryTrimmed && !locationTrimmed && skills.length === 0) {
      toast.warning('Please enter a job title, location, or provide some skills.');
      return;
    }

    isSearching.current = true;
    setLoading(true);
    setSuggestedRoles([]); // Clear previous suggestions

    try {
      const payload = {
        skills: skills, // Ensure skills array is passed correctly
        query: queryTrimmed, // Pass empty string if no manual query
        location: locationTrimmed || 'in', // Default to 'in' if location is empty
      };

      console.log("Sending payload to backend:", payload); // Debugging

      const response = await searchJobs(payload);

      // --- DEBUGGING LOGS START ---
      console.log("Full API Response object:", response);
      console.log("API Response jobs array:", response.jobs);
      // --- DEBUGGING LOGS END ---

      // Handle both `jobs` and `suggested_roles` from the backend response
      const jobsArray = response.jobs || [];
      const receivedSuggestedRoles = response.suggested_roles || [];

      // --- DEBUGGING LOGS START ---
      console.log("Jobs array before setting state (jobsArray):", jobsArray);
      // --- DEBUGGING LOGS END ---

      if (jobsArray.length > 0) {
        setJobs(jobsArray);
        toast.success(`Found ${jobsArray.length} jobs!`);
      } else {
        setJobs([]);
        toast.info('No jobs found. Try different criteria or check suggestions.');
      }

      setSuggestedRoles(receivedSuggestedRoles); // Update suggested roles state
      setHasSearched(true);
    } catch (error) {
      console.error('❌ Search failed:', error);
      clearTimeout(timeoutId); // Clear the timeout on error
      if (error.response?.status === 400) {
        toast.error(error.response.data?.msg || 'Invalid search parameters.');
      } else if (error.response?.status === 429) {
          toast.error('Too many requests. Please wait a bit and try again.');
          // You might want to implement a more robust client-side backoff here too
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Network error or backend not responding. Check your connection or server status.');
      } else {
        toast.error('An unexpected error occurred during search. Please try again.');
      }
      setJobs([]);
      setSuggestedRoles([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
      isSearching.current = false;
    }
  };

  return (
    <div className={`rounded-xl border ${isDark ? 'border-cyan-400/30 bg-slate-800/50' : 'border-slate-300 bg-white'} backdrop-blur-sm p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Briefcase className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Job Search</h2>
        </div>
        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{jobs.length} jobs found</span>
      </div>

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
          } focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-cyan-400/50' : 'focus:ring-blue-500/50'}`}
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
          } focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-cyan-400/50' : 'focus:ring-blue-500/50'}`}
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

      {/* Display user's skills */}
      {skills.length > 0 && (
        <div className={`mb-4 p-3 rounded-lg border ${isDark ? 'bg-blue-500/10 border-blue-400/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
          <p className="text-sm">
            🎯 Your skills: {skills.slice(0, 5).join(', ')}{skills.length > 5 ? '...' : ''}
          </p>
        </div>
      )}

      {/* Display suggested roles if available and no specific query was given */}
      {suggestedRoles.length > 0 && !searchQuery.trim() && (
        <div className={`mb-4 p-3 rounded-lg border ${isDark ? 'bg-indigo-500/10 border-indigo-400/30 text-indigo-300' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>
          <p className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Suggested roles based on your skills:
            <span className="font-semibold ml-1">{suggestedRoles.join(', ')}</span>
          </p>
          <p className="text-xs mt-1">
            (These roles were used to broaden your search)
          </p>
        </div>
      )}

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {/* --- TEMPORARY DEBUGGING LINE START --- */}
        <p style={{color: 'lime', backgroundColor: 'black'}}>DEBUG: jobs.length = {jobs.length}, hasSearched = {String(hasSearched)}</p>
        {/* --- TEMPORARY DEBUGGING LINE END --- */}

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
            <p className="text-sm">Default: no job title, location 'in'.</p>
            <p className="text-sm">Click "Search" or modify the criteria above</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">No jobs found</p>
            <p>Try different search criteria. If you provided skills, we searched for suggested roles.</p>
            {suggestedRoles.length > 0 && (
              <p className="text-sm mt-2">
                We tried searching for roles like: <span className="font-semibold">{suggestedRoles.join(', ')}</span>
              </p>
            )}
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
              {/* --- TEMPORARY DEBUGGING LINE START --- */}
              <p style={{color: 'orange', fontWeight: 'bold'}}>VISIBLE JOB: {job.title} ({job.company})</p>
              {/* --- TEMPORARY DEBUGGING LINE END --- */}

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
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                    job.source === 'Adzuna'
                      ? 'bg-green-500/10 text-green-400 border border-green-400/30'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-400/30'
                  }`}>
                    {job.source}
                  </span>
                )}
              </div>

              <div className={`flex flex-wrap gap-3 text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
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

              {job.url && (
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
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JobSearch;