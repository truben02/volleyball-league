import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Replace with your Supabase project details
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Courts assignment
const COURTS = {
  A: [1, 2],
  B: [3, 4],
  C: [1, 2],
  D: [3, 4],
};

// ---------------------------
// Generate Matches for Current Week
// ---------------------------
export async function generateWeekMatches() {
  // Get current week
  const { data: league } = await supabase.from('league_state').select('*').eq('id', 1).single();
  const week = league.current_week;

  // Get all active teams
  const { data: teams } = await supabase.from('teams').select('*');

  // Get absences
  const { data: totals } = await supabase.from('weekly_totals').select('*').eq('week', week);
  const absentTeams = totals.filter(t => t.absent).map(t => t.team_id);

  const pools = ['A','B','C','D'];

  for (const pool of pools) {
    let poolTeams = teams.filter(t => t.pool === pool && !absentTeams.includes(t.id));
    const numTeams = poolTeams.length;

    // Determine matchup pattern based on team count
    const matchups = getMatchups(numTeams);

    // Assign slots & courts
    let slot = 1;
    const matchesToInsert = [];

    matchups.forEach(pair => {
      const court = COURTS[pool][(slot-1)%2];
      matchesToInsert.push({
        week,
        pool,
        slot,
        court,
        team1: poolTeams[pair[0]]?.id || null,
        team2: poolTeams[pair[1]]?.id || null,
        score1: 0,
        score2: 0
      });
      // Increment slot every 2 matches (2 matches per slot)
      if (matchesToInsert.length % 2 === 0) slot++;
    });

    // Insert into Supabase
    for (const m of matchesToInsert) {
      await supabase.from('matches').upsert(m);
    }
  }

  console.log(`Week ${week} matches generated!`);
}

// ---------------------------
// Matchup patterns for different team counts
// Each pair is [teamIndex1, teamIndex2] based on current poolTeams array
// ---------------------------
function getMatchups(numTeams) {
  if (numTeams === 6) {
    // 12 matches for 6 teams (each team plays 4)
    return [
      [0,1],[2,3],[0,5],[3,4],[0,1],[2,3],
      [1,5],[2,4],[0,4],[3,5],[1,2],[4,5]
    ];
  } else if (numTeams === 5) {
    return [
      [0,2],[1,3],[0,4],[2,3],[3,4],[1,2],
      [0,3],[1,4],[0,1],[2,4]
    ];
  } else if (numTeams === 4) {
    return [
      [0,1],[2,3],[0,2],[1,3],[0,2],[1,3]
    ];
  } else if (numTeams === 3) {
    return [
      [0,1],[0,2],[1,2]
    ];
  } else if (numTeams === 2) {
    return [[0,1]];
  } else {
    return [];
  }
}
