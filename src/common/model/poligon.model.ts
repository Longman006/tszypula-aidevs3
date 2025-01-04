export interface TaskRequestBody {
  task: string;
  apikey: string;
  answer: any;
}

export interface TaskRequestResponse {
  code: number;
  message: string;
}
