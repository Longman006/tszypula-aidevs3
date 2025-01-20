import type { BananApiResponse, DatabaseRequestBody, TaskRequestBody, TaskRequestResponse } from "../model/poligon.model";


export default class PoligonApi {

  public static readonly apikey = "6e739d5d-219c-4212-b5ff-5b7c8b145f29";
  private static readonly poligonUri = "https://poligon.aidevs.pl/verify";
  public static readonly CENTRALA_URI = "https://centrala.ag3nts.org/report";
  public static readonly DATABASE_URI = "https://centrala.ag3nts.org/apidb";

  public static async sendTaskAnswer(task: string, answer: any, uri: string = this.poligonUri): Promise<TaskRequestResponse> {
    const body: TaskRequestBody = {
      answer: answer,
      apikey: this.apikey,
      task: task
    };
    const response = await fetch(uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body)
    });
    const responseBody: TaskRequestResponse = await response.json();
    return responseBody;
  }

  public static async sendDatabaseQuery(query: string): Promise<BananApiResponse> {
    const body: DatabaseRequestBody = {
      query: query,
      task: "database",
      apikey: this.apikey
    };
    const response = await fetch(this.DATABASE_URI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body)
    });
    
    try {
      const text = await response.text(); // First get the raw response
      //console.log('Raw response:', text); // Log it for debugging
      const responseBody: BananApiResponse = JSON.parse(text); // Then parse it
      return responseBody;
    } catch (error) {
      console.error('Failed to parse response:', error);
      throw new Error(`Failed to parse API response: ${error}`);
    }
  }
}

