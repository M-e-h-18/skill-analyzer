import React, { useEffect, useState } from "react";
import { postEmployerJob, getMyJobs, deleteJob, getJobApplicants, analyzeCandidateATS, suggestJobSkills, updateApplicationStatus, sendMessagingRequest, getEmployerSentRequests } from "../api/api";
import { CardHeader, CardTitle, CardDescription, Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Plus, Trash, FileText, Users, Lightbulb, XCircle, Briefcase, MessageCircle, Send, CheckCircle, UserCheck, Clock } from "lucide-react";
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import MessagingPanel from "./MessagingPanel"; // Assuming this is for active chats, not requests

const EmployerDashboard = ({ isDark, user }) => {
  const [activeTab, setActiveTab] = useState('jobs'); 
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newJob, setNewJob] = useState({ title: "", description: "", location: "", salary: "", skills_required: [] });
  const [showJobApplicants, setShowJobApplicants] = useState(false);
  const [suggestedJobSkills, setSuggestedJobSkills] = useState([]);
  const [jobSkillsLoading, setJobSkillsLoading] = useState(false);
  const [currentSkillInput, setCurrentSkillInput] = useState("");

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [messageText, setMessageText] = useState('');

  const [sentMessageRequests, setSentMessageRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);


  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await getMyJobs();
      setJobs(response.jobs || []);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      toast.error("Failed to load your jobs.");
    } finally {
      setLoading(false);
    }
  };

  const loadSentMessageRequests = async () => {
    setRequestsLoading(true);
    try {
      const response = await getEmployerSentRequests();
      setSentMessageRequests(response.requests || []);
    } catch (err) {
      console.error("Error fetching sent message requests:", err);
      toast.error("Failed to load sent message requests.");
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    loadSentMessageRequests(); // Load sent requests on component mount
  }, []);

  const handleJobPost = async () => {
    if (!newJob.title || !newJob.description) {
      toast.error("Job title and description are required!");
      return;
    }
    setLoading(true);
    try {
      await postEmployerJob(newJob);
      toast.success("Job posted successfully!");
      setNewJob({ title: "", description: "", location: "", salary: "", skills_required: [] });
      setSuggestedJobSkills([]);
      loadJobs();
    } catch (err) {
      toast.error("Failed to post job.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;
    try {
      await deleteJob(jobId);
      toast.success("Job deleted successfully!");
      loadJobs();
      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
        setCandidates([]);
        setShowJobApplicants(false);
      }
    } catch (err) {
      toast.error("Failed to delete job.");
      console.error(err);
    }
  };

  const handleFetchApplicants = async (job) => {
    setSelectedJob(job);
    setShowJobApplicants(true);
    setLoading(true);
    try {
      const response = await getJobApplicants(job.id);
      setCandidates(response.applicants || []);
    } catch (err) {
      console.error("Error fetching applicants:", err);
      toast.error("Failed to fetch applicants.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeCandidateATS = async (jobId, candidateId, candidateName) => {
    setLoading(true);
    try {
      const response = await analyzeCandidateATS(jobId, candidateId);
      toast.success(`ATS score for ${candidateName}: ${response.score}%`);
      setCandidates(prev => prev.map(c =>
        c.candidate_id === candidateId ? { ...c, ats_score: `${response.score}%` } : c
      ));
    } catch (err) {
      toast.error("Failed to analyze candidate ATS.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestJobSkills = async () => {
    if (!newJob.description && !newJob.title) {
      toast.error("Please provide a job title or description.");
      return;
    }
    setJobSkillsLoading(true);
    try {
      const response = await suggestJobSkills({
        title: newJob.title,
        description: newJob.description,
      });
      const { required_skills, complementary_skills } = response;
      const allSuggested = [...new Set([...required_skills, ...complementary_skills])];
      setSuggestedJobSkills(allSuggested);
    } catch (err) {
      toast.error("Failed to suggest job skills.");
      console.error(err);
    } finally {
      setJobSkillsLoading(false);
    }
  };

  const handleAddSkillToJob = (skill) => {
    if (!newJob.skills_required.includes(skill)) {
      setNewJob(prev => ({
        ...prev,
        skills_required: [...prev.skills_required, skill]
      }));
    }
    setCurrentSkillInput("");
  };

  const handleRemoveSkillFromJob = (skillToRemove) => {
    setNewJob(prev => ({
      ...prev,
      skills_required: prev.skills_required.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleUpdateStatus = async (jobId, candidateId, newStatus) => {
    try {
      await updateApplicationStatus(jobId, candidateId, newStatus);
      toast.success(`Application status updated to ${newStatus}`);
      setCandidates(prev => prev.map(c =>
        c.candidate_id === candidateId ? { ...c, status: newStatus } : c
      ));
      loadJobs();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update application status');
    }
  };

  const handleSendMessageRequest = async () => {
    if (!messageText.trim()) {
      toast.error('Please enter a message');
      return;
    }
    try {
      await sendMessagingRequest({ candidate_id: selectedCandidate.candidate_id, job_id: selectedJob.id, message: messageText });
      toast.success('Messaging request sent successfully!');
      setShowMessageModal(false);
      setMessageText('');
      setSelectedCandidate(null);
      loadSentMessageRequests(); // Reload sent requests after sending a new one
    } catch (error) {
      console.error('Error sending message request:', error);
      toast.error(error.response?.data?.msg || 'Failed to send messaging request');
    }
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'accepted': return isDark ? 'text-green-400' : 'text-green-600';
      case 'rejected': return isDark ? 'text-red-400' : 'text-red-600';
      case 'interviewing': return isDark ? 'text-blue-400' : 'text-blue-600';
      default: return isDark ? 'text-yellow-400' : 'text-yellow-600';
    }
  };

  const getATSScoreColor = (scoreStr) => {
    const score = parseInt(scoreStr);
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const primaryTextColor = isDark ? 'text-cyan-400' : 'text-blue-600';
  const secondaryTextColor = isDark ? 'text-slate-300' : 'text-gray-700';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';
  const cardBorder = isDark ? 'border-cyan-400/20' : 'border-gray-200';
  const inputBg = isDark ? 'bg-slate-700 text-white border-cyan-400/20' : 'bg-white text-gray-800 border-gray-300';
  const buttonPrimary = isDark ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white' : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white';
  const buttonSecondary = isDark ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800';
  const badgeColors = isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-blue-100 text-blue-800';
  const badgeDanger = 'bg-red-500/20 text-red-400';
  const badgeSuccess = 'bg-green-500/20 text-green-400';

  if (loading && jobs.length === 0) {
    return (
      <div className={`rounded-xl border p-12 text-center ${isDark ? 'border-cyan-400/30 bg-slate-800/50' : 'border-slate-300 bg-white'}`}>
        <div className={`w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4 ${isDark ? 'border-cyan-400 border-t-transparent' : 'border-blue-600 border-t-transparent'}`} />
        <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-8 ${secondaryTextColor}`}>
        {/* Tab Navigation */}
        <div className={`flex gap-4 border-b pb-4 ${isDark ? 'border-cyan-400/20' : 'border-slate-200'}`}>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'jobs'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-blue-100 text-blue-700'
                : isDark
                ? 'text-slate-400 hover:text-slate-300'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-5 h-5" />
            My Jobs
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'requests'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-blue-100 text-blue-700'
                : isDark
                ? 'text-slate-400 hover:text-slate-300'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            Sent Requests
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'messages'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-blue-100 text-blue-700'
                : isDark
                ? 'text-slate-400 hover:text-slate-300'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            Active Chats
          </button>
        </div>

        {/* Conditional Content Based on Active Tab */}
        {activeTab === 'jobs' && (
          <>
            <h2 className={`text-3xl font-bold ${primaryTextColor}`}>My Jobs Dashboard</h2>

            {/* Stats Overview */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className={`rounded-xl border p-6 ${isDark ? 'border-cyan-400/30 bg-slate-800/50' : 'border-slate-300 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Active Jobs</p>
                    <p className={`text-3xl font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                      {jobs.filter(j => j.is_active).length}
                    </p>
                  </div>
                  <Briefcase className={`w-12 h-12 ${isDark ? 'text-cyan-400/30' : 'text-blue-200'}`} />
                </div>
              </div>
              <div className={`rounded-xl border p-6 ${isDark ? 'border-cyan-400/30 bg-slate-800/50' : 'border-slate-300 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Total Applicants</p>
                    <p className={`text-3xl font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                      {jobs.reduce((acc, job) => acc + (job.applicants?.length || 0), 0)}
                    </p>
                  </div>
                  <Users className={`w-12 h-12 ${isDark ? 'text-cyan-400/30' : 'text-blue-200'}`} />
                </div>
              </div>
              <div className={`rounded-xl border p-6 ${isDark ? 'border-cyan-400/30 bg-slate-800/50' : 'border-slate-300 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Pending Reviews</p>
                    <p className={`text-3xl font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                      {jobs.reduce((acc, job) => acc + (job.applicants?.filter(a => a.status?.toLowerCase() === 'pending')?.length || 0), 0)}
                    </p>
                  </div>
                  <Clock className={`w-12 h-12 ${isDark ? 'text-cyan-400/30' : 'text-blue-200'}`} />
                </div>
              </div>
            </div>

            {/* Post New Job Card */}
            <Card className={`${cardBg} ${cardBorder}`}>
              <CardHeader>
                <CardTitle className={primaryTextColor}>Post a New Job</CardTitle>
                <CardDescription className={secondaryTextColor}>Fill out the details below to post a new job opening.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  className={inputBg}
                  placeholder="Job Title"
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                />
                <Textarea
                  className={inputBg}
                  placeholder="Job Description"
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  rows={6}
                />
                <Input
                  className={inputBg}
                  placeholder="Location (e.g., Remote, London, India)"
                  value={newJob.location}
                  onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                />
                <Input
                  className={inputBg}
                  placeholder="Salary (e.g., $80,000 - $100,000)"
                  value={newJob.salary}
                  onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      className={`${inputBg} flex-grow`}
                      placeholder="Add a required skill (e.g., Python)"
                      value={currentSkillInput}
                      onChange={(e) => setCurrentSkillInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && currentSkillInput) {
                          e.preventDefault();
                          handleAddSkillToJob(currentSkillInput);
                        }
                      }}
                    />
                    <Button onClick={() => handleAddSkillToJob(currentSkillInput)} className={buttonSecondary} disabled={!currentSkillInput}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                    <Button onClick={handleSuggestJobSkills} className={buttonSecondary} disabled={jobSkillsLoading}>
                      <Lightbulb className="w-4 h-4 mr-1" /> {jobSkillsLoading ? 'Loading...' : 'Suggest'}
                    </Button>
                  </div>

                  {suggestedJobSkills.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-2">AI Suggested Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedJobSkills.map((skill, index) => (
                          <Badge
                            key={index}
                            className={`${badgeColors} cursor-pointer hover:opacity-80`}
                            onClick={() => handleAddSkillToJob(skill)}
                          >
                            {skill} <Plus className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {newJob.skills_required.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-2">Required Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {newJob.skills_required.map((skill, index) => (
                          <Badge key={index} className={`${badgeColors}`}>
                            {skill}
                            <XCircle
                              className="w-3 h-3 ml-1 cursor-pointer hover:text-red-400"
                              onClick={() => handleRemoveSkillFromJob(skill)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={handleJobPost} className={`${buttonPrimary} w-full`} disabled={loading}>
                  {loading ? 'Posting...' : <><Plus className="w-4 h-4 mr-2" /> Post Job</>}
                </Button>
              </CardContent>
            </Card>

            {/* My Posted Jobs Card */}
            <Card className={`${cardBg} ${cardBorder}`}>
              <CardHeader>
                <CardTitle className={primaryTextColor}>My Posted Jobs</CardTitle>
                <CardDescription className={secondaryTextColor}>Manage your active job listings.</CardDescription>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <p className="text-center italic py-8">You haven't posted any jobs yet.</p>
                ) : (
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <Card key={job.id} className={`${cardBg} ${cardBorder}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className={`text-lg font-semibold ${primaryTextColor}`}>{job.title}</h3>
                              <p className={`text-sm ${secondaryTextColor} mt-1`}>
                                {job.location || 'No location'} • {job.salary || 'Salary not specified'}
                              </p>
                              {job.skills_required && job.skills_required.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {job.skills_required.map((skill, idx) => (
                                    <Badge key={idx} className={badgeColors}>{skill}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleFetchApplicants(job)}
                                className={buttonSecondary}
                              >
                                <Users className="w-4 h-4 mr-1" />
                                {job.applicants?.length || 0}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(job.id)}
                                className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'requests' && (
          <>
            <h2 className={`text-3xl font-bold ${primaryTextColor}`}>Sent Messaging Requests</h2>
            <Card className={`${cardBg} ${cardBorder}`}>
              <CardHeader>
                <CardTitle className={primaryTextColor}>Your Outgoing Requests</CardTitle>
                <CardDescription className={secondaryTextColor}>Track the messaging requests you've sent to candidates.</CardDescription>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <p>Loading sent requests...</p>
                  </div>
                ) : sentMessageRequests.length === 0 ? (
                  <p className="text-center italic py-8">You haven't sent any messaging requests yet.</p>
                ) : (
                  <div className="space-y-4">
                    {sentMessageRequests.map((request) => (
                      <Card key={request.id} className={`${cardBg} ${cardBorder}`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className={`text-lg font-semibold ${primaryTextColor}`}>
                                Request to: {request.candidate_name}
                              </h4>
                              <p className={`text-sm ${secondaryTextColor}`}>
                                For Job: "{request.job_title}"
                              </p>
                              <p className={`text-xs ${secondaryTextColor} mt-1`}>
                                Sent: {new Date(request.sent_at).toLocaleDateString()}
                              </p>
                              <p className={`text-sm ${secondaryTextColor} mt-2 italic`}>
                                Message: "{request.initial_message}"
                              </p>
                            </div>
                            <Badge className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(request.status)}`}>
                              {request.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'messages' && (
          <MessagingPanel isDark={isDark} user={user} />
        )}
      </div>

      {/* Job Applicants Dialog */}
      <Dialog open={showJobApplicants} onOpenChange={setShowJobApplicants}>
        <DialogContent className={`${cardBg} ${cardBorder} max-w-3xl max-h-[80vh]`}>
          <DialogHeader>
            <DialogTitle className={primaryTextColor}>
              Applicants for "{selectedJob?.title}"
            </DialogTitle>
            <DialogDescription className={secondaryTextColor}>
              Review candidates who have applied to this job.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <p>Loading applicants...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8">
              <p className="italic">No applicants yet.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px] pr-4">
              <div className="space-y-4">
                {candidates.map((candidate) => (
                  <Card key={candidate.candidate_id} className={`${cardBg} ${cardBorder}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className={`text-lg font-semibold ${primaryTextColor}`}>
                            {candidate.candidate_name}
                          </h4>
                          <p className={`text-sm ${secondaryTextColor}`}>
                            {candidate.candidate_email}
                          </p>
                          <p className={`text-xs ${secondaryTextColor} mt-1`}>
                            Applied: {new Date(candidate.applied_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${getATSScoreColor(candidate.ats_score)}`}>
                            {candidate.ats_score || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">ATS Score</p>
                          <Badge className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(candidate.status)}`}>
                            {candidate.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Matched Skills:</p>
                          <div className="flex flex-wrap gap-2">
                            {candidate.matched_skills && candidate.matched_skills.length > 0 ? (
                              candidate.matched_skills.map((skill, idx) => (
                                <Badge key={idx} className={badgeSuccess}>{skill}</Badge>
                              ))
                            ) : (
                              <p className="text-sm italic">No matched skills.</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-2">Missing Skills:</p>
                          <div className="flex flex-wrap gap-2">
                            {candidate.missing_skills && candidate.missing_skills.length > 0 ? (
                              candidate.missing_skills.map((skill, idx) => (
                                <Badge key={idx} className={badgeDanger}>{skill}</Badge>
                              ))
                            ) : (
                              <p className="text-sm italic">No critical missing skills.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap pt-3 border-t border-gray-200 dark:border-slate-700">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(selectedJob.id, candidate.candidate_id, 'interviewing')}
                          disabled={candidate.status?.toLowerCase() === 'interviewing'}
                          className={`${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50'}`}
                        >
                          <UserCheck className="w-3 h-3 mr-1" /> Shortlist
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(selectedJob.id, candidate.candidate_id, 'accepted')}
                          disabled={candidate.status?.toLowerCase() === 'accepted'}
                          className={`${isDark ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50' : 'bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50'}`}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(selectedJob.id, candidate.candidate_id, 'rejected')}
                          disabled={candidate.status?.toLowerCase() === 'rejected'}
                          className={`${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50' : 'bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50'}`}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => { setSelectedCandidate(candidate); setShowMessageModal(true); }}
                          className={`${isDark ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                        >
                          <MessageCircle className="w-3 h-3 mr-1" /> Message
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className ={`rounded-xl border max-w-lg w-full ${isDark ? 'border-cyan-400/30 bg-slate-800' : 'border-slate-300 bg-white'}`}>
            <div className={`p-6 border-b ${isDark ? 'border-cyan-400/20' : 'border-slate-200'}`}>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}> Send Messaging Request </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}> To: {selectedCandidate?.candidate_name} </p>
            </div>
            <div className="p-6">
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}> Initial Message </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Introduce yourself and explain why you'd like to connect..."
                rows={5}
                className={`w-full px-4 py-3 rounded-lg border ${isDark ? 'bg-slate-900 border-cyan-400/30 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'} focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-cyan-400' : 'focus:ring-blue-600'}`}
              />
              <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}> The candidate will need to accept your request before you can chat. </p>
            </div>
            <div className={`p-6 border-t flex gap-3 ${isDark ? 'border-cyan-400/20' : 'border-slate-200'}`}>
              <Button
                onClick={() => { setShowMessageModal(false); setMessageText(''); setSelectedCandidate(null); }}
                className={`flex-1 ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessageRequest}
                className={`flex-1 ${isDark ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                <Send className="w-4 h-4 inline mr-2" /> Send Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployerDashboard;