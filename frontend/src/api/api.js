import axios from 'axios';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Request interceptor for adding JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      toast.error('Session expired. Please log in again.');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const signup = (userData) => api.post('/auth/signup', userData);
export const login = (credentials) => api.post('/auth/login', credentials);
export const getCurrentUser = () => api.get('/auth/me');
export const updateProfile = (profileData) => api.put('/auth/profile', profileData).then(res => res.data);
export const logout = () => {
  localStorage.removeItem('access_token');
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Notifications
export const getNotifications = () => api.get('/notifications').then(res => res.data);
export const markNotificationRead = (notifId) => api.post(`/notifications/mark-read/${notifId}`).then(res => res.data);

// Skills
export const listSkills = () => api.get('/skills').then(res => res.data);
export const addSkill = (skillData) => api.post('/skills/add', skillData).then(res => res.data);
export const removeSkill = (skillData) => api.post('/skills/remove', skillData).then(res => res.data);
export const getSkillSuggestions = (query) => api.get(`/skills/suggestions?query=${query}`).then(res => res.data);
export const evaluateSkills = (skillsData) => api.post('/analysis/evaluate', skillsData).then(res => res.data);

// FIXED: Changed from /job_outlook to /jobs/outlook
export const postEmployerJobOutlook = (jobTitle) => 
  api.post('/jobs/outlook', { job_title: jobTitle }).then(res => res.data);

export const getAnalysisHistory = () => api.get('/history').then(res => res.data);
export const suggestJobSkills = (jobData) => api.post('/employer/job_skills/suggest', jobData).then(res => res.data);

// Resume
export const uploadResume = (formData) =>
  api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data);

// ATS Analysis
export const analyzeATSScore = (resumeText, jobDescription) =>
  api.post('/ats/analyze', { resume_text: resumeText, job_description: jobDescription }).then(res => res.data);

// Jobs (Internal & External)
export const searchJobs = (searchParams) => api.post('/jobs/search', searchParams).then(res => res.data);

// Apply to internal job
export const applyToJob = (jobId) => api.post(`/jobs/apply/${jobId}`).then(res => res.data);

// Get candidate's applications
export const getMyApplications = () => api.get('/jobs/my-applications').then(res => res.data);

// Legacy endpoints for backward compatibility
export const applyForJob = (jobId) => api.post(`/jobs/apply/${jobId}`).then(res => res.data);
export const getAppliedJobs = () => api.get('/jobs/my-applications').then(res => res.data);

// Employer-specific actions
export const postEmployerJob = (jobData) => api.post('/employer/post_job', jobData).then(res => res.data);
export const getMyJobs = () => api.get('/employer/my-jobs').then(res => res.data);
export const getJobApplicants = (jobId) => api.get(`/employer/job-applicants/${jobId}`).then(res => res.data);
export const deleteJob = (jobId) => api.delete(`/employer/delete-job/${jobId}`).then(res => res.data);
export const analyzeCandidateATS = (jobId, candidateId) =>
  api.post(`/employer/analyze-candidate/${jobId}`, { candidate_id: candidateId }).then(res => res.data);

// Skills mapping
export const mapSkill = (skillData) => api.post('/skills/map', skillData).then(res => res.data);

// Socket.io setup
let socket = null;

export const connectSocket = (userId) => {
  if (!socket || !socket.connected) {
    socket = io(API_BASE_URL.replace('/api', ''), {
      transports: ['websocket', 'polling'],
      auth: {
        token: localStorage.getItem('access_token'),
      },
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      if (userId) socket.emit('join_room', { user_id: userId });
    });
    socket.on('disconnect', () => console.log('Socket disconnected'));

    socket.on('new_notification', (notification) => {
      console.log('Notification received:', notification);
      toast.info(notification.message, {
        onClick: () => {
          if (notification.link) window.location.href = notification.link;
          markNotificationRead(notification.id);
        },
        autoClose: 10000,
        closeButton: true,
      });
    });

    socket.on('status', (data) => {
      console.log('Socket status:', data.msg);
    });
  }
  return socket;
};

export const getSocket = () => socket;