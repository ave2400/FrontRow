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
 * Service to handle stream settings and user roles in Supabase
 */
const streamService = {
  /**
   * Get the current stream status
   * @returns {Promise<Object>} The current stream status
   */
  async getCurrentStream() {
    try {
      // First, ensure only one stream is active
      const { data: activeStreams, error: checkError } = await supabase
        .from(STREAMS_TABLE)
        .select('*')
        .eq('is_active', true);

      if (checkError) {
        console.error('Error checking active streams:', checkError);
        return null;
      }

      // If multiple streams are active, deactivate all but the most recent one
      if (activeStreams && activeStreams.length > 1) {
        const sortedStreams = activeStreams.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        const [mostRecent, ...others] = sortedStreams;

        // Deactivate all other streams
        for (const stream of others) {
          await supabase
            .from(STREAMS_TABLE)
            .update({ is_active: false })
            .eq('id', stream.id);
        }

        return mostRecent;
      }

      // Return the single active stream or null
      return activeStreams?.[0] || null;
    } catch (err) {
      console.error('Unexpected error fetching current stream:', err);
      return null;
    }
  },

  /**
   * Check if a user is the admin using user claims
   * @param {string} userId The user ID to check
   * @returns {Promise<boolean>} Whether the user is admin
   */
  async isUserAdmin(userId) {
    try {
      // console.log('Checking admin status for user ID:', userId);
      
      // Get user's role claim
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      
      if (error) {
        // console.error('Error checking admin status:', error);
        return false;
      }

      console.log('User data:', data);
      
      // Check if user has admin role in claims
      const userRole = data.user?.app_metadata?.role;
      console.log('User role:', userRole);
      
      const isAdmin = userRole === 'admin';
      console.log('Is admin:', isAdmin);
      
      return isAdmin;
    } catch (err) {
      // console.error('Unexpected error checking admin status:', err);
      return false;
    }
  },

  /**
   * Start a new stream
   * @param {string} userId The user ID starting the stream
   * @returns {Promise<Object>} The created stream or null if failed
   */
  async startStream(userId) {
    try {
      console.log('startStream called with userId:', userId);
      
      // Check if user is admin
      const isAdmin = await this.isUserAdmin(userId);
      console.log('startStream - isAdmin result:', isAdmin);
      
      if (!isAdmin) {
        console.error('Non-admin user attempted to start stream');
        return null;
      }

      console.log('Admin confirmed, proceeding to start stream...');

      // Deactivate any existing streams
      await supabase
        .from(STREAMS_TABLE)
        .update({ is_active: false })
        .eq('is_active', true);

      // Create new stream
      const { data, error } = await supabase
        .from(STREAMS_TABLE)
        .insert({
          is_active: true,
          stream_type: 'local', // Local camera/microphone streaming
          name: 'Local Stream',
          stream_id: 'local'
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting stream:', error);
        return null;
      }

      // console.log('Stream started successfully:', data);
      return data;
    } catch (err) {
      console.error('Unexpected error starting stream:', err);
      return null;
    }
  },

  /**
   * Stop the current stream
   * @param {string} userId The user ID stopping the stream
   * @returns {Promise<boolean>} Success status
   */
  async stopStream(userId) {
    try {
      // Check if user is admin
      const isAdmin = await this.isUserAdmin(userId);
      if (!isAdmin) {
        console.error('Non-admin user attempted to stop stream');
        return false;
      }

      const { error } = await supabase
        .from(STREAMS_TABLE)
        .update({ 
          is_active: false
        })
        .eq('is_active', true);

      if (error) {
        console.error('Error stopping stream:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Unexpected error stopping stream:', err);
      return false;
    }
  },

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
  },

  /**
   * Handle WebRTC signaling
   * @param {string} streamId The stream ID
   * @param {string} userId The user ID
   * @param {Object} signal The WebRTC signal
   * @returns {Promise<Object>} The response signal
   */
  async handleSignaling(streamId, userId, signal) {
    try {
      // Get the current stream
      const { data: stream, error: streamError } = await supabase
        .from(STREAMS_TABLE)
        .select('*')
        .eq('id', streamId)
        .single();

      if (streamError || !stream) {
        throw new Error('Stream not found');
      }

      // Check if the stream is active
      if (!stream.is_active) {
        throw new Error('Stream is not active');
      }

      // Simple signaling mechanism
      // TODO: Use WebSockets or a proper signaling server
      
      if (signal.type === 'offer') {
        // This is a viewer trying to connect to the stream
        // TODO: orward this to the broadcaster
        // For now, we are creating a simple answer
        return {
          type: 'answer',
          sdp: 'v=0\r\n' +
               'o=- 1234567890 2 IN IP4 127.0.0.1\r\n' +
               's=-\r\n' +
               't=0 0\r\n' +
               'a=group:BUNDLE 0\r\n' +
               'm=video 9 UDP/TLS/RTP/SAVPF 96\r\n' +
               'c=IN IP4 0.0.0.0\r\n' +
               'a=mid:0\r\n' +
               'a=sendonly\r\n' +
               'a=rtpmap:96 H264/90000\r\n'
        };
      } else if (signal.type === 'answer') {
        // This is a response to an offer
        return signal;
      } else {
        throw new Error('Invalid signal type');
      }
    } catch (err) {
      console.error('Error handling WebRTC signaling:', err);
      throw err;
    }
  },

  /**
   * Get ICE servers configuration
   * @returns {Promise<Object>} ICE servers configuration
   */
  async getIceServers() {
    // In production, you should use your own STUN/TURN servers
    return {
      iceServers: [
        {
          urls: [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302'
          ]
        }
      ]
    };
  }
};

module.exports = streamService; 