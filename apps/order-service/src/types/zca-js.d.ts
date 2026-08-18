declare module 'zca-js' {
  export enum ThreadType {
    User = 0,
    Group = 1,
  }

  export type Cookie = {
    domain?: string;
    expirationDate?: number;
    hostOnly?: boolean;
    httpOnly?: boolean;
    name: string;
    path?: string;
    sameSite?: string;
    secure?: boolean;
    session?: boolean;
    storeId?: string;
    value: string;
    key?: string;
    expires?: string;
  };

  export type Credentials = {
    imei: string;
    cookie: Cookie[];
    userAgent: string;
    language?: string;
  };

  export type SendMessageResponse = {
    message: { msgId: number } | null;
    attachment: Array<{ msgId: number }>;
  };

  export class API {
    sendMessage(
      message: string | { msg: string },
      threadId: string,
      type?: ThreadType,
    ): Promise<SendMessageResponse>;
  }

  export class Zalo {
    login(credentials: Credentials): Promise<API>;
  }
}
