export {}

declare global {
  interface Window {
    gapi: {
      load: (api: string, callback?: (() => void) | { callback?: () => void; onerror?: () => void }) => void;
      client: {
        init: (config: { apiKey?: string; discoveryDocs?: string[] }) => Promise<void>;
        setToken: (token: { access_token: string } | null) => void;
        drive: {
          about: {
            get: (params: { fields: string }) => Promise<{ result: any }>;
          };
          files: {
            list: (params: any) => Promise<{ result: { files: any[] } }>;
            get: (params: any) => Promise<{ result: any }>;
            create: (params: any) => Promise<{ result: any }>;
            update: (params: any) => Promise<{ result: any }>;
            delete: (params: any) => Promise<{ result: any }>;
          };
        };
      };
    };
    google: {
      picker: {
        PickerBuilder: any;
        DocsView: any;
        Response: any;
        Action: any;
        Feature: any;
      };
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
        };
      };
    };
    WebFont: any;
    initGapi: () => void;
  }
}
