import { Box, Button, Card, Checkbox, Dropdown, FormField, IconButton, Input, Text } from '@wix/design-system';
import { Add, ChevronDown, ChevronUp, Delete } from '@wix/wix-ui-icons-common';
import type { OfflineField, OfflineFormSchema } from './chat-component-embed-script-config.types';
import { buildThemeVars } from './utils/theme';

const fieldTypes = [
  { id: 'text', value: 'Text' },
  { id: 'email', value: 'Email' },
  { id: 'phone', value: 'Phone' },
  { id: 'textarea', value: 'Long text' },
  { id: 'select', value: 'Dropdown' },
  { id: 'checkbox', value: 'Checkbox' },
];

const makeId = () => `offline-${Math.random().toString(36).slice(2, 9)}`;

export const defaultOfflineForm: OfflineFormSchema = {
  title: 'Leave us a message',
  submitButtonText: 'Send Message',
  fields: [
    { id: 'name', type: 'text', label: 'Your Name', placeholder: 'Enter your name', required: true },
    { id: 'email', type: 'email', label: 'Email Address', placeholder: 'Enter your email', required: true },
    { id: 'message', type: 'textarea', label: 'Message', placeholder: 'Type your message here...', required: true },
  ],
};

interface Props {
  schema: OfflineFormSchema;
  onChange: (schema: OfflineFormSchema) => void;
}

export function OfflineFormBuilder({ schema, onChange }: Props) {
  const updateField = (id: string, patch: Partial<OfflineField>) => onChange({
    ...schema,
    fields: schema.fields.map((field) => field.id === id ? { ...field, ...patch } : field),
  });
  const moveField = (id: string, direction: -1 | 1) => {
    const index = schema.fields.findIndex((field) => field.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= schema.fields.length) return;
    const fields = [...schema.fields];
    [fields[index], fields[target]] = [fields[target], fields[index]];
    onChange({ ...schema, fields });
  };

  return (
    <Box direction="vertical" gap="16px">
      <Text secondary size="small">Build the form visitors see when your team is offline.</Text>
      <FormField label="Form title"><Input value={schema.title} onChange={(e) => onChange({ ...schema, title: e.target.value })} /></FormField>
      <FormField label="Submit button text"><Input value={schema.submitButtonText} onChange={(e) => onChange({ ...schema, submitButtonText: e.target.value })} /></FormField>
      {schema.fields.map((field, index) => (
        <Card key={field.id}>
          <Card.Header title={field.label || 'New field'} suffix={<Box gap="4px">
            <IconButton size="small" skin="inverted" disabled={index === 0} onClick={() => moveField(field.id, -1)}><ChevronUp /></IconButton>
            <IconButton size="small" skin="inverted" disabled={index === schema.fields.length - 1} onClick={() => moveField(field.id, 1)}><ChevronDown /></IconButton>
            <IconButton size="small" skin="inverted" onClick={() => onChange({ ...schema, fields: schema.fields.filter((item) => item.id !== field.id) })}><Delete /></IconButton>
          </Box>} />
          <Card.Content>
            <Box direction="vertical" gap="12px">
              <FormField label="Field type"><Dropdown selectedId={field.type} options={fieldTypes} onSelect={(option) => updateField(field.id, { type: option.id as OfflineField['type'], options: option.id === 'select' ? (field.options?.length ? field.options : [{ label: 'Option 1', value: 'option-1' }]) : [] })} /></FormField>
              <FormField label="Label"><Input value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} /></FormField>
              {field.type !== 'checkbox' && <FormField label="Placeholder"><Input value={field.placeholder ?? ''} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} /></FormField>}
              <Checkbox checked={Boolean(field.required)} onChange={(e) => updateField(field.id, { required: e.target.checked })}>Required field</Checkbox>
              {field.type === 'select' && <>
                <Text size="small" weight="normal">Dropdown options</Text>
                {(field.options ?? []).map((option, optionIndex) => <Box key={`${field.id}-${optionIndex}`} gap="8px">
                  <Input value={option.label} onChange={(e) => updateField(field.id, { options: (field.options ?? []).map((item, i) => i === optionIndex ? { label: e.target.value, value: e.target.value.toLowerCase().trim().replace(/\s+/g, '-') } : item) })} />
                  <IconButton size="small" skin="inverted" onClick={() => updateField(field.id, { options: (field.options ?? []).filter((_, i) => i !== optionIndex) })}><Delete /></IconButton>
                </Box>)}
                <Button size="small" skin="inverted" prefixIcon={<Add />} onClick={() => updateField(field.id, { options: [...(field.options ?? []), { label: `Option ${(field.options?.length ?? 0) + 1}`, value: makeId() }] })}>Add option</Button>
              </>}
            </Box>
          </Card.Content>
        </Card>
      ))}
      <Button skin="inverted" prefixIcon={<Add />} onClick={() => {
        const field: OfflineField = { id: makeId(), type: 'text', label: 'New field', placeholder: '', required: false };
        onChange({ ...schema, fields: [...schema.fields, field] });
      }}>Add field</Button>
    </Box>
  );
}

export function OfflineFormPreview({ schema, theme }: { schema: OfflineFormSchema; theme: Record<string, any> }) {
  const primary = theme.primary ?? '#4f46e5';
  const themeVars = buildThemeVars(theme, 380, 620) as React.CSSProperties;
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    height: 64,
    background: 'var(--cw-primary)',
    flexShrink: 0,
  };
  const previewFieldDefaults: OfflineField[] = [
    { id: 'name', type: 'text', label: 'Your Name', placeholder: 'Enter your name', required: true },
    { id: 'email', type: 'email', label: 'Email Address', placeholder: 'Enter your email', required: true },
    { id: 'message', type: 'textarea', label: 'Message', placeholder: 'Type your message here...', required: true },
  ];
  const previewFields = previewFieldDefaults.map((defaultField) => schema.fields.find((field) => field.id === defaultField.id) ?? defaultField);

  return <div style={{ ...themeVars, width: 380, height: 620, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--cw-surface)', borderRadius: 'var(--cw-border-radius)', boxShadow: 'var(--cw-shadow)', fontFamily: 'var(--cw-font-family)', fontSize: 'var(--cw-font-size)', color: 'var(--cw-agent-text)' }}>
    <header style={headerStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--cw-header-text)' }}>Chat with us</span>
          <span style={{ fontSize: 12, opacity: 0.85, color: 'var(--cw-header-text)' }}>We usually reply within a few minutes</span>
        </div>
        <button style={{ background: 'none', border: 'none', color: 'var(--cw-header-text)', cursor: 'default', display: 'flex', alignItems: 'center', padding: 6, borderRadius: '50%' }} tabIndex={-1}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>
    <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: 16 }}>
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, padding: '12px 8px 16px' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: `color-mix(in srgb, ${primary} 10%, transparent)`, color: primary, display: 'grid', placeItems: 'center', fontSize: 24 }} aria-hidden="true">♡</div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>We're currently offline</div>
        <div style={{ maxWidth: 280, color: theme.systemText ?? '#6b7280', fontSize: 13, lineHeight: 1.6 }}>Please leave us a message and we'll get back to you as soon as possible.</div>
      </div>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>{schema.title}</div>
      {previewFields.map((field) => <div key={field.id} style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 5 }}>{field.label}{field.required && ' *'}</label>
        {field.id === 'message'
          ? <textarea readOnly placeholder={field.placeholder} style={{ ...previewInput(theme), height: 58, fontFamily: 'inherit' }} />
          : <input readOnly type={field.id === 'email' ? 'email' : 'text'} placeholder={field.placeholder} style={{ ...previewInput(theme), fontFamily: 'inherit' }} />}
      </div>)}
      <button style={{ width: '100%', padding: 10, border: 0, borderRadius: theme.buttonRadius ?? 8, background: primary, color: '#fff', font: 'inherit', fontWeight: 600 }}>{schema.submitButtonText}</button>
      </div>
    </div>
  </div>;
}

function previewInput(theme: Record<string, any>): React.CSSProperties {
  return { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: `1px solid ${theme.inputBorder ?? '#d1d5db'}`, borderRadius: theme.buttonRadius ?? 6, background: theme.inputBackground ?? '#fff', fontFamily: 'inherit', fontSize: 14 };
}
