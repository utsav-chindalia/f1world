import { supabase } from '../lib/supabase/client'

export const LeaderboardService = {
  /**
   * Get the leaderboard
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to return
   * @param {number} options.page - Page number for pagination
   * @returns {Promise<Array>} Array of lap records with player info
   */
  async getLeaderboard({ limit = 10, page = 0 } = {}) {
    try {
      const { data, error } = await supabase
        .from('lap_records')
        .select(`
          *,
          player:players(*),
          racing_line:racing_lines(*)
        `)
        .eq('is_valid', true)
        .order('lap_time', { ascending: true })
        .range(page * limit, (page + 1) * limit - 1)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      throw error
    }
  },

  /**
   * Get personal best times for a player
   * @param {string} playerId - The player's ID
   * @returns {Promise<Array>} Array of player's best lap records
   */
  async getPersonalBests(playerId) {
    try {
      const { data, error } = await supabase
        .from('lap_records')
        .select(`
          *,
          racing_line:racing_lines(*)
        `)
        .eq('player_id', playerId)
        .eq('is_valid', true)
        .order('lap_time', { ascending: true })
        .limit(5)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching personal bests:', error)
      throw error
    }
  },

  /**
   * Subscribe to leaderboard updates
   * @param {Function} callback - Function to call when leaderboard updates
   */
  subscribeToLeaderboard(callback) {
    return supabase
      .channel('leaderboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lap_records',
          filter: 'is_valid=eq.true'
        },
        callback
      )
      .subscribe()
  }
} 