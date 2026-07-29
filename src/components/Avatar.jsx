import React from 'react';

export default function Avatar({ name, size = 26 }) {
  const ini = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="av" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {ini}
    </span>
  );
}
