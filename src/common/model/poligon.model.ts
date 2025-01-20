export interface TaskRequestBody {
  task: string;
  apikey: string;
  answer: any;
}

export interface DatabaseRequestBody {
  query: string;
    task: string;
  apikey: string;
}

export interface TaskRequestResponse {
  code: number;
  message: string;
}

export interface BananApiResponse {
  reply: Array<any>;
  error: string;
}
