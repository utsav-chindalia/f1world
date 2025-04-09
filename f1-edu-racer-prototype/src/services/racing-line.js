import { supabase } from '../lib/supabase/client'

export const RacingLineService = {
  /**
   * Save a new racing line
   * @param {Object} data - Racing line data
   * @param {number} data.lapTime - Lap time in milliseconds
   * @param {Array<{x: number, y: number, velocity: number}>} data.points - Racing line points
   * @param {Object} data.metadata - Additional metadata
   */
  async saveRacingLine(data) {
    try {
      // First save the lap record
      const { data: lapRecord, error: lapError } = await supabase
        .from('lap_records')
        .insert({
          lap_time: data.lapTime,
          track_id: data.track_id,
          is_valid: true
        })
        .select()
        .single()

      if (lapError) throw lapError

      // Then save the racing line
      const { data: racingLine, error: lineError } = await supabase
        .from('racing_lines')
        .insert({
          lap_record_id: lapRecord.id,
          points: data.points,
          metadata: data.metadata
        })
        .select()
        .single()

      if (lineError) throw lineError

      return { lapRecord, racingLine }
    } catch (error) {
      console.error('Error saving racing line:', error)
      throw error
    }
  },

  /**
   * Get the best racing line
   * @returns {Promise<Object>} The best racing line with its lap record
   */
  async getBestRacingLine() {
    try {
      const { data, error } = await supabase
        .from('racing_lines')
        .select(`
          *,
          lap_record:lap_records(*)
        `)
        .order('lap_record(lap_time)', { ascending: true })
        .limit(1)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting best racing line:', error)
      throw error
    }
  },

  /**
   * Subscribe to new racing lines
   * @param {Function} callback - Function to call when new racing lines are added
   */
  subscribeToNewRacingLines(callback) {
    return supabase
      .channel('racing_lines')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'racing_lines'
        },
        callback
      )
      .subscribe()
  }
} 