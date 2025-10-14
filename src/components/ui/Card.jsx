import React from "react";

export const Card = ({ children, className = "", ...props }) => {
  return (
    <div
      className={`
        bg-gradient-to-b from-white to-gray-50 
        rounded-2xl shadow-[0_6px_20px_rgba(0,0,0,0.06)] 
        border border-gray-100 
        backdrop-blur-sm transition-all duration-300 
        hover:shadow-[0_10px_25px_rgba(0,0,0,0.08)]
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = "" }) => {
  return (
    <div className={`px-8 py-6 border-b border-gray-100 ${className}`}>
      {children}
    </div>
  );
};

export const CardContent = ({ children, className = "" }) => {
  return <div className={`px-8 py-5 ${className}`}>{children}</div>;
};

export const CardFooter = ({ children, className = "" }) => {
  return (
    <div className={`px-8 py-5 border-t border-gray-100 bg-gray-50/40 ${className}`}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = "" }) => {
  return (
    <h3
      className={`
        text-2xl font-bold text-gray-800 tracking-tight 
        bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent
        ${className}
      `}
    >
      {children}
    </h3>
  );
};
