export default class XyzApi {
    private static readonly uri = "https://xyz.ag3nts.org/";
  
    public static async login(answer: string) {
        const formData = new FormData();
        formData.append("username", "tester");
        formData.append("password", "574e112a");
        formData.append("answer", answer);
      const response = await fetch(this.uri, {
        method: "POST",
        headers: {
        //   "Content-Type": "application/json",
        //   Accept: "application/json"
        },
        body: formData
      });

      // Print all response headers
      response.headers.forEach((value, name) => {
        console.log(`${name}: ${value}`);
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
  }

  interface xyzRequestBody {
    username: string;
    password: string;
    answer: string;
  }
