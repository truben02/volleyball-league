import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { generateWeekMatches } from './scheduler.js';

const SUPABASE_URL = 'https://cunmfxvtixrezjqrbwbd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZHSbTeem6RDTMcWV82YmjA__Nx_k18Z';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const loginDiv = document.getElementById('login');
const teamSetupDiv = document.getElementById('team-setup');
const controlsDiv = document.getElementById('controls');
const tbody = document.querySelector('#team-table tbody');
const loginMsg = document.getElementById('login-msg');

// --- Admin Login ---
document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    loginMsg.textContent = error.message;
  } else {
    loginDiv.style.display = 'none';
    teamSetupDiv.style.display = 'block';
    controlsDiv.style.display = 'block';
    setupTeamTable();
  }
});

// --- Populate Team Table ---
function setupTeamTable() {
  tbody.innerHTML = '';
  for (let i = 0; i < 24; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" placeholder="Team ${i + 1}" /></td>
      <td>
        <select>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </td>
      <td><input type="number" min="1" max="6" value="1" /></td>
    `;
    tbody.appendChild(tr);
  }
}

// --- Save Teams to Supabase ---
document.getElementById('save-teams-btn').addEventListener('click', async () => {
  const rows = tbody.querySelectorAll('tr');
  for (let i = 0; i < rows.length; i++) {
    const inputs = rows[i].querySelectorAll('input, select');
    await supabase.from('teams').upsert({
      id: i + 1,
      name: inputs[0].value,
      pool: inputs[1].value,
      starting_rank: parseInt(inputs[2].value)
    });
  }
  alert('Teams saved!');
});

// --- Advance Week ---
document.getElementById('advance-week-btn').addEventListener('click', async () => {
  const { data: league } = await supabase.from('league_state').select('*').eq('id', 1).single();
  const currentWeek = league.current_week;

  // Lock current week
  await supabase.from('league_state').update({ locked: true }).eq('id', 1);

  // TODO: promotion/relegation logic here

  // Advance week
  await supabase.from('league_state').update({ current_week: currentWeek + 1, locked: false }).eq('id', 1);

  // Generate matches for new week
  await generateWeekMatches();

  alert(`Week ${currentWeek} locked. Advanced to Week ${currentWeek + 1}`);
});

// --- Reset League ---
document.getElementById('reset-league-btn').addEventListener('click', async () => {
  if (!confirm('Are you sure you want to reset the league?')) return;
  await supabase.from('teams').delete();
  await supabase.from('matches').delete();
  await supabase.from('weekly_totals').delete();
  await supabase.from('league_state').update({ current_week: 1, locked: false }).eq('id', 1);
  alert('League reset!');
  setupTeamTable();
});
