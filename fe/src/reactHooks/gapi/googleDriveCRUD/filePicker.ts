import { GDPickerFile } from "dtos/googleDrive/GDPickerFile.dto";

export const openPickerForFile = async (fileName?: string): Promise<GDPickerFile[] | null> => {
  const views = new window.google.picker.DocsView()
    .setParent('root')
    .setQuery(fileName)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true);

  return new Promise((resolve, reject) => {
    const callback = data => {
      if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
        resolve(data.docs.map((file: GDPickerFile) => new GDPickerFile(file)));
      };

      if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.CANCEL) {
        reject(null);
      }
    };

    new window.google.picker.PickerBuilder()
      .addView(views)
      .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
      .setOAuthToken(window.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token)
      .setDeveloperKey(import.meta.env.VITE_GOOGLE_WEB_API_KEY)
      .setAppId(import.meta.env.VITE_GOOGLE_CLIENT_ID)
      .setCallback(callback)
      .build()
      .setVisible(true);
  });
};
