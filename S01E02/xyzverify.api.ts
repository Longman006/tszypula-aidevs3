export default class XyzApi {
    private readonly uri = "https://xyz.ag3nts.org/verify";
    public msgId: string = "";
    public question: string = "";

    constructor() {
        // Remove this since we can't use async in constructor
        // this.initConversation();
    }

    // Make this static to allow initialization
    public static async create(): Promise<XyzApi> {
        const api = new XyzApi();
        await api.initConversation();
        return api;
    }
  
    public async verify(message: xyzVerifyRequest) {
      const response = await fetch(this.uri, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(message)
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json().then(data => {
            return data;
        });
      } else {
        return response.text().then(text => {
            return text;
        });
      }
    }

    public async initConversation() {
        const response = await fetch(this.uri, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
                text: "",
                msgId: this.msgId
            })
        });
        const data = await response.json() as xyzVerifyRequest;
        this.question = data.text;
    }
  }

  interface xyzVerifyRequest {
    text: string;
    msgId: string;
  }