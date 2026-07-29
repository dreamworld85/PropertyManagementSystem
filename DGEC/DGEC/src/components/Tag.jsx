import React from 'react';

export default function Tag({ label, color }) {
  return (
    <span className="tag" style={{ color, background: color + "1a" }}>
      {label}
    </span>
  );
}
