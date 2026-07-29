import React from 'react';

export default function Field({ l, children }) {
  return (
    <label className="field">
      <span>{l}</span>
      {children}
    </label>
  );
}
