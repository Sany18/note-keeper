import { symbols } from "services/keyboardEvents/symbols.const";

/**
 * Handle tab insertion
 */
export function handleTabInsertion(
  e: KeyboardEvent,
  textarea: HTMLTextAreaElement
): void {
  // Prevent default Tab behavior (focus shift)
  e.preventDefault();

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  // Insert tab character using execCommand to preserve undo/redo
  insertTextAtPosition(textarea, start, symbols.tab);

  // Position cursor after the inserted tab
  textarea.setSelectionRange(start + symbols.tab.length, start + symbols.tab.length);
}

/**
 * Handle indent (tab right) or outdent (tab left) for selected lines or the current line
 * @param e Keyboard event
 * @param textarea The text area element
 * @param isOutdent If true, removes a tab; if false, adds a tab
 */
export function handleIndentation(
  e: KeyboardEvent,
  textarea: HTMLTextAreaElement,
  isOutdent: boolean = false
): void {
  // No default behavior for Ctrl + [ or ], so no need for e.preventDefault()
  const text = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  // Check if text is selected
  const hasSelection = start !== end;

  if (hasSelection) {
    // Handle indentation/outdentation for all selected lines
    const firstLineStart = getLineStart(textarea, start); // Use start for first line
    const lastLineEnd = getLineEnd(textarea, end);       // Use end for last line
    const selectedText = text.slice(firstLineStart, lastLineEnd);
    const lines = selectedText.split(symbols.line);

    if (isOutdent) {
      // Outdent: Remove a tab from the start of each line (if present)
      const newLines = lines.map((line) => {
        if (line.startsWith(symbols.tab)) {
          return line.slice(1); // Remove the tab
        }
        return line;
      });

      const newText = newLines.join(symbols.line);
      replaceSelectedText(textarea, firstLineStart, lastLineEnd, newText);

      // Adjust cursor selection
      const newStart = firstLineStart;
      const newEnd = firstLineStart + newText.length;
      textarea.setSelectionRange(newStart, newEnd);
    } else {
      // Indent: Add a tab to the start of each line
      const newLines = lines.map((line) => symbols.tab + line);
      const newText = newLines.join(symbols.line);

      replaceSelectedText(textarea, firstLineStart, lastLineEnd, newText);

      // Adjust cursor selection
      const newStart = firstLineStart;
      const newEnd = firstLineStart + newText.length;
      textarea.setSelectionRange(newStart, newEnd);
    }
  } else {
    // Handle indentation/outdentation for the current line only
    const lineStart = getLineStart(textarea, start);

    if (isOutdent) {
      // Check if the line starts with a tab to remove
      if (text[lineStart] === symbols.tab) {
        // Remove the tab using execCommand
        textarea.setSelectionRange(lineStart, lineStart + 1);
        document.execCommand('delete', false);

        // Adjust cursor position
        const newPosition = Math.max(start - 1, lineStart);
        textarea.setSelectionRange(newPosition, newPosition);
      }
    } else {
      // Insert a tab at the beginning of the line using execCommand
      insertTextAtPosition(textarea, lineStart, symbols.tab);

      // Adjust cursor position
      const newPosition = start + symbols.tab.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }
  }
}

/**
 * Handle new line insertion
 */
export function handleNewLine(
  e: KeyboardEvent,
  textarea: HTMLTextAreaElement,
  addLineOverCurrent = false
): void {
  if (addLineOverCurrent) {
    // Find the start of the current line
    const lineStart = getLineStart(textarea);

    // Insert a new line before the current line using execCommand
    insertTextAtPosition(textarea, lineStart, symbols.line);

    // Position cursor at the beginning of the new line
    const newCursorPos = lineStart + symbols.line.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  } else {
    // Find the end of the current line
    const lineEnd = getLineEnd(textarea);

    // Insert a new line after the current line using execCommand
    insertTextAtPosition(textarea, lineEnd, symbols.line);

    // Position cursor at the beginning of the new line
    const newCursorPos = lineEnd + symbols.line.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  }
}

//////////////////////////////////////////////
// Utils
function getLineStart(textarea: HTMLTextAreaElement, position: number = textarea.selectionStart): number {
  let lineStart = position;

  while (lineStart > 0 && textarea.value[lineStart - 1] !== symbols.line) {
    lineStart--;
  }

  return lineStart;
}

function getLineEnd(textarea: HTMLTextAreaElement, position: number = textarea.selectionEnd): number {
  let lineEnd = position;

  while (lineEnd < textarea.value.length && textarea.value[lineEnd] !== symbols.line) {
    lineEnd++;
  }

  return lineEnd;
}

/**
 * Insert text at a specific position while preserving undo/redo history
 */
function insertTextAtPosition(textarea: HTMLTextAreaElement, position: number, text: string): void {
  const originalStart = textarea.selectionStart;
  const originalEnd = textarea.selectionEnd;

  // Move cursor to the desired position
  textarea.setSelectionRange(position, position);

  // Use document.execCommand('insertText') to insert the text
  const success = document.execCommand('insertText', false, text);

  if (!success) {
    // Fallback: Manually insert text (may break undo/redo in some browsers)
    console.warn('document.execCommand("insertText") failed. Undo/redo history may be affected.');
    const currentValue = textarea.value;
    textarea.value = currentValue.slice(0, position) + text + currentValue.slice(position);
    textarea.setSelectionRange(position + text.length, position + text.length);
  }

  // Restore original selection (if needed)
  if (originalStart !== position || originalEnd !== position) {
    textarea.setSelectionRange(originalStart + text.length, originalEnd + text.length);
  }
}

/**
 * Replace selected text while preserving undo/redo history
 */
function replaceSelectedText(
  textarea: HTMLTextAreaElement,
  start: number,
  end: number,
  newText: string
): void {
  textarea.setSelectionRange(start, end);
  const success = document.execCommand('insertText', false, newText);

  if (!success) {
    console.warn('document.execCommand("insertText") failed. Undo/redo history may be affected.');
    const currentValue = textarea.value;
    textarea.value = currentValue.slice(0, start) + newText + currentValue.slice(end);
  }
}