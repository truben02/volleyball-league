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
  } else {
    loginDiv.style.display = 'none';
    teamSetupDiv.style.display = 'block';
    controlsDiv.style.display = 'block';
    await loadTeams(); // Load existing teams from Supabase
  }
});

// --- Load Teams from Supabase ---
async function loadTeams() {
  const { data, error } = await supabase.from('teams').select('*').order('id', { ascending: true });
  tbody.innerHTML = '';
  if (error) {
    alert('Error loading teams: ' + error.message);
    return;
  }

  teamsData = data.length ? data : Array.from({ length: 24 }, (_, i) => ({ id: i + 1, name: '', pool: 'A', starting_rank: 1 }));

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
      <td><input type="number" min="1" max="6" value="${team.starting_rank}" /></td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Save Teams ---
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
  await loadTeams(); // reload to reflect saved values
});

// --- Advance Week ---
document.getElementById('advance-week-btn').addEventListener('click', async () => {
  const { data: league } = await supabase.from('league_state').select('*').eq('id', 1).single();
  const currentWeek = league.current_week;

  await supabase.from('league_state').update({ locked: true }).eq('id', 1);
  await supabase.from('league_state').update({ current_week: currentWeek + 1, locked: false }).eq('id', 1);

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
  await loadTeams();
});      <td>
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
