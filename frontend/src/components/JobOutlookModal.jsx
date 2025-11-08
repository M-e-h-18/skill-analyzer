import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import * as api from '../api/api';

const JobOutlookModal = ({ jobs, isOpen, onClose, isDark }) => {
  const [outlooks, setOutlooks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && jobs.length > 0) {
      setLoading(true);
      Promise.all(
        jobs.map(job =>
          api.getJobOutlook(job.title || job.job)
            .then(res => ({ ...res.data, title: job.title || job.job }))
            .catch(() => null)
        )
      ).then(results => {
        setOutlooks(results.filter(Boolean));
        setLoading(false);
      });
    }
  }, [isOpen, jobs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={`rounded-xl p-8 max-w-xl w-full shadow-2xl relative ${isDark ? 'bg-slate-900 text-cyan-200' : 'bg-white text-slate-800'} overflow-y-auto max-h-[80vh]`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-red-400"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold mb-4">Job Outlook (Top 5)</h2>
        {loading ? (
          <div className="py-8 text-center">Loading...</div>
        ) : (
          <div className="space-y-4">
            {outlooks.map((outlook, idx) => (
              <div key={idx} className={`p-4 rounded-lg border ${isDark ? 'border-cyan-400/20 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                <h3 className="font-semibold mb-2">{outlook.title}</h3>
                <p>Estimated Demand (views): <span className="font-bold">{outlook.demand}</span></p>
                <p>Expected Median Salary: <span className="font-bold">₹{outlook.salary}</span></p>
                <p>Remote Friendly: <span className="font-bold">{outlook.remote ? "Yes" : "No"}</span></p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobOutlookModal;