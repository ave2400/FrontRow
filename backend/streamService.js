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

const SETTINGS_TABLE = 'app_settings';
const STREAM_ID_KEY = 'youtube_stream_id';
const STREAM_TYPE_KEY = 'stream_type';

/**
 * Service to handle stream settings in Supabase
 */
const streamService = {
  /**
   * Get the current active stream ID
   * @returns {Promise<string>} The current stream ID or empty string if none exists
   */
  async getStreamId() {
    try {
      const { data, error } = await supabase
        .from(SETTINGS_TABLE)
        .select('value')
        .eq('key', STREAM_ID_KEY)
        .single();

      if (error) {
        console.error('Error fetching stream ID:', error);
        return '';
      }

      return data?.value || '';
    } catch (err) {
      console.error('Unexpected error fetching stream ID:', err);
      return '';
    }
  },

  /**
   * Get the current stream type (youtube or zoom)
   * @returns {Promise<string>} The current stream type or 'youtube' as default
   */
  async getStreamType() {
    try {
      const { data, error } = await supabase
        .from(SETTINGS_TABLE)
        .select('value')
        .eq('key', STREAM_TYPE_KEY)
        .single();

      if (error) {
        return 'youtube';
      }

      return data?.value || 'youtube';
    } catch (err) {
      console.error('Unexpected error fetching stream type:', err);
      return 'youtube';
    }
  },

  /**
   * Get complete stream configuration (ID and type)
   * @returns {Promise<Object>} Object containing stream ID and type
   */
  async getStreamConfig() {
    try {
      const [streamId, streamType] = await Promise.all([
        this.getStreamId(),
        this.getStreamType()
      ]);
      
      return { 
        id: streamId, 
        type: streamType 
      };
    } catch (err) {
      console.error('Unexpected error fetching stream config:', err);
      return { id: '', type: 'youtube' };
    }
  },

  /**
   * Update the stream ID
   * @param {string} streamId The new stream ID
   * @returns {Promise<boolean>} Success status
   */
  async updateStreamId(streamId) {
    try {
      // First check if the record exists
      const { data: existingData } = await supabase
        .from(SETTINGS_TABLE)
        .select('id')
        .eq('key', STREAM_ID_KEY)
        .single();

      let result;
      
      if (existingData) {
        // Update existing record
        result = await supabase
          .from(SETTINGS_TABLE)
          .update({ value: streamId, updated_at: new Date().toISOString() })
          .eq('key', STREAM_ID_KEY);
      } else {
        // Insert new record
        result = await supabase
          .from(SETTINGS_TABLE)
          .insert({ 
            key: STREAM_ID_KEY, 
            value: streamId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      const { error } = result;
      
      if (error) {
        console.error('Error updating stream ID:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Unexpected error updating stream ID:', err);
      return false;
    }
  },

  /**
   * Update the stream type (youtube or zoom)
   * @param {string} streamType The new stream type
   * @returns {Promise<boolean>} Success status
   */
  async updateStreamType(streamType) {
    try {
      // First check if the record exists
      const { data: existingData } = await supabase
        .from(SETTINGS_TABLE)
        .select('id')
        .eq('key', STREAM_TYPE_KEY)
        .single();

      let result;
      
      if (existingData) {
        // Update existing record
        result = await supabase
          .from(SETTINGS_TABLE)
          .update({ value: streamType, updated_at: new Date().toISOString() })
          .eq('key', STREAM_TYPE_KEY);
      } else {
        // Insert new record
        result = await supabase
          .from(SETTINGS_TABLE)
          .insert({ 
            key: STREAM_TYPE_KEY, 
            value: streamType,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      const { error } = result;
      
      if (error) {
        console.error('Error updating stream type:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Unexpected error updating stream type:', err);
      return false;
    }
  },

  /**
   * Update both stream ID and type in one operation
   * @param {string} streamId The new stream ID
   * @param {string} streamType The new stream type
   * @returns {Promise<boolean>} Success status
   */
  async updateStreamConfig(streamId, streamType) {
    try {
      const [idSuccess, typeSuccess] = await Promise.all([
        this.updateStreamId(streamId),
        this.updateStreamType(streamType)
      ]);
      
      return idSuccess && typeSuccess;
    } catch (err) {
      console.error('Unexpected error updating stream config:', err);
      return false;
    }
  }
};

module.exports = streamService; 