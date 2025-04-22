import React, { useState } from 'react';
import { createNote, uploadImage } from '../noteService';

const NoteEditor = ({ onNoteCreated }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImages(files);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // First create the note
            const note = await createNote({
                title,
                content,
                image_urls: []
            });

            // Then upload any images
            if (images.length > 0) {
                const imageUrls = await Promise.all(
                    images.map(file => uploadImage(file, note.id))
                );

                // Update the note with the image URLs
                await updateNote(note.id, {
                    image_urls: imageUrls
                });
            }

            // Clear the form
            setTitle('');
            setContent('');
            setImages([]);
            
            // Notify parent component
            if (onNoteCreated) {
                onNoteCreated();
            }
        } catch (error) {
            console.error('Error saving note:', error);
            alert('Failed to save note. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Title
                </label>
                <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                    Content
                </label>
                <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                />
            </div>

            <div>
                <label htmlFor="images" className="block text-sm font-medium text-gray-700">
                    Images
                </label>
                <input
                    type="file"
                    id="images"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-1 block w-full"
                />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
                {isLoading ? 'Saving...' : 'Save Note'}
            </button>
        </form>
    );
};

export default NoteEditor; 