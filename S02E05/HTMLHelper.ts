import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { URL } from 'url';

export class HTMLHelper {
    private readonly url: string;
    private readonly sourceDir: string = 'S02E05/pliki_source';
    private readonly outputDir: string = 'S02E05/pliki_output';
    private html: string = '';

    constructor(url: string) {
        this.url = url;
        this.ensureDirectoriesExist();
    }

    private ensureDirectoriesExist(): void {
        if (!fs.existsSync(this.sourceDir)) {
            fs.mkdirSync(this.sourceDir, { recursive: true });
        }
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    private getHtmlFileName(): string {
        return `${this.getFileNameFromUrl(this.url)}`;
    }

    public async downloadHtml(): Promise<void> {
        const htmlFileName = this.getHtmlFileName();
        const htmlFilePath = path.join(this.sourceDir, htmlFileName);

        // Check if file already exists
        if (fs.existsSync(htmlFilePath)) {
            console.log(`HTML file already exists at: ${htmlFilePath}`);
            // Load existing HTML content
            this.html = fs.readFileSync(htmlFilePath, 'utf-8');
            return;
        }

        try {
            console.log(`Starting download of HTML from: ${this.url}`);
            const response = await axios.get(this.url);
            this.html = response.data;

            console.log('Starting dependency downloads...');
            await this.downloadDependencies();
            console.log('Finished downloading all dependencies');

            // Move URL replacement logic here, after dependencies are downloaded
            const $ = cheerio.load(this.html);
            const baseUrl = new URL(this.url);

            // Update image URLs
            $('img').each((_, img) => {
                const imgSrc = $(img).attr('src');
                if (imgSrc) {
                    const fileName = this.getFileNameFromUrl(new URL(imgSrc, baseUrl).toString());
                    const relativePath = `${this.sourceDir}/${fileName}`;
                    $(img).attr('src', relativePath);
                }
            });

            // Update audio source URLs
            $('audio source').each((_, audio) => {
                const audioSrc = $(audio).attr('src');
                if (audioSrc) {
                    const fileName = this.getFileNameFromUrl(new URL(audioSrc, baseUrl).toString());
                    const relativePath = `${this.sourceDir}/${fileName}`;
                    $(audio).attr('src', relativePath);
                }
            });

            // Update the HTML content with modified URLs
            this.html = $.html();

            const fileName = this.getFileNameFromUrl(this.url);
            console.log(`Saving HTML to file: ${fileName}`);
            fs.writeFileSync(path.join(this.sourceDir, `${fileName}`), this.html);
        } catch (error: unknown) {
            if (error instanceof Error) {
                throw new Error(`Failed to download HTML: ${error.message}`);
            }
            throw new Error('Failed to download HTML: Unknown error');
        }
    }

    private async downloadDependencies(): Promise<void> {
        const $ = cheerio.load(this.html);
        const baseUrl = new URL(this.url);

        // Download images
        const images = $('img');
        console.log(`Found ${images.length} images to download`);
        for (let i = 0; i < images.length; i++) {
            const imgSrc = $(images[i]).attr('src');
            if (imgSrc) {
                console.log(`Processing image ${i + 1}/${images.length}: ${imgSrc}`);
                await this.downloadAsset(imgSrc, baseUrl);
            }
        }

        // Download audio files
        const audioSources = $('audio source');
        console.log(`Found ${audioSources.length} audio files to download`);
        for (let i = 0; i < audioSources.length; i++) {
            const audioSrc = $(audioSources[i]).attr('src');
            if (audioSrc) {
                console.log(`Processing audio ${i + 1}/${audioSources.length}: ${audioSrc}`);
                await this.downloadAsset(audioSrc, baseUrl);
            }
        }
    }

    private async downloadAsset(assetUrl: string, baseUrl: URL): Promise<void> {
        try {
            const fullUrl = new URL(assetUrl, baseUrl);
            console.log(`Downloading asset from: ${fullUrl.toString()}`);
            const response = await axios({
                method: 'get',
                url: fullUrl.toString(),
                responseType: 'stream'
            });

            const fileName = this.getFileNameFromUrl(fullUrl.toString());
            const filePath = path.join(this.sourceDir, fileName);
            console.log(`Saving asset to: ${filePath}`);
            
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(`Failed to download asset ${assetUrl}: ${error.message}`);
            } else {
                console.error(`Failed to download asset ${assetUrl}: Unknown error`);
            }
        }
    }

    public async convertHtmlToMarkdown(): Promise<void> {
        if (!this.html) {
            throw new Error('HTML content not available. Please download HTML first.');
        }

        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(this.html);

        const fileName = this.getFileNameFromUrl(this.url).replace('.html', '');
        fs.writeFileSync(
            path.join(this.sourceDir, `${fileName}.md`),
            markdown
        );
    }

    private getFileNameFromUrl(url: string): string {
        const urlObj = new URL(url);
        const fileName = path.basename(urlObj.pathname);
        // If fileName is empty or just '/', return 'index'
        if (!fileName || fileName === '/') {
            return 'index';
        }
        // Return the filename as-is, without adding extra extension
        return fileName;
    }
}
