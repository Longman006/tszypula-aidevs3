import fs from 'fs/promises';
import path, { join } from 'path';
import axios from 'axios';
import { OpenAIService } from './OpenAIService';
import { AudioHelper } from './AudioHelper';
import type { ChatCompletionContentPartImage } from 'openai/resources/chat/completions.mjs';
import { readFile } from 'fs/promises';

export class MarkdownHelper {
  private readonly openAIService: OpenAIService;
  private readonly audioHelper: AudioHelper;
  private readonly sourceDir = 'S02E05/pliki_source';
  private readonly outputDir = 'S02E05/pliki_output';
  private readonly sourcePath: string;

  constructor(sourceFilePath: string) {
    this.sourcePath = sourceFilePath;
    this.openAIService = new OpenAIService();
    this.audioHelper = new AudioHelper(this.sourceDir);
  }

  async parse(): Promise<void> {
    try {
      console.log('Starting markdown processing...');
      // Create directories if they don't exist
      await fs.mkdir(this.sourceDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });

      const fileName = path.basename(this.sourcePath);
      const outputFilePath = path.join(this.outputDir, fileName);

      // Check if file already exists in output directory
      try {
        await fs.access(outputFilePath);
        console.log(`File ${fileName} already exists in output directory. Skipping processing.`);
        return;
      } catch (error) {
        // File doesn't exist, continue with processing
      }

      // Get the markdown content
      const content = await this.getMarkdownContent();

      console.log(`Processing file: ${fileName}`);
      // Save to source directory
      const sourceFilePath = path.join(this.sourceDir, fileName);
      await fs.writeFile(sourceFilePath, content);

      // Create initial copy in output directory
      await fs.copyFile(sourceFilePath, outputFilePath);

      console.log('Initial file processing complete. Starting content parsing...');
      let outputContent = await fs.readFile(outputFilePath, 'utf-8');
      outputContent = await this.parseMarkdown(outputContent);

      console.log('Content parsing complete. Saving final output...');
      // Save the processed content back to the output file
      await fs.writeFile(outputFilePath, outputContent);
      console.log('Processing completed successfully.');

    } catch (error) {
      console.error('Error executing MarkdownHelper:', error);
      throw error;
    }
  }

  private async parseMarkdown(content: string): Promise<string> {
    console.log('Starting audio file processing...');
    // Process audio files (mp3)
    let processedContent = await this.replaceAsync(
      content,
      /\[(.*?)\]\((.*?\.mp3)\)/g,
      async (match, text, audioUrl) => {
        console.log(`Processing audio file: ${audioUrl}`);
        try {
          const audioFileName = path.basename(audioUrl);
          const transcription = await this.audioHelper.getTranscript(audioFileName);
          console.log(`Audio transcription complete for: ${audioUrl}`);
          return `[Audio Transcription: ${transcription.transcription}]`;
        } catch (error) {
          console.error(`Error processing audio file ${audioUrl}:`, error);
          return match;
        }
      }
    );

    console.log('Starting image processing...');
    // Process images (png)
    processedContent = await this.replaceAsync(
      processedContent,
      /!\[(.*?)\]\((.*?\.png)\)/g,
      async (match, alt, imageUrl) => {
        console.log(`Processing image: ${imageUrl}`);
        try {
          const response = await this.openAIService.completion({
            messages: [{
              role: 'user',
              content: `Please describe this image. Keep the description detailed, factual and concise. Make sure to highlight any odd small details that stand out. Describe also the setting and any image style elements such as lighting, is it a photo or a drawing, etc.`
            },
            {
                role: 'user',
                content: [await this.createImagePart(imageUrl)]
            }],
            model: 'gpt-4o'
          });

          if (!this.openAIService.isStreamResponse(response)) {
            console.log(`Image description complete for: ${imageUrl}`);
            const description = response.choices[0].message.content;
            return `[Image Description: ${description}]`;
          }
          return match;
        } catch (error) {
          console.error(`Error processing image ${imageUrl}:`, error);
          return match;
        }
      }
    );

    return processedContent;
  }

  private async getMarkdownContent(): Promise<string> {
    if (this.sourcePath.startsWith('http')) {
      const response = await axios.get(this.sourcePath);
      return response.data;
    } else {
      return await fs.readFile(this.sourcePath, 'utf-8');
    }
  }

  private async replaceAsync(
    str: string,
    regex: RegExp,
    asyncFn: (match: string, ...args: string[]) => Promise<string>
  ): Promise<string> {
    const promises: Promise<string>[] = [];
    str.replace(regex, (match, ...args) => {
      promises.push(asyncFn(match, ...args));
      return match;
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift() || '');
  }

  private async createImagePart(imageUrl: string): Promise<ChatCompletionContentPartImage> {
    // Remove the sourceDir from the imageUrl if it's already included
    const relativePath = imageUrl.replace(`${this.sourceDir}/`, '');
    const filePath = join(this.sourceDir, relativePath);
    const fileData = await readFile(filePath);
    const base64Image = fileData.toString('base64');
    return {
        type: "image_url",
        image_url: {
            url: `data:image/png;base64,${base64Image}`,
            detail: "high"
        }
    } as ChatCompletionContentPartImage;
  }

  public async getParsedMarkdownContent(): Promise<string> {
    const fileName = path.basename(this.sourcePath);
    const outputFilePath = path.join(this.outputDir, fileName);
    
    try {
      return await fs.readFile(outputFilePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading parsed markdown file: ${outputFilePath}`, error);
      throw error;
    }
  }
}
