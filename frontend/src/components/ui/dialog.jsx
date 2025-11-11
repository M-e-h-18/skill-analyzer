import * as React from 'react';

const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
};

const DialogTrigger = ({ children, onClick }) => (
  <button type="button" onClick={onClick}>{children}</button>
);

const DialogContent = ({ children, className = "" }) => (
  <div className={`relative bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-2xl w-full z-50 ${className}`}>
    {children}
  </div>
);

const DialogHeader = ({ children, className = "" }) => (
  <div className={`flex flex-col space-y-1.5 mb-4 ${className}`}>
    {children}
  </div>
);

const DialogTitle = ({ children, className = "" }) => (
  <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
    {children}
  </h2>
);

const DialogDescription = ({ children, className = "" }) => (
  <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>
    {children}
  </p>
);

const DialogFooter = ({ children, className = "" }) => (
  <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 ${className}`}>
    {children}
  </div>
);

const DialogClose = ({ children, onClick }) => (
  <button 
    type="button" 
    onClick={onClick} 
    className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
  >
    {children || (
      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    )}
  </button>
);

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
};