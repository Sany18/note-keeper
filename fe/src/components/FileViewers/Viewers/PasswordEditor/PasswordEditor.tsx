import { useGoogleAuth } from "reactHooks/gis/googleAuth.hook";
import { useActiveFile } from "reactHooks/fileManager/activeFile/activeFile.hook";
import { useFileSaveService } from "reactHooks/file-save-service";
import { useCallback, useEffect, useRef, useState } from "react";

import { log } from "services/log/log.service";
import { keyCodes } from "services/keyboardEvents/keyCodes.const";

import "./PasswordEditor.css";
import { appEvents } from "state/events";
import { Icon } from "components/Atoms/Icon/Icon";

type Props = {};
type ParsedPassword = {
  name: string;
  password: string;
  updatedAt: string;
}

const PasswordEditor: React.FC<Props> = () => {
  const { saveLocallyDebounced, saveFileToGD } = useFileSaveService();
  const { activeFileInfo, setActiveFileInfo, activeFileContent } = useActiveFile();

  const [parsedPasswords, setParsedPasswords] = useState<ParsedPassword[]>([]);

  // Use string for editorContentRef to store JSON string
  const editorContentRef = useRef<string>("");

  const newNameRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);

  const { currentUser } = useGoogleAuth();

  const content = () => editorContentRef.current;

  // Parse JSON content to password array
  const parsePasswords = useCallback((content: string) => {
    try {
      let parsed: any[] = JSON.parse(content || "[]");
      // Ensure backward compatibility for entries without updatedAt
      parsed = parsed.map(item => ({
        ...item,
        updatedAt: item.updatedAt || new Date().toISOString()
      }));
      setParsedPasswords(Array.isArray(parsed) ? parsed : []);
    } catch {
      setParsedPasswords([]);
    }
  }, []);

  // Save JSON string to file and update state
  const onFileUpdateHandler = useCallback(() => {
    saveLocallyDebounced(content());

    const { isFileSavedToRemoteStorage, isFileSavedLocaly, isFileChangedLocaly } = activeFileInfo;
    if (isFileSavedToRemoteStorage || isFileSavedLocaly || !isFileChangedLocaly) {
      setActiveFileInfo({
        isFileSavedToRemoteStorage: false,
        isFileSavedLocaly: false,
        isFileChangedLocaly: true,
      });
    }
  }, [activeFileInfo, setActiveFileInfo, saveLocallyDebounced, content]);

  // Add a new password entry and update JSON content
  const addPassword = useCallback((name: string, password: string) => {
    if (!name || !password) return;

    const newPassword = { name: name.trim(), password: password.trim(), updatedAt: new Date().toISOString() };
    const newPasswords = [newPassword, ...parsedPasswords];
    setParsedPasswords(newPasswords);

    const newContent = JSON.stringify(newPasswords, null, 2);
    editorContentRef.current = newContent;

    // Clear input fields after adding
    if (newNameRef.current) newNameRef.current.value = '';
    if (newPasswordRef.current) newPasswordRef.current.value = '';

    onFileUpdateHandler();
  }, [parsedPasswords, onFileUpdateHandler]);

  const onKeydown = useCallback((e: KeyboardEvent) => {
    const isCtrl = e.ctrlKey || e.metaKey;

    // Ctrl + S | Save document
    if (isCtrl && e.code === keyCodes.s) {
      e.preventDefault();
      saveFileToGD(content());
      return;
    }
  }, [saveFileToGD, content]);

  // Update only if user opens file from explorer
  useEffect(() => {
    if (!activeFileInfo.isFileDownloadingFromRemoteStorage && activeFileInfo.changeFileInView) {
      log.appEvent("FileViewer: File loaded. File name:", activeFileInfo.fileInfoFromRemoteStorage?.name);

      editorContentRef.current = activeFileContent;
      parsePasswords(editorContentRef.current);

      setActiveFileInfo({ changeFileInView: false });
    }
  }, [activeFileInfo.changeFileInView, setActiveFileInfo, activeFileInfo.isFileDownloadingFromRemoteStorage, activeFileInfo.fileInfoFromRemoteStorage, activeFileContent, parsePasswords]);

  useEffect(() => {
    const onSave = () => {
      if (!activeFileInfo) return;
      saveFileToGD(content());
    }

    appEvents.onSaveToGoogleDrive.on(onSave);

    return () => {
      appEvents.onSaveToGoogleDrive.off(onSave);
    }
  }, [activeFileInfo, saveFileToGD, content]);

  useEffect(() => {
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('keydown', onKeydown);
    }
  }, [onKeydown]);

  const [showPassword, setShowPassword] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Edit password handler
  const startEdit = (index: number) => {
    setEditIndex(index);
    setEditName(parsedPasswords[index].name);
    setEditPassword(parsedPasswords[index].password);
  };

  const saveEdit = () => {
    if (editIndex === null) return;
    const updated = [...parsedPasswords];
    updated[editIndex] = {
      ...updated[editIndex],
      name: editName,
      password: editPassword,
      updatedAt: new Date().toISOString()
    };
    setParsedPasswords(updated);
    editorContentRef.current = JSON.stringify(updated, null, 2);
    setEditIndex(null);
    setEditName('');
    setEditPassword('');
    onFileUpdateHandler();
  };

  // Delete password handler
  const deletePassword = () => {
    if (editIndex === null) return;
    const updated = parsedPasswords.filter((_, idx) => idx !== editIndex);
    setParsedPasswords(updated);
    editorContentRef.current = JSON.stringify(updated, null, 2);
    setEditIndex(null);
    setEditName('');
    setEditPassword('');
    onFileUpdateHandler();
  };

  // Copy password to clipboard
  const copyToClipboard = (password: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(password);
    } else {
      // fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = password;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className={`PasswordEditor__wrapper ${currentUser?.loggedIn && !activeFileInfo?.isFileDownloadingFromRemoteStorage && "view"}`}>
      <div className='new-password'>
        <input type="text" placeholder="Name" ref={newNameRef} />

        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          ref={newPasswordRef}/>

        <button
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword(v => !v)}>
          <Icon>{showPassword ? "visibility_off" : "visibility"}</Icon>
        </button>

        <button onClick={() => addPassword(newNameRef.current?.value, newPasswordRef.current?.value)}>
          Add Password
        </button>
      </div>

      <div className='saved-password'>
        {parsedPasswords.map((item, index) => (
          <div
            key={index}
            className="password-entry"
            onClick={() => editIndex === index ? undefined : copyToClipboard(item.password)}
            style={{ cursor: editIndex === index ? 'default' : 'pointer' }}
          >
            {editIndex === index ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}/>
                <input
                  type={showPassword ? "text" : "password"}
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}/>
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(v => !v)}>
                  <Icon>{showPassword ? "visibility_off" : "visibility"}</Icon>
                </button>
                <button onClick={saveEdit}>Save</button>
                <button onClick={() => setEditIndex(null)}>Cancel</button>
                <button onClick={deletePassword} style={{ color: 'red' }}>Delete</button>
              </>
            ) : (
              <>
                <button
                  title="Edit"
                  className="toggle-password-visibility"
                  onClick={e => { e.stopPropagation(); startEdit(index); }}>
                  <Icon>edit</Icon>
                </button>
                <span className="updated-at">
                  {new Date(item.updatedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                <strong>{item.name}:</strong>
                <div className='view-password'>{item.password}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PasswordEditor;
