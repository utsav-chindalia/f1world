import { supabase } from '../lib/supabase/client'

export const PlayerService = {
  /**
   * Create or update a player profile
   * @param {Object} data - Player data
   * @param {string} data.username - Player's username
   * @returns {Promise<Object>} Created/updated player object
   */
  async upsertPlayer(data) {
    try {
      const { data: player, error } = await supabase
        .from('players')
        .upsert({
          username: data.username
        })
        .select()
        .single()

      if (error) throw error
      return player
    } catch (error) {
      console.error('Error upserting player:', error)
      throw error
    }
  },

  /**
   * Get a player's profile
   * @param {string} playerId - The player's ID
   * @returns {Promise<Object>} Player object with stats
   */
  async getPlayerProfile(playerId) {
    try {
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single()

      if (playerError) throw playerError

      // Get player stats
      const { data: stats, error: statsError } = await supabase
        .from('lap_records')
        .select('*')
        .eq('player_id', playerId)
        .eq('is_valid', true)
        .order('lap_time', { ascending: true })

      if (statsError) throw statsError

      return {
        ...player,
        stats: {
          bestLapTime: stats[0]?.lap_time,
          totalLaps: stats.length,
          averageLapTime: stats.reduce((acc, lap) => acc + lap.lap_time, 0) / stats.length
        }
      }
    } catch (error) {
      console.error('Error getting player profile:', error)
      throw error
    }
  },

  /**
   * Subscribe to player profile updates
   * @param {string} playerId - The player's ID
   * @param {Function} callback - Function to call when profile updates
   */
  subscribeToPlayerUpdates(playerId, callback) {
    return supabase
      .channel('player_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `id=eq.${playerId}`
        },
        callback
      )
      .subscribe()
  }
} 