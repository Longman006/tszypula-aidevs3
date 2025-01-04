import type { TaskRequestBody, TaskRequestResponse } from "../model/poligon.model";


export default class PoligonApi {

  public static readonly apikey = "6e739d5d-219c-4212-b5ff-5b7c8b145f29";
  private static readonly poligonUri = "https://poligon.aidevs.pl/verify";
  public static readonly CENTRALA_URI = "https://centrala.ag3nts.org/report";

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
}
