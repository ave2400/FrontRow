import { supabase } from './supabaseClient';

/**
 * Create a new note
 * @param {Object} noteData - The note data to save
 * @param {string} noteData.title - The title of the note
 * @param {string} noteData.content - The content of the note
 * @param {string[]} noteData.image_urls - Array of image URLs
 * @returns {Promise<Object>} The created note
 */
export const createNote = async ({ title, content, image_urls = [] }) => {
    try {
        console.log('Creating note with data:', { title, content, image_urls });
        
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
            console.error('Error getting user:', userError);
            throw userError;
        }

        if (!user) {
            throw new Error('No authenticated user found');
        }
        
        const { data, error } = await supabase
            .from('notes')
            .insert([
                {
                    title,
                    content,
                    image_urls,
                    user_id: user.id
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Supabase error creating note:', error);
            throw error;
        }
        
        console.log('Note created successfully:', data);
        return data;
    } catch (error) {
        console.error('Error creating note:', error.message);
        throw error;
    }
};

/**
 * Upload an image to Supabase Storage
 * @param {File|Blob} file - The image file to upload
 * @param {string} noteId - The ID of the note this image belongs to
 * @returns {Promise<string>} The public URL of the uploaded image
 */
export const uploadImage = async (file, noteId) => {
    try {
        console.log('Uploading image for note:', noteId);
        
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
            console.error('Error getting user:', userError);
            throw userError;
        }

        if (!user) {
            throw new Error('No authenticated user found');
        }

        // Generate a unique filename
        const timestamp = new Date().getTime();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileExt = 'png'; // Since we're always saving as PNG
        const fileName = `${user.id}/${noteId}/${timestamp}-${randomString}.${fileExt}`;

        console.log('Uploading to path:', fileName);

        // Upload the file
        const { error: uploadError } = await supabase.storage
            .from('notes')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Supabase storage upload error:', uploadError);
            throw uploadError;
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
            .from('notes')
            .getPublicUrl(fileName);

        console.log('Image uploaded successfully:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error.message);
        throw error;
    }
};

/**
 * Get all notes for the current user
 * @returns {Promise<Object[]>} Array of notes
 */
export const getNotes = async () => {
    try {
        // console.log('Fetching notes...');
        
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error fetching notes:', error);
            throw error;
        }
        
        // console.log('Notes fetched successfully:', data);
        return data;
    } catch (error) {
        console.error('Error fetching notes:', error.message);
        throw error;
    }
};

/**
 * Update an existing note
 * @param {string} noteId - The ID of the note to update
 * @param {Object} updates - The updates to apply
 * @returns {Promise<Object>} The updated note
 */
export const updateNote = async (noteId, updates) => {
    try {
        console.log('Updating note:', noteId, 'with updates:', updates);
        
        const { data, error } = await supabase
            .from('notes')
            .update(updates)
            .eq('id', noteId)
            .select()
            .single();

        if (error) {
            console.error('Supabase error updating note:', error);
            throw error;
        }
        
        console.log('Note updated successfully:', data);
        return data;
    } catch (error) {
        console.error('Error updating note:', error.message);
        throw error;
    }
};

/**
 * Delete a note
 * @param {string} noteId - The ID of the note to delete
 * @returns {Promise<void>}
 */
export const deleteNote = async (noteId) => {
    try {
        console.log('Deleting note:', noteId);
        
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId);

        if (error) {
            console.error('Supabase error deleting note:', error);
            throw error;
        }
        
        console.log('Note deleted successfully');
    } catch (error) {
        console.error('Error deleting note:', error.message);
        throw error;
    }
}; 