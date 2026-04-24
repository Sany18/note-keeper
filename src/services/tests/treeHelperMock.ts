import { File } from "dtos/file.model";
import { MimeTypesEnum } from "const/mimeTypes/mimeTypes.const";

export const tree = [
  new File({
    id: 'id1',
    root: true,
    name: 'root',
    parents: ['root'],
    mimeType: MimeTypesEnum.Folder,
    children: [new File({
      id: 'id2',
      name: 'child1',
      parents: ['id1'],
      mimeType: MimeTypesEnum.Folder,
      children: []
    })]
  }),
  new File({
    id: 'id3',
    root: true,
    name: 'root3',
    parents: ['root'],
    mimeType: MimeTypesEnum.Folder,
    children: [
      new File({
        id: 'id4',
        name: 'child2',
        parents: ['id3'],
        mimeType: MimeTypesEnum.Folder,
        children: []
      })
    ]
  }),
  new File({
    id: 'id5',
    root: true,
    name: 'rootFile3',
    parents: ['root'],
    mimeType: MimeTypesEnum.File,
    children: []
  })
];
