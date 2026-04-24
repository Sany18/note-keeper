import { tree } from 'services/tests/treeHelperMock';
import { testHelper } from 'services/tests/testHelpers';

import { File } from 'dtos/file.model';
import { MimeTypesEnum } from 'const/mimeTypes/mimeTypes.const';
import { appendChildToFolder, findElementInTree, putElementInTree, updateTreeElement } from './treeHelpers';

////////////////////////////////////////
// appendChildToFolder
////////////////////////////////////////
describe('appendChildToFolder', () => {
  it('should add a child to the root folder', () => {
    const newChild = new File({
      id: testHelper.getRandomId(),
    });

    const result = appendChildToFolder<File>(tree, 'id1', newChild);
    const rootFolder = result[0];

    expect(rootFolder.children).toHaveLength(2);
    expect(rootFolder.children[1].id).toBeTruthy();
    expect(rootFolder.children[1].id).toBe(testHelper.getLastId());
  });

  it('should append a child to the specified folder', () => {
    const newChild = new File({
      id: testHelper.getRandomId(),
    });

    const result = appendChildToFolder<File>(tree, 'id2', newChild);
    const parentFolder = result[0].children.find(child => child.id === 'id2');

    expect(parentFolder.children).toHaveLength(1);
    expect(parentFolder.children[0].id).toBe(testHelper.getLastId());
  });

  it('should open the parent folder if openParent is true', () => {
    const newChild = new File({
      id: testHelper.getRandomId(),
    });

    const result = appendChildToFolder<File>(tree, 'id2', newChild, true);
    const parentFolder = result[0].children.find(child => child.id === 'id2');

    expect(parentFolder.folderOpen).toBe(true);
    expect(parentFolder.children).toHaveLength(1);
  });

  it('should NOT open the parent folder if openParent is false', () => {
    const newChild = new File({});

    const result = appendChildToFolder<File>(tree, 'id2', newChild, false);
    const parentFolder = result[0].children.find(child => child.id === 'id2');

    expect(parentFolder.folderOpen).toBe(false);
    expect(parentFolder.children).toHaveLength(1);
  });

  it('should not modify the tree if the parent folder is not found', () => {
    const newChild = new File({
      parents: ['999'],
    });

    const result = appendChildToFolder<File>(tree, '999', newChild);

    expect(result).toEqual(tree);
  });
});

//////////////////////////////////////////////
// updateTreeElement
//////////////////////////////////////////////
describe('updateTreeElement', () => {
  it('should update the file', () => {
    const updatedFields = {
      id: 'id2',
      name: 'updatedName',
    };

    const result = updateTreeElement(tree, 'id2', updatedFields);
    const updatedFolder = result[0].children.find(child => child.id === 'id2');

    expect(updatedFolder.name).toBe('updatedName');
  });

  it('should move the file to child from root', () => {
    const updatedFields = {
      id: 'id3', // root element
      parents: ['id1'],
    };

    const result = updateTreeElement(tree, updatedFields.id, updatedFields);
    const updatedFolder = findElementInTree(result, 'id3');

    expect(updatedFolder.parents).toEqual(['id1']);
  });

  it('should move the file to root from child', () => {
    const updatedFields = {
      id: 'id2',
      parents: ['root'],
    };

    const result = updateTreeElement(tree, updatedFields.id, updatedFields);
    const updatedFolder = result.find(child => child.id === 'id2');

    expect(updatedFolder.parents).toEqual(['root']);
  });

  it('should move the child file to another child', () => {
    const updatedFields = {
      id: 'id4',
      parents: ['id2'],
    };

    const result = updateTreeElement(tree, updatedFields.id, updatedFields);
    const oldParent = findElementInTree(result, 'id3');
    const updatedFolder = findElementInTree(result, 'id2');
    const updatedFile = updatedFolder?.children.find(child => child.id === 'id4');

    expect(updatedFile.parents).toEqual(['id2']);
    expect(updatedFolder.children).toHaveLength(1);
    expect(updatedFile).toBeTruthy();
    expect(oldParent?.children).toHaveLength(0);
  });

  it('should update not root element', () => {
    const updatedFields = {
      id: 'id2',
      name: 'updatedName',
    }

    const result = updateTreeElement(tree, 'id2', updatedFields);
    const updatedRootFolder = findElementInTree(result, 'id2');

    expect(updatedRootFolder.name).toBe('updatedName');
  });

  it('should open not root folder', () => {
    const treeLength = tree.length;
    const updatedFields: Partial<File> = {
      id: 'id2',
      folderOpen: true
    }

    const result = updateTreeElement(tree, updatedFields.id, updatedFields);
    const updatedRootFolder = findElementInTree(result, 'id2');

    expect(result).toHaveLength(treeLength);
    expect(updatedRootFolder.folderOpen).toBe(true);
  });

  it('should not modify the tree if the file is not found', () => {
    const updatedFields = {
      id: '999',
      name: 'updatedName',
    };

    const result = updateTreeElement(tree, '999', updatedFields);

    expect(result).toEqual(tree);
  });
});

//////////////////////////////////////////////
// putElementInTree
//////////////////////////////////////////////
describe('putElementInTree', () => {
  it('should put the element in the specified folder', () => {
    const newElement = new File({
      id: testHelper.getRandomId(),
      name: 'newElement',
      parents: ['id1'],
    });

    const result = putElementInTree(tree, newElement);
    const specifiedSubTree = findElementInTree(result, 'id1');
    const newElementInTree = specifiedSubTree?.children.find(child => child.id === newElement.id);

    expect(newElementInTree).toBeTruthy();
    expect(newElementInTree.name).toBe('newElement');
  });

  it('should put the element in the root folder', () => {
    const newElement = new File({
      id: testHelper.getRandomId(),
      name: 'newElement',
      parents: ['root'],
    });

    const result = putElementInTree(tree, newElement);
    const newElementInTree = result.find(child => child.id === newElement.id);

    expect(newElementInTree).toBeTruthy();
    expect(newElementInTree.name).toBe('newElement');
  });

  it('should put folder in the specified folder', () => {
    const newElement = new File({
      id: testHelper.getRandomId(),
      name: 'newElement',
      parents: ['id2'],
      mimeType: MimeTypesEnum.Folder,
    });

    const result = putElementInTree(tree, newElement);
    const parentTree = findElementInTree(result, 'id2');
    const newElementInTree = parentTree?.children.find(child => child.id === newElement.id);

    expect(newElementInTree).toBeTruthy();
    expect(newElementInTree.name).toBe('newElement');
  });

  it('should NOT put the element into another element (if target element is not a folder)', () => {
    const newElement = new File({
      id: testHelper.getRandomId(),
      name: 'newElement',
      parents: ['id5'],
      mimeType: MimeTypesEnum.File,
    });

    const result = putElementInTree(tree, newElement);
    const parentTree = findElementInTree(result, 'id5');
    const newElementInTree = parentTree?.children.find(child => child.id === newElement.id);

    expect(newElementInTree).toBeFalsy();
  });

  it('should NOT put the element into tree if the parent folder is not found', () => {
    const newElement = new File({
      id: testHelper.getRandomId(),
      name: 'newElement',
      parents: ['999'],
    });

    const result = putElementInTree(tree, newElement);
    const newElementInTree = findElementInTree(result, newElement.id);

    expect(newElementInTree).toBeFalsy();
  });
});
