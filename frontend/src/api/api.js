import axios from 'axios';
import { toast } from 'react-toastify';
import io from 'socket.io-client'; // Import Socket.IO client

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Request interceptor for adding the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      // Optionally redirect to login or show a message
      toast.error('Session expired. Please log in again.');
      window.location.href = '/'; // Redirect to home/login
    }
    return Promise.reject(error);
  }
);

// Auth
export const signup = (userData) => api.post('/auth/signup', userData);
export const login = (credentials) => api.post('/auth/login', credentials);
export const getCurrentUser = () => api.get('/auth/me');
export const updateProfile = (profileData) => api.put('/auth/profile', profileData);
export const logout = () => {
  localStorage.removeItem('access_token');
  // Disconnect socket if connected
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Notifications
export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (notifId) => api.post(`/notifications/mark-read/${notifId}`);

// Skills
export const listSkills = () => api.get('/skills');
export const addSkill = (skillData) => api.post('/skills/add', skillData);
export const removeSkill = (skillData) => api.post('/skills/remove', skillData);
export const getSkillSuggestions = (query) => api.get(`/skills/suggestions?query=${query}`);
export const evaluateSkills = (skillsData) => api.post('/analysis/evaluate', skillsData);
export const postEmployerJobOutlook = (jobTitle) => api.post('/job_outlook', { job_title: jobTitle });
export const getAnalysisHistory = () => api.get('/history');
export const suggestJobSkills = (jobData) => api.post('/employer/job_skills/suggest', jobData);


// Resume
export const uploadResume = (formData) => api.post('/resume/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// ATS
export const analyzeATSScore = (resumeText, jobDescription) => api.post('/ats/analyze', { resume_text: resumeText, job_description: jobDescription });


// Jobs (Internal & External)
export const searchJobs = (searchParams) => api.post('/jobs/search', searchParams);
export const applyForJob = (jobId) => api.post(`/jobs/apply/${jobId}`);
export const getAppliedJobs = () => api.get('/jobs/applied-jobs');


// Employer Specific
export const postEmployerJob = (jobData) => api.post('/employer/post_job', jobData);
export const getMyJobs = () => api.get('/employer/my-jobs');
export const getJobApplicants = (jobId) => api.get(`/employer/job-applicants/${jobId}`);
export const deleteJob = (jobId) => api.delete(`/employer/delete-job/${jobId}`);
export const analyzeCandidateATS = (jobId, candidateId) => api.post(`/employer/analyze-candidate/${jobId}`, { candidate_id: candidateId });


// -----------------------------------------------------------------------------
// Socket.IO Client Setup
// -----------------------------------------------------------------------------
let socket = null;

export const connectSocket = (userId) => {
  if (!socket || !socket.connected) {
    socket = io(API_BASE_URL.replace('/api', ''), {
      transports: ['websocket', 'polling'], // Ensure compatibility
      auth: {
        token: localStorage.getItem('access_token') // Send JWT with connection if needed
      }
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      if (userId) {
        socket.emit('join_room', { user_id: userId });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('new_notification', (notification) => {
      console.log('Received new notification:', notification);
      toast.info(notification.message, {
        onClick: () => {
          if (notification.link) {
            window.location.href = notification.link;
          }
          markNotificationRead(notification.id); // Mark as read on click
        },
        autoClose: 10000, // Keep open for 10 seconds
        closeButton: true
      });
      // You might also want to refetch notifications in the UI here
    });

    socket.on('status', (data) => {
      console.log('Socket status:', data.msg);
    });
  }
  return socket;
};

export const getSocket = () => socket;
// Add to api.js
export const mapSkill = (skillData) => api.post('/skills/map', skillData);