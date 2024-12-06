export interface TaskRequestBody {
  task: string;
  apikey: string;
  answer: Array<string | number>;
}

export interface TaskRequestResponse {
  code: number;
  message: string;
}
