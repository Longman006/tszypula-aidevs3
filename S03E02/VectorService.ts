import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import { OpenAIService } from './OpenAIService';

export interface IDoc {
  text: string;
  date: string;
}

export interface IDocEmbedding extends IDoc {
  vector: number[];
  id: string;
  payload: IDoc;
}

export class VectorService {
  private client: QdrantClient;
  private openAIService: OpenAIService;

  constructor(openAIService: OpenAIService) {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
    this.openAIService = openAIService;
  }

  async ensureCollection(name: string) {
    const collections = await this.client.getCollections();
    if (!collections.collections.some(c => c.name === name)) {
      await this.client.createCollection(name, {
        vectors: { size: 3072, distance: "Cosine" }
      });
    }
  }

  async addPoints(collectionName: string, points: {id: string, doc: IDoc}[]) {
    const pointsToUpsert = await Promise.all(points.map(async point => {
      const embedding = await this.openAIService.createEmbedding(point.doc.text);
      return {
        id: point.id,
        vector: embedding,
        payload: {
          text: point.doc.text,
          date: point.doc.date
        }
      };
    }));

    await this.client.upsert(collectionName, {
      wait: true,
      points: pointsToUpsert
    });
  }

  async performSearch(collectionName: string, query: string, limit: number = 5) {
    const queryEmbedding = await this.openAIService.createEmbedding(query);
    return this.client.search(collectionName, {
      vector: queryEmbedding,
      limit,
      with_payload: true
    });
  }
}