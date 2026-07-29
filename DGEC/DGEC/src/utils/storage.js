export const KEY = "dgec_db_v1";

export async function loadDB() {
  try {
    const r = await fetch('/api/db');
    if (r.ok) {
      const db = await r.json();
      try {
        localStorage.setItem(KEY, JSON.stringify(db));
      } catch (e) {}
      return db;
    }
  } catch (e) {
    console.error("Failed to load DB from API, using localStorage:", e);
  }
  
  try {
    const val = localStorage.getItem(KEY);
    if (val) return JSON.parse(val);
  } catch (e) {}
  
  return null;
}

export async function saveDB(db) {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db)
    });
  } catch (e) {
    console.error("Failed to save DB to server, using localStorage:", e);
  }

  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {}
}
