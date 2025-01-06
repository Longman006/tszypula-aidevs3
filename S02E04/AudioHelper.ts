import fs from 'fs/promises';
import path from 'path';
import { OpenAIService } from './OpenAIService';

interface TranscriptionData {
  name: string;
  transcription: string;
}

export class AudioHelper {
  private openAIService: OpenAIService;
  private directoryPath: string;

  constructor(directoryPath: string) {
    this.openAIService = new OpenAIService();
    this.directoryPath = directoryPath;
  }

  async getTranscript(file: string): Promise<TranscriptionData> {
    try {

          const filePath = path.join(this.directoryPath, file);
          const audioBuffer = await fs.readFile(filePath);
          // console.log(`${file} - ${audioBuffer.length}`);
          const transcript = await this.openAIService.transcribeGroq(audioBuffer);
          return {
            name: file,
            transcription: transcript
          };

    } catch (error) {
      console.error('Error processing audio files:', error);
      throw error;
    }
  }

  convertToStrings(transcriptions: TranscriptionData[]): string {
    return transcriptions
      .map(t => `File ${t.name}:\n${t.transcription}\n\n`)
      .join('');
  }
}
