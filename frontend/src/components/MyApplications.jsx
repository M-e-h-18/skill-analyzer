import React, { useState, useEffect } from 'react';
import { Briefcase, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { getMyApplications } from '../api/api';
import { toast } from 'react-toastify';

const MyApplications = ({ isDark }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await getMyApplications();
      setApplications(response.applications || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return isDark
          ? 'bg-green-500/10 text-green-400 border-green-400/30'
          : 'bg-green-100 text-green-700 border-green-300';
      case 'rejected':
        return isDark
          ? 'bg-red-500/10 text-red-400 border-red-400/30'
          : 'bg-red-100 text-red-700 border-red-300';
      case 'pending':
        return isDark
          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-400/30'
          : 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return isDark
          ? 'bg-gray-500/10 text-gray-400 border-gray-400/30'
          : 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getATSScoreColor = (scoreStr) => {
    const score = parseInt(scoreStr);
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div
        className={`rounded-xl border ${
          isDark ? 'border-cyan-400/30 bg-slate-800/50' : 'border-slate-300 bg-white'
        } backdrop-blur-sm p-6`}
      >
        <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${
        isDark ? 'border-cyan-400/30 bg-slate-800/50' : 'border-slate-300 bg-white'
      } backdrop-blur-sm p-6`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Briefcase className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
            My Applications
          </h2>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-100 text-blue-700'
          }`}
        >
          {applications.length} Total
        </span>
      </div>

      {/* Applications List */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {applications.length === 0 ? (
          <div className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">No applications yet</p>
            <p>Start applying to jobs to see your applications here!</p>
          </div>
        ) : (
          applications.map((app, index) => (
            <div
              key={app.job_id || index}
              className={`p-5 rounded-lg border transition-all hover:shadow-lg ${
                isDark
                  ? 'border-cyan-400/20 bg-slate-900/50 hover:border-cyan-400/40'
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              {/* Job Title & Company */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {app.job_title}
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-cyan-400' : 'text-blue-600'} font-medium`}>
                    {app.company}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
                    📍 {app.location}
                  </p>
                </div>
                
                {/* Status Badge */}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(app.status)}`}>
                  {getStatusIcon(app.status)}
                  <span className="text-sm font-semibold capitalize">{app.status}</span>
                </div>
              </div>

              {/* ATS Score */}
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 ${getATSScoreColor(app.ats_score)}`} />
                  <span className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    ATS Score:
                  </span>
                  <span className={`text-lg font-bold ${getATSScoreColor(app.ats_score)}`}>
                    {app.ats_score}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className={`mt-2 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  <div
                    className={`h-full rounded-full transition-all ${
                      parseInt(app.ats_score) >= 80
                        ? 'bg-green-500'
                        : parseInt(app.ats_score) >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: app.ats_score }}
                  />
                </div>
              </div>

              {/* Skills Match */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {/* Matched Skills */}
                {app.matched_skills && app.matched_skills.length > 0 && (
                  <div>
                    <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                      ✓ Matched Skills ({app.matched_skills.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {app.matched_skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-1 rounded ${
                            isDark
                              ? 'bg-green-500/10 text-green-300 border border-green-400/30'
                              : 'bg-green-100 text-green-700 border border-green-300'
                          }`}
                        >
                          {skill}
                        </span>
                      ))}
                      {app.matched_skills.length > 3 && (
                        <span className={`text-xs px-2 py-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          +{app.matched_skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Missing Skills */}
                {app.missing_skills && app.missing_skills.length > 0 && (
                  <div>
                    <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                      ⚠ Skills to Improve ({app.missing_skills.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {app.missing_skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-1 rounded ${
                            isDark
                              ? 'bg-orange-500/10 text-orange-300 border border-orange-400/30'
                              : 'bg-orange-100 text-orange-700 border border-orange-300'
                          }`}
                        >
                          {skill}
                        </span>
                      ))}
                      {app.missing_skills.length > 3 && (
                        <span className={`text-xs px-2 py-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          +{app.missing_skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Applied Date */}
              <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-2`}>
                <Clock className="w-3 h-3" />
                Applied: {new Date(app.applied_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyApplications;