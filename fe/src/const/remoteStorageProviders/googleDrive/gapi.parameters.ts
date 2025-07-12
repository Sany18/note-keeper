export const fieldsArray = ['*']; // All fields
export const fields = `files(${fieldsArray.join(',')})`;

const queries = {
  allFromRoot: `'root' in parents and trashed=false`,
  children: `'{{folderId}}' in parents and trashed=false`,
};

export const getAllFromRootParams = {
  q: queries.allFromRoot,
  fields
};

export const getChildrenParams = (folderId: string) => ({
  q: queries.children.replace('{{folderId}}', folderId),
  fields,
});
