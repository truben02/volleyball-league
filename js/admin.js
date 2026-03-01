import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { generateWeekMatches } from './scheduler.js';  

// Replace with your Supabase project details
const SUPABASE_URL = 'https://cunmfxvtixrezjqrbwbd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZHSbTeem6RDTMcWV82YmjA__Nx_k18Z';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elements
const loginSection = document.getElementById('login-section');
const adminControls = document.getElementById('admin-controls');
const loginBtn = document.getElementById('login-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const advanceWeekBtn = document.getElementById('advance-week-btn');
const resetLeagueBtn = document.getElementById('reset-league-btn');
const teamsContainer = document.getElementById('teams-container');

// ---------------------------
// Admin Login
// ---------------------------
loginBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    loginError.textContent = error.message;
    return;
  }

  loginSection.classList.add('hidden');
  adminControls.classList.remove('hidden');

  loadTeams();
});

// ---------------------------
// Load Teams & Absence Toggles
// ---------------------------
async function loadTeams() {
  const { data: teams } = await supabase.from('teams').select('*').order('pool').order('rank');

  teamsContainer.innerHTML = '';

  teams.forEach(team => {
    const div = document.createElement('div');
    div.className = "flex items-center justify-between p-2 border rounded";
    div.innerHTML = `
      <span>Pool ${team.pool} - ${team.name} (Rank ${team.rank})</span>
      <label class="flex items-center space-x-2">
        <span>Absent</span>
        <input type="checkbox" data-id="${team.id}" class="absent-checkbox" />
      </label>
    `;
    teamsContainer.appendChild(div);
  });

  // Set current absence status
  const { data: weekState } = await supabase.from('league_state').select('*').eq('id', 1).single();
  const week = weekState.current_week;

  const { data: totals } = await supabase.from('weekly_totals').select('*').eq('week', week);
  totals.forEach(t => {
    const checkbox = document.querySelector(`.absent-checkbox[data-id='${t.team_id}']`);
    if (checkbox) checkbox.checked = t.absent;
  });

  // Listen for absence changes
  document.querySelectorAll('.absent-checkbox').forEach(cb => {
    cb.addEventListener('change', async e => {
      const team_id = e.target.dataset.id;
      const absent = e.target.checked;

      // Get current week
      const { data: league } = await supabase.from('league_state').select('*').eq('id', 1).single();
      const week = league.current_week;

      // Upsert weekly total
      await supabase.from('weekly_totals').upsert({
        team_id,
        week,
        total_points: absent ? 0 : 0,
        absent
      });
    });
  });
}

// ---------------------------
// Advance Week
// ---------------------------
advanceWeekBtn.addEventListener('click', async () => {
  const { data: league } = await supabase.from('league_state').select('*').eq('id', 1).single();
  const currentWeek = league.current_week;

  // Lock current week
  await supabase.from('league_state').update({ locked: true }).eq('id', 1);

  // Promotion / Relegation Logic (simplified)
  // 1. Get all teams
  const { data: teams } = await supabase.from('teams').select('*');

  // 2. Get totals for current week
  const { data: totals } = await supabase.from('weekly_totals').select('*').eq('week', currentWeek);

  // 3. Merge totals with teams
  const merged = teams.map(t => {
    const totalObj = totals.find(w => w.team_id === t.id);
    return { ...t, total: totalObj?.total_points || 0, absent: totalObj?.absent || false };
  });

  // 4. Sort by pool and total descending
  const pools = ['A','B','C','D'];
  const newTeams = [];

  pools.forEach(pool => {
    let poolTeams = merged.filter(t => t.pool === pool && !t.absent);
    poolTeams.sort((a,b) => b.total - a.total || a.previous_rank - b.previous_rank);

    poolTeams.forEach((team, idx) => {
      team.rank = idx + 1;
      newTeams.push(team);
    });
  });

  // 5. Apply promotion/relegation (simplified, no movement for A top/bottom D)
  newTeams.forEach(team => {
    if (team.pool === 'B' && team.rank <= 2) team.pool = 'A';
    if (team.pool === 'B' && team.rank >= 5) team.pool = 'C';
    if (team.pool === 'C' && team.rank <= 2) team.pool = 'B';
    if (team.pool === 'C' && team.rank >= 5) team.pool = 'D';
    if (team.pool === 'D' && team.rank <= 2) team.pool = 'C';
    // Pool A top stays, Pool D bottom stays
  });

  // 6. Update previous_rank
  await supabase.from('teams').upsert(newTeams.map(t => ({ id: t.id, pool: t.pool, rank: t.rank, previous_rank: t.rank })));

  // 7. Advance week
  await supabase.from('league_state').update({ current_week: currentWeek + 1, locked: false }).eq('id', 1);

  // 8. Generate new matches for the next week
  await generateWeekMatches();
  
  alert(`Week ${currentWeek} locked. Advanced to Week ${currentWeek + 1}`);
  loadTeams();
});

// ---------------------------
// Reset League
// ---------------------------
resetLeagueBtn.addEventListener('click', async () => {
  if (!confirm('Are you sure you want to reset the league?')) return;

  // Reset league_state
  await supabase.from('league_state').update({ current_week: 1, locked: false }).eq('id', 1);

  // Clear teams, matches, weekly_totals
  await supabase.from('weekly_totals').delete();
  await supabase.from('matches').delete();
  // Optionally reset ranks/pools if needed

  alert('League has been reset.');
  loadTeams();
});
