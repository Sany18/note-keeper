import { atom, selector } from "recoil";

type FileToUpload = {
  file: File;
  parentId: string;
}

export const fileUploadingDefaultState = {
  filesToUpload: [] as FileToUpload[],
  failedUploads: [] as FileToUpload[],
  successfulUploads: [] as FileToUpload[],

  progress: 0,
  totalFiles: 0,
  finished: true,
  inProgress: false,

  error: null,
}

export const fileUploadingState = atom({
  key: 'fileUploadingState',
  default: fileUploadingDefaultState,
});

export const fileUploadingSelector = selector({
  key: 'fileUploadingSelector',
  get: ({ get }) => get(fileUploadingState),
  set: ({ set, get }, newState: Partial<typeof fileUploadingDefaultState>) => {
    const currentState = get(fileUploadingState);

    const nextState = {
      ...currentState,
      ...newState,
    }

    set(fileUploadingState, nextState);
  },
});
