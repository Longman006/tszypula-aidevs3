import { OpenAIService } from "./OpenAIService";
import fs from 'fs/promises';
import path from 'path';

interface TranscriptionData {
  name: string;
  transcription: string;
}

export class AudioHelper {
  private openAIService: OpenAIService;

  constructor() {
    this.openAIService = new OpenAIService();
  }

  async getTranscripts(): Promise<string> {
    try {
      const directoryPath = path.join(process.cwd(), 'S02E01/przesluchania');
      const files = await fs.readdir(directoryPath);
      const audioFiles = files.filter(file => file.endsWith('.m4a'));

      const transcriptions: TranscriptionData[] = await Promise.all(
        audioFiles.map(async (file) => {
          const filePath = path.join(directoryPath, file);
          const audioBuffer = await fs.readFile(filePath);
          console.log(`${file} - ${audioBuffer.length}`);
          const transcript = await this.openAIService.transcribeGroq(audioBuffer);
          return {
            name: file,
            transcription: transcript
          };
        })
      );

      // Convert the array to a formatted string
      return transcriptions
        .map(t => `File ${t.name}:\n${t.transcription}\n\n`)
        .join('');
    } catch (error) {
      console.error('Error processing audio files:', error);
      throw error;
    }
  }
}
