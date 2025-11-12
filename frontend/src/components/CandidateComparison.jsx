//frontend/src/components/CandidateComparision.jsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { CheckCircle, XCircle, TrendingUp, Award, Users, Medal, Trophy, Star, Crown } from 'lucide-react';
import { toast } from 'react-toastify';
import { getJobApplicants, compareJobCandidates } from '../api/api';

const CandidateComparison = ({ jobId, isDark }) => {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch candidates for this job
  useEffect(() => {
    if (jobId) {
      fetchJobApplicants();
    }
  }, [jobId]);

  const fetchJobApplicants = async () => {
    try {
      const response = await getJobApplicants(jobId);
      setCandidates(response.applicants || []);
      setSelectedCandidates([]);
      setComparison(null);
    } catch (err) {
      setError('Failed to fetch candidates');
      toast.error('Failed to fetch candidates');
    }
  };

  const handleCandidateSelect = (candidateId) => {
    if (selectedCandidates.includes(candidateId)) {
      setSelectedCandidates(selectedCandidates.filter(id => id !== candidateId));
    } else {
      setSelectedCandidates([...selectedCandidates, candidateId]);
    }
  };

  const handleCompare = async () => {
    if (selectedCandidates.length < 2) {
      toast.error('Select at least 2 candidates to compare');
      return;
    }

    setLoading(true);
    try {
      const response = await compareJobCandidates(jobId, selectedCandidates);
      
      if (response && response.candidates) {
        // Sort candidates by ATS score for ranking
        const sortedCandidates = [...response.candidates].sort((a, b) => b.ats_score - a.ats_score);
        setComparison({
          ...response,
          candidates: sortedCandidates
        });
        setError('');
        toast.success('Candidates compared successfully');
      }
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err.response?.data?.msg || 'Comparison failed');
      toast.error('Failed to compare candidates');
    } finally {
      setLoading(false);
    }
  };

  // Get rank badge based on position
  const getRankBadge = (rank) => {
    switch(rank) {
      case 1:
        return { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-500/20', label: '1st Place', tier: 'Champion' };
      case 2:
        return { icon: Trophy, color: 'text-gray-400', bg: 'bg-gray-400/20', label: '2nd Place', tier: 'Runner-up' };
      case 3:
        return { icon: Medal, color: 'text-amber-600', bg: 'bg-amber-600/20', label: '3rd Place', tier: 'Bronze' };
      default:
        return { icon: Star, color: isDark ? 'text-slate-400' : 'text-gray-500', bg: isDark ? 'bg-slate-700' : 'bg-gray-200', label: `${rank}th Place`, tier: 'Participant' };
    }
  };

  // Get performance tier based on ATS score
  const getPerformanceTier = (score) => {
    if (score >= 90) return { label: 'Exceptional', color: 'text-purple-500', bg: 'bg-purple-500/20' };
    if (score >= 80) return { label: 'Excellent', color: 'text-green-500', bg: 'bg-green-500/20' };
    if (score >= 70) return { label: 'Very Good', color: 'text-blue-500', bg: 'bg-blue-500/20' };
    if (score >= 60) return { label: 'Good', color: 'text-cyan-500', bg: 'bg-cyan-500/20' };
    if (score >= 50) return { label: 'Average', color: 'text-yellow-500', bg: 'bg-yellow-500/20' };
    return { label: 'Below Average', color: 'text-red-500', bg: 'bg-red-500/20' };
  };

  const getATSScoreColor = (score) => {
    if (score >= 80) return isDark ? 'text-green-400' : 'text-green-600';
    if (score >= 60) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    return isDark ? 'text-red-400' : 'text-red-600';
  };

  const getATSScoreBg = (score) => {
    if (score >= 80) return isDark ? 'bg-green-500/20' : 'bg-green-100';
    if (score >= 60) return isDark ? 'bg-yellow-500/20' : 'bg-yellow-100';
    return isDark ? 'bg-red-500/20' : 'bg-red-100';
  };

  const chartData = comparison?.candidates.map((c, idx) => ({
    name: c.name.split(' ')[0],
    rank: idx + 1,
    ats_score: c.ats_score,
    matched_skills: c.matched_count,
    missing_skills: c.missing_count
  })) || [];

  return (
    <div className={`p-6 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-3 mb-6">
        <Users className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Compare & Rank Candidates
        </h2>
      </div>

      {/* Candidate Selection */}
      {!comparison ? (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              Select Candidates ({selectedCandidates.length} selected)
            </h3>
            
            {candidates.length === 0 ? (
              <p className={`text-center py-8 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                No applicants yet for this job
              </p>
            ) : (
              <div className="space-y-3">
                {candidates.map(candidate => {
                  const atsScore = parseInt(candidate.ats_score) || 0;
                  return (
                    <div
                      key={candidate.candidate_id}
                      onClick={() => handleCandidateSelect(candidate.candidate_id)}
                      className={`flex items-center p-4 rounded-lg cursor-pointer transition ${
                        selectedCandidates.includes(candidate.candidate_id)
                          ? isDark ? 'bg-cyan-500/20 border-2 border-cyan-400' : 'bg-blue-50 border-2 border-blue-400'
                          : isDark ? 'bg-slate-700 border-2 border-slate-700 hover:border-slate-600' : 'bg-gray-100 border-2 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCandidates.includes(candidate.candidate_id)}
                        onChange={() => {}}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <div className="ml-4 flex-1">
                        <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {candidate.candidate_name}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          {candidate.candidate_email}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-600 text-slate-200' : 'bg-gray-300 text-gray-700'}`}>
                            {candidate.matched_skills?.length || 0} matched
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-600 text-slate-200' : 'bg-gray-300 text-gray-700'}`}>
                            {candidate.missing_skills?.length || 0} missing
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getATSScoreColor(atsScore)}`}>
                          {atsScore}%
                        </p>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          ATS Score
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {error}
            </div>
          )}

          <button
            onClick={handleCompare}
            disabled={selectedCandidates.length < 2 || loading}
            className={`w-full py-3 rounded-lg font-semibold transition-all ${
              isDark
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50'
            }`}
          >
            {loading ? 'Comparing...' : `Compare & Rank (${selectedCandidates.length})`}
          </button>
        </div>
      ) : (
        /* Comparison Results with Rankings */
        <div className="space-y-8">
          {/* Podium Display for Top 3 */}
          {comparison.candidates.length >= 3 && (
            <div className={`p-6 rounded-lg ${isDark ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
              <h3 className={`text-xl font-bold mb-6 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                🏆 Top Performers
              </h3>
              <div className="flex items-end justify-center gap-4">
                {/* 2nd Place */}
                <div className={`flex flex-col items-center p-4 rounded-lg ${isDark ? 'bg-slate-600' : 'bg-white'} flex-1 max-w-[200px]`}>
                  <Trophy className="w-10 h-10 text-gray-400 mb-2" />
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'} mb-2`}>
                    <span className="text-2xl font-bold text-gray-400">2</span>
                  </div>
                  <p className={`font-bold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {comparison.candidates[1].name.split(' ')[0]}
                  </p>
                  <p className={`text-2xl font-bold text-gray-400 mt-2`}>
                    {comparison.candidates[1].ats_score}%
                  </p>
                </div>

                {/* 1st Place */}
                <div className={`flex flex-col items-center p-6 rounded-lg ${isDark ? 'bg-yellow-500/20 border-2 border-yellow-500' : 'bg-yellow-50 border-2 border-yellow-400'} flex-1 max-w-[220px] -mb-4`}>
                  <Crown className="w-12 h-12 text-yellow-500 mb-2 animate-pulse" />
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? 'bg-yellow-500/30' : 'bg-yellow-100'} mb-2`}>
                    <span className="text-3xl font-bold text-yellow-500">1</span>
                  </div>
                  <p className={`font-bold text-lg text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {comparison.candidates[0].name.split(' ')[0]}
                  </p>
                  <p className={`text-3xl font-bold text-yellow-500 mt-2`}>
                    {comparison.candidates[0].ats_score}%
                  </p>
                  <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-yellow-500/30 text-yellow-400' : 'bg-yellow-200 text-yellow-800'}`}>
                    Champion
                  </span>
                </div>

                {/* 3rd Place */}
                <div className={`flex flex-col items-center p-4 rounded-lg ${isDark ? 'bg-slate-600' : 'bg-white'} flex-1 max-w-[200px]`}>
                  <Medal className="w-10 h-10 text-amber-600 mb-2" />
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-gray-100'} mb-2`}>
                    <span className="text-2xl font-bold text-amber-600">3</span>
                  </div>
                  <p className={`font-bold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {comparison.candidates[2].name.split(' ')[0]}
                  </p>
                  <p className={`text-2xl font-bold text-amber-600 mt-2`}>
                    {comparison.candidates[2].ats_score}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparison.comparison_metadata?.top_candidate && (
              <div className={`p-4 rounded-lg border-2 ${isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Award className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  <h4 className={`font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                    Top Candidate
                  </h4>
                </div>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {comparison.comparison_metadata.top_candidate.name}
                </p>
                <p className={`text-3xl font-bold mt-2 ${getATSScoreColor(comparison.comparison_metadata.top_candidate.ats_score)}`}>
                  {comparison.comparison_metadata.top_candidate.ats_score}%
                </p>
              </div>
            )}

            <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700 border border-slate-600' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                <h4 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                  Average ATS Score
                </h4>
              </div>
              <p className={`text-3xl font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                {comparison.comparison_metadata?.avg_ats_score || 0}%
              </p>
            </div>

            <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700 border border-slate-600' : 'bg-gray-50 border border-gray-200'}`}>
              <h4 className={`font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                Total Candidates
              </h4>
              <p className={`text-3xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                {comparison.comparison_metadata?.total_candidates || 0}
              </p>
            </div>
          </div>

          {/* Ranking Chart */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              Candidate Rankings by ATS Score
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#444' : '#ccc'} />
                <XAxis dataKey="name" stroke={isDark ? '#999' : '#666'} />
                <YAxis domain={[0, 100]} stroke={isDark ? '#999' : '#666'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1f2937' : '#fff',
                    border: `1px solid ${isDark ? '#444' : '#ccc'}`,
                    color: isDark ? '#fff' : '#000'
                  }}
                />
                <Legend />
                <Bar dataKey="ats_score" fill="#06b6d4" name="ATS Score %" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Ranked Candidate Cards */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              Complete Rankings
            </h3>
            {comparison.candidates?.map((candidate, idx) => {
              const rank = idx + 1;
              const atsScore = candidate.ats_score || 0;
              const rankBadge = getRankBadge(rank);
              const tier = getPerformanceTier(atsScore);
              const RankIcon = rankBadge.icon;
              
              return (
                <div
                  key={candidate.id}
                  className={`p-6 rounded-lg border-2 ${
                    rank === 1 
                      ? isDark ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-yellow-50 border-yellow-300'
                      : isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-4">
                      {/* Rank Badge */}
                      <div className={`flex flex-col items-center ${rankBadge.bg} rounded-lg p-3`}>
                        <RankIcon className={`w-8 h-8 ${rankBadge.color} mb-1`} />
                        <span className={`text-2xl font-bold ${rankBadge.color}`}>{rank}</span>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {candidate.name}
                          </h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${tier.bg} ${tier.color}`}>
                            {tier.label}
                          </span>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                          {candidate.email}
                        </p>
                      </div>
                    </div>
                    
                    {/* ATS Score Display */}
                    <div className={`px-6 py-4 rounded-lg text-center ${getATSScoreBg(atsScore)}`}>
                      <p className={`text-4xl font-bold ${getATSScoreColor(atsScore)}`}>
                        {atsScore}%
                      </p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                        ATS Score
                      </p>
                    </div>
                  </div>

                  {/* Skills Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Matched Skills */}
                    <div>
                      <h5 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                        <CheckCircle size={18} />
                        Matched Skills ({candidate.matched_count})
                      </h5>
                      {candidate.matched_skills?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {candidate.matched_skills.slice(0, 5).map((skill, i) => (
                            <span
                              key={i}
                              className={`px-3 py-1 rounded-full text-sm ${
                                isDark
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.matched_skills.length > 5 && (
                            <span className={`px-3 py-1 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                              +{candidate.matched_skills.length - 5} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className={`text-sm italic ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          No matched skills
                        </p>
                      )}
                    </div>

                    {/* Missing Skills */}
                    <div>
                      <h5 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        <XCircle size={18} />
                        Missing Skills ({candidate.missing_count})
                      </h5>
                      {candidate.missing_skills?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {candidate.missing_skills.slice(0, 5).map((skill, i) => (
                            <span
                              key={i}
                              className={`px-3 py-1 rounded-full text-sm ${
                                isDark
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.missing_skills.length > 5 && (
                            <span className={`px-3 py-1 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                              +{candidate.missing_skills.length - 5} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className={`text-sm italic ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                          No missing skills
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setComparison(null)}
            className={`w-full py-2 rounded-lg font-semibold transition-all ${
              isDark
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            Compare Different Candidates
          </button>
        </div>
      )}
    </div>
  );
};

export default CandidateComparison;