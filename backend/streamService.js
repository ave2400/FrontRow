const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); 

if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase configuration for streamService: REACT_APP_SUPABASE_URL and/or REACT_APP_SUPABASE_SERVICE_ROLE_KEY are not set in .env file');
  throw new Error('streamService: Supabase URL or Service Role Key is missing.');
}

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY 
);

const STREAMS_TABLE = 'streams';

/**
 * Service to handle stream settings in Supabase
 */
const streamService = {
  /**
   * Get all active streams
   * @returns {Promise<Array>} Array of active streams
   */
  async getActiveStreams() {
    try {
      const { data, error } = await supabase
        .from(STREAMS_TABLE)
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching active streams:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Unexpected error fetching active streams:', err);
      return [];
    }
  },

  /**
   * Get all streams (admin only)
   * @returns {Promise<Array>} Array of all streams
   */
  async getAllStreams() {
    try {
      const { data, error } = await supabase
        .from(STREAMS_TABLE)
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching all streams:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Unexpected error fetching all streams:', err);
      return [];
    }
  },

  /**
   * Get a specific stream by ID
   * @param {string} streamId The stream ID to fetch
   * @returns {Promise<Object>} The stream object or null if not found
   */
  async getStreamById(streamId) {
    try {
      const { data, error } = await supabase
        .from(STREAMS_TABLE)
        .select('*')
        .eq('id', streamId)
        .single();

      if (error) {
        console.error('Error fetching stream:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Unexpected error fetching stream:', err);
      return null;
    }
  },

  /**
   * Create a new stream
   * @param {Object} streamData The stream data
   * @returns {Promise<Object>} The created stream or null if failed
   */
  async createStream(streamData) {
    try {
      const { data, error } = await supabase
        .from(STREAMS_TABLE)
        .insert({
          name: streamData.name,
          stream_id: streamData.streamId,
          stream_type: streamData.streamType,
          is_active: streamData.isActive || false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating stream:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Unexpected error creating stream:', err);
      return null;
    }
  },

  /**
   * Update an existing stream
   * @param {string} streamId The ID of the stream to update
   * @param {Object} streamData The updated stream data
   * @returns {Promise<boolean>} Success status
   */
  async updateStream(streamId, streamData) {
    try {
      const { error } = await supabase
        .from(STREAMS_TABLE)
        .update({
          name: streamData.name,
          stream_id: streamData.streamId,
          stream_type: streamData.streamType,
          is_active: streamData.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', streamId);

      if (error) {
        console.error('Error updating stream:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Unexpected error updating stream:', err);
      return false;
    }
  },

  /**
   * Delete a stream
   * @param {string} streamId The ID of the stream to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteStream(streamId) {
    try {
      const { error } = await supabase
        .from(STREAMS_TABLE)
        .delete()
        .eq('id', streamId);

      if (error) {
        console.error('Error deleting stream:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Unexpected error deleting stream:', err);
      return false;
    }
  },

  /**
   * Toggle stream active status
   * @param {string} streamId The ID of the stream to toggle
   * @param {boolean} isActive The new active status
   * @returns {Promise<boolean>} Success status
   */
  async toggleStreamActive(streamId, isActive) {
    try {
      const { error } = await supabase
        .from(STREAMS_TABLE)
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', streamId);

      if (error) {
        console.error('Error toggling stream active status:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Unexpected error toggling stream active status:', err);
      return false;
    }
  }
};

module.exports = streamService; 