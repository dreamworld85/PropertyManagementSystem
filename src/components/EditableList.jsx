import React, { useState } from 'react';

export default function EditableList({ title, hint, items, onChange }) {
  const [v, setV] = useState("");
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="h3 disp" style={{ marginBottom: 2 }}>{title}</div>
      <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{hint}</p>
      <div className="chiplist">
        {items.map((it, i) => (
          <span key={i} className="chipx">
            {it}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ border: "none", background: "none", cursor: "pointer" }}>×</button>
          </span>
        ))}
      </div>
      <div className="addrow">
        <input
          className="inp"
          placeholder="Add new…"
          value={v}
          onChange={e => setV(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && v.trim()) {
              onChange([...items, v.trim()]);
              setV("");
            }
          }}
        />
        <button
          className="btn"
          onClick={() => {
            if (v.trim()) {
              onChange([...items, v.trim()]);
              setV("");
            }
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
