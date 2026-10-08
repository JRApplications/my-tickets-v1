interface MentionEditorProps {
  allowMentions?: boolean;
  agents?: Agent[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  spellCheck?: boolean;
  onImagesPasted?: (files: File[]) => void;
}

interface Agent {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
}

export type { MentionEditorProps, Agent };