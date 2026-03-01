import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadCurrentWeek() {
  // Get current active week
  let { data: league } = await supabase.from('league_state').select('*').eq('id', 1).single();
  const week = league.current_week;

  // Get matches for current week
  let { data: matches } = await supabase.from('matches').select('*').eq('week', week);

  // Get team names
  let { data: teams } = await supabase.from('teams').select('*');

  // Group matches by pool
  const pools = {};
  matches.forEach(m => {
    if (!pools[m.pool]) pools[m.pool] = [];
    pools[m.pool].push(m);
  });

  const container = document.getElementById('schedule-container');
  container.innerHTML = '';

  ['A','B','C','D'].forEach(pool => {
    if (!pools[pool]) return;
    const div = document.createElement('div');
    div.innerHTML = `<h2 class="text-2xl font-bold">Pool ${pool}</h2>`;
    pools[pool].forEach(m => {
      const team1 = teams.find(t => t.id === m.team1)?.name || 'TBD';
      const team2 = teams.find(t => t.id === m.team2)?.name || 'TBD';
      div.innerHTML += `<p>${team1} vs ${team2} | Court ${m.court} | Slot ${m.slot} | Score: ${m.score1}-${m.score2}</p>`;
    });
    container.appendChild(div);
  });
}

loadCurrentWeek();
