import * as React from 'react';

const ScrollArea = React.forwardRef(({ className = "", children, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative h-full w-full overflow-hidden ${className}`}
    {...props}
  >
    <div className="h-full w-full rounded-[inherit] overflow-y-auto">
      {children}
    </div>
    {/* You'd typically add a custom scrollbar component here if not relying on native */}
  </div>
));
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };