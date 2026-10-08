import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Search, Avatar, Text, Box, Loader } from '@wix/design-system';

import './MentionEditor.css';
import type { MentionEditorProps, Agent } from './MentionEditor.types';

// ============================================================
// MENTION EDITOR
// ============================================================

export function MentionEditor({
  allowMentions = true,
  agents = [],
  value = '',
  onChange,
  placeholder,
  disabled = false,
  isLoading = false,
  isError = false,
  spellCheck = false,
  onImagesPasted,
}: MentionEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const lastValueRef = useRef(value);

  const [containerWidth, setContainerWidth] = useState(0);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, isBottom: false });

  // ==========================================================
  // CREATE MENTION ELEMENT
  // ==========================================================

  const createMentionElement = useCallback(
    (person: Agent) => {
      const mention = document.createElement('span');

      mention.dataset.mention = 'true';
      mention.dataset.mentionId = person.id;
      mention.dataset.mentionName = person.name;
      mention.dataset.mentionTeamName = person.teamName;
      mention.dataset.mentionTeamId = person.teamId;

      mention.contentEditable = 'false';
      mention.className = 'mention-editor__mention';

      mention.textContent = person.name;

      return mention;
    },
    [],
  );

  // ==========================================================
  // GET EDITOR VALUE
  // ==========================================================

  const getEditorValue = useCallback(
    (editor: HTMLElement): string => {
      const parts: string[] = [];

      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          parts.push(node.textContent || '');
          return;
        }

        if (
          node instanceof HTMLElement &&
          node.dataset.mention === 'true'
        ) {
          const mentionData = {
            name: node.dataset.mentionName,
            id: node.dataset.mentionId,
            teamName: node.dataset.mentionTeamName,
            teamId: node.dataset.mentionTeamId,
          };
          parts.push(
            `[@${JSON.stringify(mentionData)}]`,
          );

          return;
        }

        node.childNodes.forEach(walk);
      };

      walk(editor);

      return parts.join('');
    },
    [],
  );

  // ==========================================================
  // SET EDITOR VALUE
  // ==========================================================

  const setEditorValue = useCallback(
    (
      editor: HTMLElement,
      nextValue: string,
    ) => {
      editor.innerHTML = '';

      if (!nextValue) {
        return;
      }

      const fragment = document.createDocumentFragment();

      const tokenRegex = /\[@({[^}]+})\]/g;

      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while (
        (match = tokenRegex.exec(nextValue)) !== null
      ) {
        const fullMatch = match[0];
        const jsonStr = match[1];

        let person: Agent | undefined;

        try {
          const mentionData = JSON.parse(jsonStr);
          person = agents.find(
            (agent) =>
              agent.id === mentionData.id &&
              agent.name === mentionData.name,
          );
        } catch {
          // If JSON parsing fails, ignore
        }

        if (match.index > lastIndex) {
          fragment.appendChild(
            document.createTextNode(
              nextValue.slice(
                lastIndex,
                match.index,
              ),
            ),
          );
        }

        if (person) {
          fragment.appendChild(
            createMentionElement(person),
          );
        } else {
          fragment.appendChild(
            document.createTextNode(fullMatch),
          );
        }

        lastIndex =
          match.index + fullMatch.length;
      }

      if (lastIndex < nextValue.length) {
        fragment.appendChild(
          document.createTextNode(
            nextValue.slice(lastIndex),
          ),
        );
      }

      editor.appendChild(fragment);
    },
    [agents, createMentionElement],
  );

  // ==========================================================
  // SYNC EXTERNAL VALUE
  // ==========================================================

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    if (value === lastValueRef.current) {
      return;
    }

    const currentValue = getEditorValue(editor);

    if (currentValue !== value) {
      setEditorValue(editor, value);
    }

    lastValueRef.current = value;
  }, [
    value,
    getEditorValue,
    setEditorValue,
  ]);

  // ==========================================================
  // EMIT CHANGE
  // ==========================================================

  const emitChange = useCallback(() => {
    if (disabled) {
      return;
    }

    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const nextValue = getEditorValue(editor);

    lastValueRef.current = nextValue;

    onChange?.(nextValue);
  }, [
    disabled,
    getEditorValue,
    onChange,
  ]);

  // ==========================================================
  // MEASURE PARENT WIDTH
  // ==========================================================

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const updateWidth = () => {
      setContainerWidth(
        element.getBoundingClientRect().width,
      );
    };

    updateWidth();

    const observer = new ResizeObserver(
      updateWidth,
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  // ==========================================================
  // CURRENT SELECTION
  // ==========================================================

  const getCurrentSelection = () => {
    const selection = window.getSelection();

    if (
      !selection ||
      selection.rangeCount === 0
    ) {
      return null;
    }

    const range = selection.getRangeAt(0);

    if (
      !editorRef.current ||
      !editorRef.current.contains(
        range.startContainer,
      )
    ) {
      return null;
    }

    return {
      selection,
      range,
    };
  };

  // ==========================================================
  // TEXT BEFORE CARET
  // ==========================================================

  const getTextBeforeCaret = () => {
    const current = getCurrentSelection();

    if (
      !current ||
      !editorRef.current
    ) {
      return '';
    }

    const beforeRange =
      current.range.cloneRange();

    beforeRange.selectNodeContents(
      editorRef.current,
    );

    beforeRange.setEnd(
      current.range.startContainer,
      current.range.startOffset,
    );

    return beforeRange.toString();
  };

  // ==========================================================
  // CLOSE MENU
  // ==========================================================

  const closeMenu = useCallback(() => {
    setOpen(false);
    setMentionQuery('');
    setActiveIndex(0);
  }, []);

  // ==========================================================
  // UPDATE DROPDOWN POSITION
  // ==========================================================

  const updateDropdownPosition = () => {
    if (!editorRef.current) return;

    const rect = editorRef.current.getBoundingClientRect();
    const dropdownHeight = 300; // max-height of the dropdown
    const gap = 8; // gap between editor and dropdown

    // Check if there's enough space at the top
    const spaceAtTop = rect.top - gap;
    const spaceAtBottom = window.innerHeight - rect.bottom - gap;

    const isBottom = spaceAtTop < dropdownHeight && spaceAtBottom > spaceAtTop;

    setDropdownPosition({
      top: isBottom ? rect.bottom : rect.top,
      left: rect.left,
      width: rect.width,
      isBottom,
    });
  };

  // ==========================================================
  // SEARCH RESULTS
  // ==========================================================

  const matches = open
    ? agents
      .filter((person) =>
        person.name
          .toLowerCase()
          .includes(
            mentionQuery.toLowerCase(),
          ),
      )
      .slice(0, 6)
    : [];

  // ==========================================================
  // HANDLE INPUT
  // ==========================================================

  const handleInput = () => {
    if (disabled) {
      return;
    }

    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    // Browser contentEditable can leave a <br>
    // behind when the last character is deleted.
    // Remove it so :empty works correctly.
    if (
      editor.textContent?.trim() === '' &&
      !editor.querySelector(
        '[data-mention="true"]',
      )
    ) {
      editor.innerHTML = '';
    }

    emitChange();

    if (!allowMentions) {
      closeMenu();
      return;
    }

    const text = getTextBeforeCaret();

    const match = text.match(/@([^\s@]*)$/);

    if (!match) {
      closeMenu();
      return;
    }

    // Save the current range before opening the menu
    const current = getCurrentSelection();
    if (current) {
      savedRangeRef.current = current.range.cloneRange();
    }

    setMentionQuery(match[1]);
    setActiveIndex(0);
    setOpen(true);

    // Update dropdown position
    updateDropdownPosition();
  };

  // ==========================================================
  // HANDLE FOCUS
  // ==========================================================

  const handleFocus = () => {
    if (disabled || !allowMentions) {
      return;
    }

    const text = getTextBeforeCaret();

    const match = text.match(/@([^\s@]*)$/);

    if (!match) {
      closeMenu();
      return;
    }

    // Save the current range before opening the menu
    const current = getCurrentSelection();
    if (current) {
      savedRangeRef.current = current.range.cloneRange();
    }

    setMentionQuery(match[1]);
    setActiveIndex(0);
    setOpen(true);

    // Update dropdown position
    updateDropdownPosition();
  };

  // ==========================================================
  // REMOVE @ QUERY
  // ==========================================================

  const removeAtQuery = () => {
    const current = getCurrentSelection();

    if (!current) {
      return null;
    }

    const {
      selection,
      range,
    } = current;

    const text = getTextBeforeCaret();

    const match = text.match(/@([^\s@]*)$/);

    if (!match) {
      return null;
    }

    const amount = match[0].length;

    if (
      range.startContainer.nodeType ===
      Node.TEXT_NODE
    ) {
      const node =
        range.startContainer as Text;

      const start = Math.max(
        0,
        range.startOffset - amount,
      );

      node.deleteData(
        start,
        range.startOffset - start,
      );

      const newRange =
        document.createRange();

      newRange.setStart(node, start);
      newRange.collapse(true);

      selection.removeAllRanges();
      selection.addRange(newRange);

      return newRange;
    }

    return range;
  };

  // ==========================================================
  // INSERT MENTION
  // ==========================================================

  const insertMention = (person: Agent) => {
    if (disabled) {
      return;
    }

    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    // Restore the saved range to the selection so removeAtQuery can work
    if (savedRangeRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
      }
    }

    // Remove the @query text
    let range = removeAtQuery();

    // If no range with @query, get current selection or insert at end
    if (!range) {
      const selection = window.getSelection();

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Insert at the end of the editor
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
      }
    }

    const mention =
      createMentionElement(person);

    range.insertNode(mention);

    const after =
      document.createTextNode('\u00A0');

    mention.parentNode?.insertBefore(
      after,
      mention.nextSibling,
    );

    const selection = window.getSelection();

    if (selection) {
      const newRange =
        document.createRange();

      newRange.setStart(
        after,
        after.length,
      );

      newRange.collapse(true);

      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    editor.focus();

    emitChange();

    closeMenu();

    savedRangeRef.current = null;
  };

  // ==========================================================
  // PASTE IMAGES
  // ==========================================================

  const handlePaste = (
    event: React.ClipboardEvent<HTMLDivElement>,
  ) => {
    if (disabled || !onImagesPasted) {
      return;
    }

    const images = Array.from(
      event.clipboardData.items,
    )
      .filter(
        (item) =>
          item.kind === 'file' &&
          item.type.startsWith('image/'),
      )
      .map((item) => item.getAsFile())
      .filter(
        (file): file is File => file !== null,
      );

    if (images.length === 0) {
      return;
    }

    event.preventDefault();

    onImagesPasted(images);
  };

  // ==========================================================
  // KEYBOARD
  // ==========================================================

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (disabled) {
      event.preventDefault();
      return;
    }

    if (
      open &&
      matches.length > 0
    ) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();

        setActiveIndex(
          (index) =>
            (index + 1) % matches.length,
        );

        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();

        setActiveIndex(
          (index) =>
            (index - 1 + matches.length) %
            matches.length,
        );

        return;
      }

      if (
        event.key === 'Enter' ||
        event.key === 'Tab'
      ) {
        event.preventDefault();

        insertMention(
          matches[activeIndex],
        );

        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();

        closeMenu();

        return;
      }
    }

    if (event.key === 'Backspace') {
      const current =
        getCurrentSelection();

      if (!current) {
        return;
      }

      const { range } = current;

      if (!range.collapsed) {
        return;
      }

      const container =
        range.startContainer;

      const offset = range.startOffset;

      if (
        container.nodeType ===
        Node.TEXT_NODE
      ) {
        const textNode =
          container as Text;

        if (offset === 0) {
          const previous =
            textNode.previousSibling;

          if (
            previous instanceof
            HTMLElement &&
            previous.dataset.mention ===
            'true'
          ) {
            event.preventDefault();

            previous.remove();

            emitChange();

            return;
          }
        }
      }

      if (
        container.nodeType ===
        Node.ELEMENT_NODE
      ) {
        const element =
          container as HTMLElement;

        const previous =
          element.childNodes[offset - 1];

        if (
          previous instanceof
          HTMLElement &&
          previous.dataset.mention ===
          'true'
        ) {
          event.preventDefault();

          previous.remove();

          emitChange();
        }
      }
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      ref={containerRef}
      className="mention-editor"
      style={{ position: 'relative' }}
    >
      <div
        className="mention-editor__popover-anchor"
        style={{
          width:
            containerWidth > 0
              ? `${containerWidth}px`
              : '100%',
        }}
      >
        <div
          ref={editorRef}
          contentEditable={!disabled}
          spellCheck={spellCheck}
          data-placeholder={placeholder}
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          className={[
            'mention-editor__input',
            disabled
              ? 'mention-editor__input--disabled'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      </div>

      {!disabled && open && matches.length > 0 &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: dropdownPosition.isBottom ? dropdownPosition.top : dropdownPosition.top,
              left: dropdownPosition.left,
              width: '25%',
              marginBottom: dropdownPosition.isBottom ? '0' : '8px',
              marginTop: dropdownPosition.isBottom ? '8px' : '0',
              transform: dropdownPosition.isBottom ? 'translateY(0)' : 'translateY(calc(-100% - 8px))',
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 999999,
              maxHeight: '300px',
              overflowY: 'auto',
              overflowX: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ padding: '12px', boxSizing: 'border-box' }}>
              <Search
                value={mentionQuery}
                onChange={(e) => setMentionQuery(e.target.value)}
                placeholder="Search..."
              />
            </div>

            <div style={{ boxSizing: 'border-box' }}>
              {isLoading && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '20px',
                  }}
                >
                  <Loader />
                </div>
              )}

              {isError && !isLoading && (
                <div
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: '#d9534f',
                  }}
                >
                  <Text size="small" skin="error">
                    Failed to load agents. Please try again.
                  </Text>
                </div>
              )}

              {!isLoading && !isError && matches.map((person, index) => (
                <div
                  key={person.id}
                  onClick={() => insertMention(person)}
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    backgroundColor:
                      index === activeIndex ? '#f0f0f0' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxSizing: 'border-box',
                    minWidth: 0,
                  }}
                >
                  <Avatar
                    name={person.name}
                    size="size36"
                  />
                  <Box direction="vertical">
                    <Text
                      size="medium"
                      ellipsis
                    >
                      {person.name}
                    </Text>
                    <Text
                      size="small"
                      secondary
                      ellipsis
                    >
                      {person.teamName}
                    </Text>
                  </Box>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )
      }
    </div>
  );
}