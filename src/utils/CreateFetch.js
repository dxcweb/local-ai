const { createParser } = require("eventsource-parser");
const queryString = (data) => {
  if (typeof data === "object") {
    const arr = [];
    Object.keys(data).forEach((key) => {
      arr.push(`${key}=${encodeURIComponent(data[key])}`);
    });
    return arr.join("&");
  }
  return undefined;
};
class CreateFetch {
  constructor(opts = {}) {
    const { baseURL = "", dataType = "json", getHeaders } = opts;
    this._baseURL = baseURL;
    this._getHeaders = getHeaders;
    this._dataType = dataType; // json | x-www-form-urlencoded
  }

  post = (url, data, opts = {}) => {
    opts.method = "POST";
    return this.base(url, data, opts);
  };
  get = (url, data, opts = {}) => {
    opts.params = data;
    opts.method = "GET";
    return this.base(url, null, opts);
  };
  sse = (url, data, onMessage, opts = {}) => {
    opts.onMessage = onMessage;
    if (!opts.method) {
      opts.method = "POST";
    }
    return this.base(url, data, opts);
  };
  base = async (url, data, opts = {}) => {
    const { method = "GET", headers = {}, params, onMessage, onError, signal } = opts;
    if (method === "POST") {
      if (this._dataType === "json") {
        headers["Content-Type"] = "application/json";
      } else if (this._dataType === "x-www-form-urlencoded") {
        headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
      }
    }
    let body;
    if (data) {
      if (this._dataType === "json") {
        body = JSON.stringify(data);
      } else if (this._dataType === "x-www-form-urlencoded") {
        body = queryString(data);
      }
      //   body = new FormData();
      //   Object.keys(data).forEach((key) => {
      //     if (data[key] !== undefined) {
      //       body.append(key, data[key]);
      //     }
      //   });
    }
    let fetchUrl = this._baseURL + url;
    const queryParams = queryString(params);
    if (queryParams) {
      fetchUrl += "?" + queryParams;
    }
    let res;
    // document.
    const fetchHeaders = this._getHeaders ? { ...headers, ...this._getHeaders() } : headers;
    try {
      res = await fetch(fetchUrl, { method, headers: fetchHeaders, body, signal });
      if (res.status !== 200) {
        onError && onError(res);
        return { error: true, status: res.status, data: await res.text() };
      }
      const resContentType = res.headers.get("Content-Type");
      if (resContentType.indexOf("application/json") >= 0) {
        return await res.json();
      } else if (resContentType.indexOf("text/event-stream") >= 0) {
        const reader = res.body.getReader();
        const parser = createParser((event) => {
          if (event.type === "event") {
            onMessage && onMessage(event.data);
          }
        });
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              return;
            }
            const str = new TextDecoder().decode(value);
            parser.feed(str);
          }
        } finally {
          reader.releaseLock();
        }
      }
      return await res.text();
    } catch (e) {
      onError && onError(e);
      console.error(e);
      return {};
    }
  };
}

module.exports = CreateFetch;
