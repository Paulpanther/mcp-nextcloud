import { BaseNextcloudClient } from './base.js';
import { Note } from '../models/notes.js';

export class NotesClient extends BaseNextcloudClient {
  public async getAllNotes(): Promise<Note[]> {
    return this.makeRequest<Note[]>({
      method: 'GET',
      url: '/apps/notes/api/v1/notes',
    });
  }

  public async getNote(noteId: number): Promise<Note> {
    return this.makeRequest<Note>({
      method: 'GET',
      url: `/apps/notes/api/v1/notes/${noteId}`,
    });
  }

  public async createNote(
    title: string,
    content: string,
    category: string
  ): Promise<Note> {
    return this.makeRequest<Note>({
      method: 'POST',
      url: '/apps/notes/api/v1/notes',
      data: { title, content, category },
    });
  }

  public async updateNote(
    noteId: number,
    etag: string,
    title?: string,
    content?: string,
    category?: string
  ): Promise<Note> {
    return this.updateNoteWithRetry(noteId, etag, title, content, category);
  }

  private async updateNoteWithRetry(
    noteId: number,
    etag: string,
    title?: string,
    content?: string,
    category?: string,
    retryCount: number = 0
  ): Promise<Note> {
    try {
      // Try both ETag formats - some APIs are picky about quotes
      const etagFormats = [etag, `"${etag}"`, etag.replace(/"/g, '')];
      let lastError: Error | null = null;

      for (const formattedEtag of etagFormats) {
        try {
          return await this.makeRequest<Note>({
            method: 'PUT',
            url: `/apps/notes/api/v1/notes/${noteId}`,
            headers: { 'If-Match': formattedEtag },
            data: { title, content, category },
          });
        } catch (error) {
          lastError = error as Error;
          // If it's not a 412 error, don't try other formats
          if (!(error instanceof Error) || !error.message.includes('412')) {
            throw error;
          }
        }
      }

      throw lastError;
    } catch (error) {
      // If we get a 412 Precondition Failed and haven't retried yet,
      // fetch fresh note data and retry with the current ETag
      if ((error instanceof Error) && error.message.includes('412') && retryCount === 0) {
        try {
          const freshNote = await this.getNote(noteId);
          return this.updateNoteWithRetry(noteId, freshNote.etag, title, content, category, 1);
        } catch (refreshError) {
          // If refresh fails, throw original error
          throw error;
        }
      }
      throw error;
    }
  }

  public async deleteNote(noteId: number): Promise<void> {
    await this.makeRequest<void>({
      method: 'DELETE',
      url: `/apps/notes/api/v1/notes/${noteId}`,
    });
  }
}