export {}

declare global {
  interface Window {
    // Minimal gapi interface - only for loading picker
    gapi: {
      load: (api: string, config?: { callback?: () => void; onerror?: () => void }) => void;
    };
    google: {
      picker: {
        // Google Picker API types
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
  }
}
