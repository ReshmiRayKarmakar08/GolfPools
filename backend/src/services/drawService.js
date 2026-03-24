const { supabaseAdmin } = require('../config/supabase');
const emailService = require('./emailService');

/**
 * Generate 5 unique winning numbers between 1-45
 */
const generateWinningNumbers = (type = 'random') => {
  if (type === 'random') {
    const numbers = new Set();
    while (numbers.size < 5) {
      numbers.add(Math.floor(Math.random() * 45) + 1);
    }
    return Array.from(numbers).sort((a, b) => a - b);
  }

  // Algorithm-based: weighted towards common golf scores
  // Stableford scores cluster around 20-36 typically
  const weights = Array.from({ length: 45 }, (_, i) => {
    const n = i + 1;
    if (n >= 20 && n <= 36) return 3;
    if (n >= 15 && n <= 40) return 2;
    return 1;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const numbers = new Set();

  while (numbers.size < 5) {
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < 45; i++) {
      rand -= weights[i];
      if (rand <= 0) {
        numbers.add(i + 1);
        break;
      }
    }
  }

  return Array.from(numbers).sort((a, b) => a - b);
};

/**
 * Count matching numbers between user entry and winning numbers
 */
const countMatches = (userNumbers, winningNumbers) => {
  const winSet = new Set(winningNumbers);
  return userNumbers.filter(n => winSet.has(n)).length;
};

/**
 * Calculate prize pool for a given month from payments
 */
const calculateMonthlyPrizePool = async (month, year) => {
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('prize_pool_amount')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .eq('status', 'captured');

  if (!payments || payments.length === 0) return 0;

  return payments.reduce((sum, p) => sum + (p.prize_pool_amount || 0), 0);
};

/**
 * Get jackpot rollover from previous month
 */
const getJackpotRollover = async (month, year) => {
  let m = month;
  let y = year;
  if (m === 0) { m = 12; y--; }

  const { data: prevDraw } = await supabaseAdmin
    .from('monthly_draws')
    .select('rollover_amount, five_match_winner_count, five_match_pool')
    .eq('draw_month', m)
    .eq('draw_year', y)
    .maybeSingle();

  if (!prevDraw) return 0;
  if (prevDraw.five_match_winner_count === 0) {
    return prevDraw.five_match_pool || 0;
  }
  return prevDraw.rollover_amount || 0;
};

/**
 * Execute a draw: match all entries and create winners
 */
const executeDraw = async (drawId, adminId) => {
  // Get draw
  const { data: draw, error: drawError } = await supabaseAdmin
    .from('monthly_draws')
    .select('*')
    .eq('id', drawId)
    .single();

  if (drawError || !draw) throw new Error('Draw not found');
  if (draw.status === 'completed') throw new Error('Draw already executed');

  // Get all entries
  const { data: entries } = await supabaseAdmin
    .from('draw_entries')
    .select('id, user_id, numbers_entered')
    .eq('draw_id', drawId);

  const winningNumbers = draw.winning_numbers;
  const results = { fiveMatch: [], fourMatch: [], threeMatch: [] };

  // Process each entry
  const entryUpdates = entries.map(entry => {
    const matches = countMatches(entry.numbers_entered, winningNumbers);
    const isWinner = matches >= 3;
    let prizeCategory = null;

    if (matches === 5) { results.fiveMatch.push(entry); prizeCategory = '5-match'; }
    else if (matches === 4) { results.fourMatch.push(entry); prizeCategory = '4-match'; }
    else if (matches === 3) { results.threeMatch.push(entry); prizeCategory = '3-match'; }

    return {
      id: entry.id,
      match_count: matches,
      is_winner: isWinner,
      prize_category: prizeCategory
    };
  });

  // Calculate individual prizes
  const fiveMatchPrize = results.fiveMatch.length > 0
    ? draw.five_match_pool / results.fiveMatch.length : 0;
  const fourMatchPrize = results.fourMatch.length > 0
    ? draw.four_match_pool / results.fourMatch.length : 0;
  const threeMatchPrize = results.threeMatch.length > 0
    ? draw.three_match_pool / results.threeMatch.length : 0;

  const rolloverAmount = results.fiveMatch.length === 0 ? draw.five_match_pool : 0;

  // Update all entries
  for (const update of entryUpdates) {
    let prize_amount = null;
    if (update.prize_category === '5-match') prize_amount = fiveMatchPrize;
    else if (update.prize_category === '4-match') prize_amount = fourMatchPrize;
    else if (update.prize_category === '3-match') prize_amount = threeMatchPrize;

    await supabaseAdmin
      .from('draw_entries')
      .update({
        match_count: update.match_count,
        is_winner: update.is_winner,
        prize_category: update.prize_category,
        prize_amount
      })
      .eq('id', update.id);
  }

  // Create winner records
  const allWinners = [
    ...results.fiveMatch.map(e => ({ ...e, category: '5-match', amount: fiveMatchPrize })),
    ...results.fourMatch.map(e => ({ ...e, category: '4-match', amount: fourMatchPrize })),
    ...results.threeMatch.map(e => ({ ...e, category: '3-match', amount: threeMatchPrize }))
  ];

  for (const winner of allWinners) {
    await supabaseAdmin.from('winners').insert({
      draw_id: drawId,
      user_id: winner.user_id,
      draw_entry_id: winner.id,
      prize_category: winner.category,
      prize_amount: winner.amount,
      payment_status: 'pending'
    });
  }

  // Update draw status
  await supabaseAdmin
    .from('monthly_draws')
    .update({
      status: 'completed',
      five_match_winner_count: results.fiveMatch.length,
      four_match_winner_count: results.fourMatch.length,
      three_match_winner_count: results.threeMatch.length,
      rollover_amount: rolloverAmount,
      draw_date: new Date().toISOString()
    })
    .eq('id', drawId);

  // Send notifications to winners
  for (const winner of allWinners) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email, first_name')
      .eq('id', winner.user_id)
      .single();

    if (user) {
      await emailService.sendWinnerNotification(
        user.email,
        user.first_name,
        winner.category,
        winner.amount,
        draw.draw_month,
        draw.draw_year
      ).catch(console.error);

      await supabaseAdmin.from('notifications').insert({
        user_id: winner.user_id,
        type: 'draw_winner',
        title: `🎉 You won the ${draw.draw_month}/${draw.draw_year} draw!`,
        message: `Congratulations! You matched ${winner.category} and won ₹${winner.amount.toFixed(2)}`,
        metadata: { draw_id: drawId, prize_category: winner.category, prize_amount: winner.amount }
      });
    }
  }

  return {
    draw_id: drawId,
    winning_numbers: winningNumbers,
    total_participants: entries.length,
    five_match_winners: results.fiveMatch.length,
    four_match_winners: results.fourMatch.length,
    three_match_winners: results.threeMatch.length,
    five_match_prize: fiveMatchPrize,
    four_match_prize: fourMatchPrize,
    three_match_prize: threeMatchPrize,
    rollover_amount: rolloverAmount
  };
};

/**
 * Simulate a draw without persisting (preview only)
 */
const simulateDraw = async (drawId) => {
  const { data: draw } = await supabaseAdmin
    .from('monthly_draws')
    .select('*')
    .eq('id', drawId)
    .single();

  if (!draw) throw new Error('Draw not found');

  const { data: entries } = await supabaseAdmin
    .from('draw_entries')
    .select('id, user_id, numbers_entered')
    .eq('draw_id', drawId);

  const winningNumbers = draw.winning_numbers;
  let fiveMatch = 0, fourMatch = 0, threeMatch = 0;

  for (const entry of entries || []) {
    const matches = countMatches(entry.numbers_entered, winningNumbers);
    if (matches === 5) fiveMatch++;
    else if (matches === 4) fourMatch++;
    else if (matches === 3) threeMatch++;
  }

  return {
    winning_numbers: winningNumbers,
    total_participants: entries?.length || 0,
    five_match_count: fiveMatch,
    four_match_count: fourMatch,
    three_match_count: threeMatch,
    estimated_five_prize: fiveMatch > 0 ? draw.five_match_pool / fiveMatch : 0,
    estimated_four_prize: fourMatch > 0 ? draw.four_match_pool / fourMatch : 0,
    estimated_three_prize: threeMatch > 0 ? draw.three_match_pool / threeMatch : 0,
    rollover: fiveMatch === 0 ? draw.five_match_pool : 0
  };
};

module.exports = {
  generateWinningNumbers,
  countMatches,
  calculateMonthlyPrizePool,
  getJackpotRollover,
  executeDraw,
  simulateDraw
};
