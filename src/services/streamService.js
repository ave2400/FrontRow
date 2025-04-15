import { supabase } from '../supabaseClient';

// Table name in Supabase
const SETTINGS_TABLE = 'app_settings';
const STREAM_ID_KEY = 'youtube_stream_id';
const STREAM_TYPE_KEY = 'stream_type';

/**
 * Service to handle stream settings in Supabase
 */
export const streamService = {
  /**
   * Get the current active stream ID
   * @returns {Promise<string>} The current stream ID or empty string if none exists
   */
  async getStreamId() {
    try {
      console.log('⚙️ Fetching stream ID from Supabase...');
      
      const { data, error } = await supabase
        .from(SETTINGS_TABLE)
        .select('value')
        .eq('key', STREAM_ID_KEY)
        .single();

      if (error) {
        console.error('❌ Error fetching stream ID:', error);
        return '';
      }

      console.log('✅ Stream ID fetched successfully:', data?.value);
      return data?.value || '';
    } catch (err) {
      console.error('❌ Unexpected error fetching stream ID:', err);
      return '';
    }
  },

  /**
   * Get the current stream type (youtube or zoom)
   * @returns {Promise<string>} The current stream type or 'youtube' as default
   */
  async getStreamType() {
    try {
      console.log('⚙️ Fetching stream type from Supabase...');
      
      const { data, error } = await supabase
        .from(SETTINGS_TABLE)
        .select('value')
        .eq('key', STREAM_TYPE_KEY)
        .single();

      if (error) {
        console.log('⚠️ Stream type not found, defaulting to youtube');
        return 'youtube';
      }

      console.log('✅ Stream type fetched successfully:', data?.value);
      return data?.value || 'youtube';
    } catch (err) {
      console.error('❌ Unexpected error fetching stream type:', err);
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
      console.error('❌ Unexpected error fetching stream config:', err);
      return { id: '', type: 'youtube' };
    }
  },

  /**
   * Update the stream ID for all users
   * @param {string} streamId The new stream ID
   * @returns {Promise<boolean>} Success status
   */
  async updateStreamId(streamId) {
    try {
      console.log('⚙️ Attempting to update stream ID to:', streamId);
      console.log('⚙️ Using table:', SETTINGS_TABLE);
      console.log('⚙️ Using key:', STREAM_ID_KEY);
      
      // First check if the record exists
      console.log('⚙️ Checking if record exists...');
      const { data: existingData, error: checkError } = await supabase
        .from(SETTINGS_TABLE)
        .select('id')
        .eq('key', STREAM_ID_KEY)
        .single();
        
      if (checkError) {
        console.log('⚠️ Check error (might be expected if no record exists yet):', checkError);
      } else {
        console.log('✅ Record check result:', existingData);
      }

      let result;
      
      if (existingData) {
        // Update existing record
        console.log('⚙️ Updating existing record...');
        result = await supabase
          .from(SETTINGS_TABLE)
          .update({ value: streamId, updated_at: new Date().toISOString() })
          .eq('key', STREAM_ID_KEY);
          
        console.log('⚙️ Update result:', result);
      } else {
        // Insert new record
        console.log('⚙️ Inserting new record...');
        result = await supabase
          .from(SETTINGS_TABLE)
          .insert({ 
            key: STREAM_ID_KEY, 
            value: streamId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        console.log('⚙️ Insert result:', result);
      }

      const { error } = result;
      
      if (error) {
        console.error('❌ Error updating stream ID:', error);
        return false;
      }

      console.log('✅ Stream ID updated successfully!');
      return true;
    } catch (err) {
      console.error('❌ Unexpected error updating stream ID:', err);
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
      console.log('⚙️ Attempting to update stream type to:', streamType);
      
      // First check if the record exists
      const { data: existingData, error: checkError } = await supabase
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
        console.error('❌ Error updating stream type:', error);
        return false;
      }

      console.log('✅ Stream type updated successfully!');
      return true;
    } catch (err) {
      console.error('❌ Unexpected error updating stream type:', err);
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
      console.error('❌ Unexpected error updating stream config:', err);
      return false;
    }
  },

  /**
   * Subscribe to changes in the stream ID
   * @param {Function} callback Function to call when stream ID changes
   * @returns {Object} Subscription that can be unsubscribed
   */
  subscribeToStreamChanges(callback) {
    console.log('⚙️ Setting up subscription to stream ID changes...');
    
    // Return a subscription to the settings table
    const subscription = supabase
      .channel('stream-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SETTINGS_TABLE,
          filter: `key=eq.${STREAM_ID_KEY}`
        },
        (payload) => {
          // When a change happens, call the callback with the new value
          console.log('⚙️ Stream ID change detected in subscription:', payload);
          if (payload.new) {
            callback(payload.new.value);
          }
        }
      )
      .subscribe();
      
    console.log('✅ Stream ID subscription set up successfully');
    return subscription;
  },

  /**
   * Subscribe to changes in the stream type
   * @param {Function} callback Function to call when stream type changes
   * @returns {Object} Subscription that can be unsubscribed
   */
  subscribeToStreamTypeChanges(callback) {
    console.log('⚙️ Setting up subscription to stream type changes...');
    
    const subscription = supabase
      .channel('stream-type-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SETTINGS_TABLE,
          filter: `key=eq.${STREAM_TYPE_KEY}`
        },
        (payload) => {
          console.log('⚙️ Stream type change detected in subscription:', payload);
          if (payload.new) {
            callback(payload.new.value);
          }
        }
      )
      .subscribe();
      
    console.log('✅ Stream type subscription set up successfully');
    return subscription;
  },

  /**
   * Subscribe to changes in both stream ID and type
   * @param {Function} callback Function to call with complete config when either changes
   * @returns {Object} Object containing both subscriptions
   */
  subscribeToStreamConfigChanges(callback) {
    let currentConfig = { id: '', type: 'youtube' };
    
    const idSubscription = this.subscribeToStreamChanges((newId) => {
      currentConfig.id = newId;
      callback({ ...currentConfig });
    });
    
    const typeSubscription = this.subscribeToStreamTypeChanges((newType) => {
      currentConfig.type = newType;
      callback({ ...currentConfig });
    });
    
    return {
      idSubscription,
      typeSubscription,
      unsubscribe: () => {
        idSubscription.unsubscribe();
        typeSubscription.unsubscribe();
      }
    };
  }
};

export default streamService;