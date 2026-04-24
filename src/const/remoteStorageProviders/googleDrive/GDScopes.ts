export const GDScopePrefix = 'https://www.googleapis.com/auth/';

export const AllGDscopes = [
  'docs',
  'drive.file',
].map(scope => GDScopePrefix + scope);

export const minimalGDscopes = [
  'drive.file',
].map(scope => GDScopePrefix + scope);
