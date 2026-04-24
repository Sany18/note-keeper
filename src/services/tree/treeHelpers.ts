import { deepClone } from "services/byJSTypes/objectHelpers.service";
import { foldersFirts } from "services/sortFiles/foldersFirst";

import { File } from "dtos/file.model";
import { MimeTypesEnum } from "const/mimeTypes/mimeTypes.const";
import { mainFolderName } from "const/remoteStorageProviders/googleDrive/mainFolderName";

export const getRootId = (tree: File[]): string => {
  return tree?.find(e => e.root)?.parents[0];
}

// Finished
export const findElementInTree = (tree: File[], id: string): File => {
  let result = null;

  tree.forEach(e => {
    if (e.id === id) {
      result = e;
    } else if (e.children) {
      const found = findElementInTree(e.children, id);
      if (found) {
        result = found;
      }
    }
  });

  return result;
};

// Finished
export const removeElementFromTree = <T>(tree: File[], id: string): File & T[] => {
  const newTree = tree.map(e => {
    if (e.id === id) {
      return null;
    } else if (e.children) {
      const newChildren = removeElementFromTree(e.children, id);
      return { ...e, children: newChildren };
    }

    return e;
  }).filter(e => e);

  return [ ...newTree ] as File & T[];
}

export const putElementInTree = (tree: File[], element: File): File[] => {
  let newTree = deepClone(tree);

  if (tree.length === 0) {
    newTree.push(element);
  } else {
    for (let elementFromTree of newTree) {
      if (elementFromTree.root && elementFromTree.parents[0] === element.parents[0]) {
        newTree.push(element);
        break;
      }

      if (elementFromTree.isFolder) {
        if (element.parents.includes(elementFromTree.id)) {
          // If folder was not initialized
          if (!elementFromTree.children) elementFromTree.children = [];

          elementFromTree.children.push(element);
          elementFromTree.children.sort(foldersFirts);
          break;
        }

        if (elementFromTree.children?.length > 0) {
          elementFromTree.children = putElementInTree(elementFromTree.children, element);
          elementFromTree.children.sort(foldersFirts);
        }
      }
    }
  }

  return newTree.sort(foldersFirts) as File[]
};

// Finished (tested)
export const appendChildToFolder = <T>(tree: File[], parentId: string, child: File, openParent?: boolean): File & T[] => {
  let newRootElement = null;

  const newTree = tree.map(e => {
    // If the parent is the root folder
    if (e.parents.includes(parentId)) {
      newRootElement = child;
      return e;
    }

    if (e.mimeType !== MimeTypesEnum.Folder) {
      return e;
    }

    if (e.id === parentId) { // Target folder. Append the child
      const newChildren = e.children ? [ ...e.children, child ].sort(foldersFirts) : [ child ];

      return { ...e, children: newChildren, folderOpen: openParent };
    } else if (e.children) { // If folder is not found, recursively search in the children
      const nestedUpdatedChildrenList = appendChildToFolder(e.children, parentId, child, openParent);
      return { ...e, children: nestedUpdatedChildrenList };
    }

    // Fallback. If folder has no children
    return e;
  });

  return [ ...newTree, newRootElement ]
    .filter(e => e)
    .sort(foldersFirts) as File & T[];
}

// Finished (need to improve)
export const updateTreeElement = (tree: File[], fileId: string, updatedFields: Partial<File>): File[] => {
  let newTree = [ ...tree ];

  const fileToUpdate = findElementInTree(newTree, fileId);

  if (!fileToUpdate) return newTree;

  const updatedFile = new File({ ...fileToUpdate, ...updatedFields });

  newTree = removeElementFromTree(newTree, updatedFile.id);
  newTree = putElementInTree(newTree, updatedFile);

  return newTree.sort(foldersFirts);
}

// Finished
export const getClosestParentFolder = (tree: File[], file: File): Partial<File> => {
  if (!tree) return null;

  const abstractRootFromTree = tree.find(e => e.root);
  const abstractRoot = {
    id: abstractRootFromTree?.parents[0] || file?.parents[0],
    name: mainFolderName,
  };

  if (!file) return abstractRoot;

  if (file.mimeType === MimeTypesEnum.Folder) {
    return file;
  } else if (file.root) {
    return abstractRoot;
  } else {
    const parent = findElementInTree(tree, file.parents[0]);

    return getClosestParentFolder(tree, parent);
  }
}

export const getQniqueFilesAndUpdateOld = (prevList: File[], newList: File[]) => {
  const newUniqueEntities: { [key: string]: File } = {};

  newList.forEach(e => newUniqueEntities[e.id] = new File(e));

  prevList.forEach(oldFile => {
    const updatedFileFromExistingList = newUniqueEntities[oldFile.id];

    if (updatedFileFromExistingList) {
      updatedFileFromExistingList.children = oldFile.children; // It will be updated if the folder is open.

      if (new Date(updatedFileFromExistingList.modifiedTime).getTime() >= new Date(oldFile.modifiedTime).getTime()) {
        updatedFileFromExistingList.folderOpen = oldFile.folderOpen;
      } else {
        newUniqueEntities[oldFile.id] = oldFile;
      }
    }
  });

  return Object.values(newUniqueEntities);
};
