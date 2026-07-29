import React from 'react';

export default function Bar({ value, color }) {
  return (
    <div className="bar">
      <i style={{ width: value + "%", background: color || "var(--accent)" }} />
    </div>
  );
}
