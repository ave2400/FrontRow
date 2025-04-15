import { supabase } from '../supabaseClient';

// Table name in Supabase
const SETTINGS_TABLE = 'app_settings';
const STREAM_SETTING_KEY = 'youtube_stream_id';

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
        .eq('key', STREAM_SETTING_KEY)
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
   * Update the stream ID for all users
   * @param {string} streamId The new stream ID
   * @returns {Promise<boolean>} Success status
   */
  async updateStreamId(streamId) {
    try {
      console.log('⚙️ Attempting to update stream ID to:', streamId);
      console.log('⚙️ Using table:', SETTINGS_TABLE);
      console.log('⚙️ Using key:', STREAM_SETTING_KEY);
      
      // First check if the record exists
      console.log('⚙️ Checking if record exists...');
      const { data: existingData, error: checkError } = await supabase
        .from(SETTINGS_TABLE)
        .select('id')
        .eq('key', STREAM_SETTING_KEY)
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
          .eq('key', STREAM_SETTING_KEY);
          
        console.log('⚙️ Update result:', result);
      } else {
        // Insert new record
        console.log('⚙️ Inserting new record...');
        result = await supabase
          .from(SETTINGS_TABLE)
          .insert({ 
            key: STREAM_SETTING_KEY, 
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
          filter: `key=eq.${STREAM_SETTING_KEY}`
        },
        (payload) => {
          // When a change happens, call the callback with the new value
          console.log('⚙️ Stream change detected in subscription:', payload);
          if (payload.new) {
            callback(payload.new.value);
          }
        }
      )
      .subscribe();
      
    console.log('✅ Subscription set up successfully');
    return subscription;
  }
};

export default streamService;