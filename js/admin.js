import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { generateWeekMatches } from './scheduler.js';

const SUPABASE_URL = 'https://cunmfxvtixrezjqrbwbd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZHSbTeem6RDTMcWV82YmjA__Nx_k18Z';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginDiv = document.getElementById('login');
const teamSetupDiv = document.getElementById('team-setup');
const controlsDiv = document.getElementById('controls');
const tbody = document.querySelector('#team-table tbody');
const loginMsg = document.getElementById('login-msg');

let teamsData = [];

// --- Admin Login ---
document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    loginMsg.textContent = error.message;
    return;
  }

  loginDiv.style.display = 'none';
  teamSetupDiv.style.display = 'block';
  controlsDiv.style.display = 'block';
  await loadTeams(); // load existing teams from Supabase
});

// --- Load Teams from Supabase ---
async function loadTeams() {
  const { data, error } = await supabase.from('teams').select('*').order('rank', { ascending: true });

  tbody.innerHTML = '';

  if (error) {
    alert('Error loading teams: ' + error.message);
    return;
  }

  // If table is empty, create 24 empty placeholders
  teamsData = data.length ? data : Array.from({ length: 24 }, () => ({ name: '', pool: 'A', rank: 1 }));

  teamsData.forEach(team => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" value="${team.name}" /></td>
      <td>
        <select>
          <option value="A" ${team.pool === 'A' ? 'selected' : ''}>A</option>
          <option value="B" ${team.pool === 'B' ? 'selected' : ''}>B</option>
          <option value="C" ${team.pool === 'C' ? 'selected' : ''}>C</option>
          <option value="D" ${team.pool === 'D' ? 'selected' : ''}>D</option>
        </select>
      </td>
      <td><input type="number" min="1" max="6" value="${team.rank}" /></td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Save Teams with Validation ---
document.getElementById('save-teams-btn').addEventListener('click', async () => {
  const rows = tbody.querySelectorAll('tr');

  for (let i = 0; i < rows.length; i++) {
    const inputs = rows[i].querySelectorAll('input, select');
    const name = inputs[0].value.trim();
    const pool = inputs[1].value;
    const starting_rank = parseInt(inputs[2].value);

    if (!name) {
      alert(`Team name missing in row ${i + 1}`);
      return;
    }
    if (!['A','B','C','D'].includes(pool)) {
      alert(`Invalid pool in row ${i + 1}`);
      return;
    }
    if (isNaN(rank) || rank < 1 || rank > 6) {
      alert(`Invalid starting rank in row ${i + 1}`);
      return;
    }

    // Upsert without specifying id — Supabase will auto-generate UUID
    const { error } = await supabase.from('teams').upsert({
      name,
      pool,
      rank
    });
    if (error) {
      alert(`Error saving row ${i + 1}: ${error.message}`);
      return;
    }
  }

  alert('Teams saved successfully!');
  await loadTeams(); // reload table from Supabase to reflect saved values
});
// Check existing session on page load
window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    // Already logged in
    loginDiv.style.display = 'none';
    teamSetupDiv.style.display = 'block';
    controlsDiv.style.display = 'block';
    await loadTeams();
  } else {
    // Not logged in
    loginDiv.style.display = 'block';
    teamSetupDiv.style.display = 'none';
    controlsDiv.style.display = 'none';
  }
});
