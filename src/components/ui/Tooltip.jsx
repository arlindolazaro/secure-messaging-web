import React from "react";

const Tooltip = ({ children, text }) => {
  return (
    <div className="relative inline-block">
      <div className="group">{children}</div>
      <div className="opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
