import React, { useEffect, useState } from "react";
import { postEmployerJob, getMyJobs, deleteJob, getJobApplicants, analyzeCandidateATS, suggestJobSkills,postEmployerJobOutlook } from "../api/api";
import { CardHeader, CardTitle, CardDescription, Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Plus, Trash, FileText, Users, Lightbulb, XCircle, ChevronDown, CheckCircle } from "lucide-react";
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area"; // Assuming you have shadcn-ui scroll-area

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
  const [jobOutlook, setJobOutlook] = useState(null);
  const [jobOutlookLoading, setJobOutlookLoading] = useState(false);
  const [showJobOutlookDialog, setShowJobOutlookDialog] = useState(false);


  const loadJobs = async () => {
    try {
      const response = await getMyJobs();
      setJobs(response.data.jobs || []);
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
      setSuggestedJobSkills([]); // Clear suggestions after posting
      loadJobs();
    } catch (err) {
      toast.error("Failed to post job.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job? This action cannot be undone.")) return;
    try {
      await deleteJob(jobId);
      toast.success("Job deleted successfully!");
      loadJobs();
      if (selectedJob?._id === jobId) {
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
      setCandidates(response.data.applicants || []);
    } catch (err) {
      console.error("Error fetching applicants:", err);
      toast.error("Failed to fetch applicants.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeCandidateATS = async (jobId, candidateId, candidateName) => {
    setLoading(true);
    try {
      const response = await analyzeCandidateATS(jobId, candidateId);
      toast.success(`ATS score for ${candidateName} calculated: ${response.data.score}%`);
      // Update the candidate's ATS score in the local state
      setCandidates(prev => prev.map(c =>
        c.candidate_id === candidateId ? { ...c, ats_score: `${response.data.score}%` } : c
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
      toast.error("Please provide a job title or description to suggest skills.");
      return;
    }
    setJobSkillsLoading(true);
    try {
      const response = await suggestJobSkills({
        title: newJob.title,
        description: newJob.description,
      });
      const { required_skills, complementary_skills } = response.data;
      const allSuggested = [...new Set([...required_skills, ...complementary_skills])]; // Remove duplicates
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

  const handleJobOutlookForTitle = async (jobTitle) => {
    if (!jobTitle) {
      toast.error("Please enter a job title to view outlook.");
      return;
    }
    setJobOutlookLoading(true);
    setShowJobOutlookDialog(true);
    try {
      const response = await postEmployerJobOutlook({ job_title: jobTitle });
      setJobOutlook(response.data);
    } catch (err) {
      toast.error("Failed to fetch job outlook.");
      console.error(err);
      setJobOutlook(null);
    } finally {
      setJobOutlookLoading(false);
    }
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

          {/* Skill Suggestions and Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                className={`${inputBg} flex-grow`}
                placeholder="Add a required skill (e.g., Python)"
                value={currentSkillInput}
                onChange={(e) => setCurrentSkillInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && currentSkillInput) {
                    handleAddSkillToJob(currentSkillInput);
                  }
                }}
              />
              <Button onClick={() => handleAddSkillToJob(currentSkillInput)} className={buttonSecondary} disabled={!currentSkillInput}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
              <Button onClick={handleSuggestJobSkills} className={buttonSecondary} disabled={jobSkillsLoading}>
                <Lightbulb className="w-4 h-4 mr-1" /> {jobSkillsLoading ? 'Suggesting...' : 'Suggest Skills'}
              </Button>
            </div>
            {suggestedJobSkills.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium">Suggested from AI:</p>
                <div className="flex flex-wrap gap-2 mt-1">
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
                <p className="text-sm font-medium">Required Skills:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {newJob.skills_required.map((skill, index) => (
                    <Badge key={index} className={`${badgeColors}`}>
                      {skill}
                      <XCircle className="w-3 h-3 ml-1 cursor-pointer hover:text-red-400" onClick={() => handleRemoveSkillFromJob(skill)} />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleJobPost} className={`${buttonPrimary} w-full`} disabled={loading}>
            {loading ? 'Posting...' : <><Plus className="w-4 h-4 mr-2" /> Post Job</>}
          </Button>
          <Button onClick={() => handleJobOutlookForTitle(newJob.title)} className={`${buttonSecondary} w-full`} disabled={jobOutlookLoading}>
            {jobOutlookLoading ? 'Fetching Outlook...' : <><Lightbulb className="w-4 h-4 mr-2" /> View Job Title Outlook</>}
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
            <p className="text-center italic">You haven't posted any jobs yet.</p>
          ) : (
            <ScrollArea className="h-96 w-full pr-4">
              <div className="space-y-4">
                {jobs.map((job) => (
                  <Card key={job.id} className={`${cardBg} ${cardBorder}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <h3 className={`text-lg font-semibold ${primaryTextColor}`}>{job.title}</h3>
                        <p className={`text-sm ${secondaryTextColor}`}>{job.location} - {job.salary || 'N/A'}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {job.skills_required.map((skill, idx) => (
                            <Badge key={idx} className={badgeColors}>{skill}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFetchApplicants(job)}
                          className={`${buttonSecondary} border-none`}
                        >
                          <Users className="w-4 h-4 mr-1" /> Applicants ({job.applicants?.length || 0})
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Job Applicants Dialog */}
      <Dialog open={showJobApplicants} onOpenChange={setShowJobApplicants}>
        <DialogContent className={`${cardBg} ${cardBorder} max-w-2xl`}>
          <DialogHeader>
            <DialogTitle className={primaryTextColor}>Applicants for "{selectedJob?.title}"</DialogTitle>
            <DialogDescription className={secondaryTextColor}>
              Review candidates who have applied to this job.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <p className="text-center">Loading applicants...</p>
          ) : candidates.length === 0 ? (
            <p className="text-center italic">No applicants yet.</p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                {candidates.map((candidate) => (
                  <Card key={candidate.candidate_id} className={`${cardBg} ${cardBorder}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className={`text-lg font-semibold ${primaryTextColor}`}>{candidate.candidate_name}</h4>
                          <p className={`text-sm ${secondaryTextColor}`}>{candidate.candidate_email}</p>
                          <p className={`text-sm ${secondaryTextColor}`}>Applied: {new Date(candidate.applied_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold ${parseFloat(candidate.ats_score) >= 70 ? 'text-green-500' : parseFloat(candidate.ats_score) >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                            ATS: {candidate.ats_score || 'N/A'}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handleAnalyzeCandidateATS(selectedJob.id, candidate.candidate_id, candidate.candidate_name)}
                            className={buttonSecondary}
                            disabled={loading}
                          >
                            <FileText className="w-4 h-4 mr-1" /> Re-analyze ATS
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm font-medium">Matched Skills:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {candidate.matched_skills.length > 0 ? (
                            candidate.matched_skills.map((skill, idx) => (
                              <Badge key={idx} className={badgeSuccess}>{skill}</Badge>
                            ))
                          ) : (
                            <p className="italic text-sm">No matched skills.</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium">Missing Skills:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {candidate.missing_skills.length > 0 ? (
                            candidate.missing_skills.map((skill, idx) => (
                              <Badge key={idx} className={badgeDanger}>{skill}</Badge>
                            ))
                          ) : (
                            <p className="italic text-sm">No critical missing skills.</p>
                          )}
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

      {/* Job Outlook Dialog */}
      <Dialog open={showJobOutlookDialog} onOpenChange={setShowJobOutlookDialog}>
        <DialogContent className={`${cardBg} ${cardBorder} max-w-2xl`}>
          <DialogHeader>
            <DialogTitle className={primaryTextColor}>Job Outlook for "{newJob.title}"</DialogTitle>
            <DialogDescription className={secondaryTextColor}>
              Insights into the current and historical demand and salary trends.
            </DialogDescription>
          </DialogHeader>
          {jobOutlookLoading ? (
            <p className="text-center">Fetching job outlook...</p>
          ) : jobOutlook ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {Object.values(jobOutlook.countries || {}).map((countryData) => (
                  <div key={countryData.country_code} className="p-4 rounded-lg border">
                    <h3 className={`text-xl font-semibold ${primaryTextColor}`}>{countryData.country} ({countryData.country_code.toUpperCase()})</h3>
                    <p className="mt-2">Demand Score: <Badge className={badgeColors}>{countryData.demand}%</Badge></p>
                    <p>Average Salary: <Badge className={badgeColors}>{countryData.salary.toLocaleString()} {countryData.currency}</Badge></p>
                    <p>Total Jobs Found (Current): <Badge className={badgeColors}>{countryData.total_jobs_found}</Badge></p>
                    <p>Remote Friendly: {countryData.is_remote_friendly ? <CheckCircle className="w-5 h-5 inline text-green-500" /> : <XCircle className="w-5 h-5 inline text-red-500" />}</p>

                    <h4 className={`font-semibold mt-3 ${primaryTextColor}`}>Trends:</h4>
                    <p>Job Growth (6m): <Badge className={countryData.trends.job_growth_6m > 0 ? badgeSuccess : badgeDanger}>{countryData.trends.job_growth_6m}%</Badge></p>
                    <p>Job Growth (12m): <Badge className={countryData.trends.job_growth_12m > 0 ? badgeSuccess : badgeDanger}>{countryData.trends.job_growth_12m}%</Badge></p>
                    <p>Salary Growth (6m): <Badge className={countryData.trends.salary_growth_6m > 0 ? badgeSuccess : badgeDanger}>{countryData.trends.salary_growth_6m}%</Badge></p>
                    <p>Salary Growth (12m): <Badge className={countryData.trends.salary_growth_12m > 0 ? badgeSuccess : badgeDanger}>{countryData.trends.salary_growth_12m}%</Badge></p>
                    <p>Overall Trend: <Badge className={badgeColors}>{countryData.trends.trend_direction}</Badge></p>

                    <h4 className={`font-semibold mt-3 ${primaryTextColor}`}>Historical Data:</h4>
                    <p>6 Months Ago: {countryData.historical['6_months_ago'].total_jobs} jobs, {countryData.historical['6_months_ago'].avg_salary.toLocaleString()} {countryData.currency}</p>
                    <p>12 Months Ago: {countryData.historical['12_months_ago'].total_jobs} jobs, {countryData.historical['12_months_ago'].avg_salary.toLocaleString()} {countryData.currency}</p>
                  </div>
                ))}
                {jobOutlook.comparison && (
                  <div className="p-4 rounded-lg border mt-4">
                    <h3 className={`text-xl font-semibold ${primaryTextColor}`}>Cross-Country Comparison:</h3>
                    {jobOutlook.comparison.highest_demand && <p>Highest Demand: <Badge className={badgeColors}>{jobOutlook.comparison.highest_demand.country} ({jobOutlook.comparison.highest_demand.value}%)</Badge></p>}
                    {jobOutlook.comparison.highest_salary && <p>Highest Salary: <Badge className={badgeColors}>{jobOutlook.comparison.highest_salary.country} ({jobOutlook.comparison.highest_salary.value.toLocaleString()} {jobOutlook.comparison.highest_salary.currency})</Badge></p>}
                    {jobOutlook.comparison.best_growth && <p>Best Growth (12m): <Badge className={badgeColors}>{jobOutlook.comparison.best_growth.country} ({jobOutlook.comparison.best_growth.value}%)</Badge></p>}
                    {jobOutlook.comparison.most_remote_friendly && <p>Most Remote Friendly: <Badge className={badgeColors}>{jobOutlook.comparison.most_remote_friendly.country} ({jobOutlook.comparison.most_remote_friendly.value} remote jobs)</Badge></p>}
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-center italic">No job outlook data available. Try a different job title.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployerDashboard;