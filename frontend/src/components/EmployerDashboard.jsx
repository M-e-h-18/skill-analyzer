import React, { useEffect, useState } from "react";
import { postEmployerJob, getMyJobs, deleteJob, getJobApplicants, analyzeCandidateATS, suggestJobSkills } from "../api/api";
import { CardHeader, CardTitle, CardDescription, Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Plus, Trash, FileText, Users, Lightbulb, XCircle } from "lucide-react";
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

const EmployerDashboard = ({ isDark }) => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newJob, setNewJob] = useState({ title: "", description: "", location: "", salary: "", skills_required: [] });
  const [showJobApplicants, setShowJobApplicants] = useState(false);
  const [suggestedJobSkills, setSuggestedJobSkills] = useState([]);
  const [jobSkillsLoading, setJobSkillsLoading] = useState(false);
  const [currentSkillInput, setCurrentSkillInput] = useState("");

  const loadJobs = async () => {
    try {
      const response = await getMyJobs();
      setJobs(response.jobs || []);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      toast.error("Failed to load your jobs.");
    }
  };

  useEffect(() => {
    loadJobs();
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

  return (
    <>
      <div className={`space-y-8 ${secondaryTextColor}`}>
        <h2 className={`text-3xl font-bold ${primaryTextColor}`}>Employer Dashboard</h2>

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

            {/* Skills Section */}
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
      </div>

      {/* Job Applicants Dialog - OUTSIDE the main div */}
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
                          <p className={`text-2xl font-bold ${
                            parseFloat(candidate.ats_score) >= 70 
                              ? 'text-green-500' 
                              : parseFloat(candidate.ats_score) >= 50 
                              ? 'text-yellow-500' 
                              : 'text-red-500'
                          }`}>
                            {candidate.ats_score || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">ATS Score</p>
                          <Button
                            size="sm"
                            onClick={() => handleAnalyzeCandidateATS(
                              selectedJob.id, 
                              candidate.candidate_id, 
                              candidate.candidate_name
                            )}
                            className={`${buttonSecondary} mt-2`}
                            disabled={loading}
                          >
                            <FileText className="w-3 h-3 mr-1" /> Analyze
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmployerDashboard;