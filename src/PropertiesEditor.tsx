import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlignLeft,
  Braces,
  Calendar,
  CalendarClock,
  CheckSquare,
  Hash,
  List,
  Plus,
  X,
} from 'lucide-react';
import { frontmatter, setProperties, tags } from './knowledge';
import {
  convertPropertyValue,
  inferPropertyType,
  propertyDraft,
  propertyTypeLabel,
  type PropertyValueType,
} from './properties';
import type { Note, PropertyType } from './types';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Checkbox } from './components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './components/ui/dropdown-menu';
import { parsePropertyDraft } from './properties';

function typeIcon(type: PropertyValueType) {
  return type === 'list'
    ? List
    : type === 'number'
      ? Hash
      : type === 'checkbox'
        ? CheckSquare
        : type === 'date'
          ? Calendar
          : type === 'datetime'
            ? CalendarClock
            : type === 'object'
              ? Braces
              : AlignLeft;
}

/** Inline, type-aware editor for the note's YAML properties. */
export function PropertiesEditor({
  note,
  notes,
  types,
  onTypeChange,
  onNoteChange,
  onError,
  ask,
}: {
  note: Note;
  notes: Note[];
  types: Record<string, PropertyType>;
  onTypeChange: (key: string, type: PropertyType | null) => void;
  onNoteChange: (path: string, content: string) => void;
  onError: (error: unknown) => void;
  ask: (title: string, value?: string, description?: string) => Promise<string | null>;
}) {
  const [menu, setMenu] = useState<string | null>(null);
  const meta = frontmatter(note.content),
    properties = meta.properties ?? {};
  const suggestions = useMemo(() => {
    const result: Record<string, string[]> = {};
    const add = (key: string, value: unknown) => {
      const list = Array.isArray(value) ? value : [value];
      for (const item of list) {
        if (item === null || item === undefined || typeof item === 'object') continue;
        const text = String(item);
        if (!text) continue;
        (result[key] ??= []).push(text);
      }
    };
    for (const entry of notes) {
      const fm = frontmatter(entry.content);
      for (const [key, value] of Object.entries(fm.properties ?? {})) add(key, value);
    }
    for (const noteTags of notes.flatMap((entry) => tags(entry.content))) add('tags', noteTags);
    for (const key of Object.keys(result)) result[key] = [...new Set(result[key])].sort();
    return result;
  }, [notes]);
  useEffect(() => {
    setMenu(null);
  }, [note.path]);
  const change = (next: Record<string, unknown>) => {
    try {
      onNoteChange(note.path, setProperties(note.content, next));
    } catch (error) {
      onError(error);
    }
  };
  const remove = (key: string) => {
    const next = { ...properties };
    delete next[key];
    change(next);
  };
  const convertTo = (key: string, type: PropertyType | 'automatic') => {
    setMenu(null);
    if (type === 'automatic') {
      onTypeChange(key, null);
      return;
    }
    onTypeChange(key, type);
    change({ ...properties, [key]: convertPropertyValue(properties[key], type) });
  };
  const addProperty = async () => {
    const key = await ask('Add property', 'property');
    if (key && !['__proto__', 'constructor', 'prototype'].includes(key) && !(key in properties))
      change({ ...properties, [key]: '' });
  };
  if (meta.error)
    return (
      <div className="inline-properties">
        <div className="property-error">Invalid YAML: fix it in source mode.</div>
      </div>
    );
  return (
    <section className="inline-properties" aria-label="Note properties">
      <div className="inline-properties-heading">Properties</div>
      {Object.entries(properties).map(([key, value]) => {
        const type = types[key] ?? inferPropertyType(value),
          Icon = typeIcon(type);
        return (
          <div className="inline-property-row" key={key}>
            <DropdownMenu
              modal={false}
              open={menu === key}
              onOpenChange={(open) =>
                setMenu((current) => (open ? key : current === key ? null : current))
              }
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Property type ${key}`}
                  title={propertyTypeLabel(type)}
                >
                  <Icon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                data-engine-property-menu=""
                aria-label={`Property type ${key}`}
                align="start"
                collisionPadding={8}
                onEscapeKeyDown={(event) => event.stopPropagation()}
              >
                <DropdownMenuRadioGroup
                  value={types[key] ?? 'automatic'}
                  onValueChange={(next) => convertTo(key, next as PropertyType | 'automatic')}
                >
                  {(
                    ['automatic', 'checkbox', 'date', 'datetime', 'list', 'number', 'text'] as const
                  ).map((option) => (
                    <DropdownMenuRadioItem key={option} value={option}>
                      {option === 'automatic' ? 'Automatic' : propertyTypeLabel(option)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="property-key" title={key}>
              {key}
            </span>
            <div className="property-value">
              <PropertyValue
                key={`${note.path}:${key}:${type}`}
                propertyKey={key}
                value={value}
                type={type}
                suggestions={suggestions[key] ?? []}
                onChange={(next) => change({ ...properties, [key]: next })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="property-remove"
              aria-label={`Remove ${key}`}
              title={`Remove ${key}`}
              onClick={() => remove(key)}
            >
              <X size={12} />
            </Button>
          </div>
        );
      })}
      <Button type="button" variant="ghost" size="sm" onClick={addProperty}>
        <Plus size={13} />
        Add property
      </Button>
    </section>
  );
}

/** One value editor; text-like values commit on blur or Enter, list edits commit immediately. */
function PropertyValue({
  propertyKey,
  value,
  type,
  suggestions,
  onChange,
}: {
  propertyKey: string;
  value: unknown;
  type: PropertyValueType;
  suggestions: string[];
  onChange: (value: unknown) => void;
}) {
  const listId = useId();
  const [draft, setDraft] = useState(() => propertyDraft(value, type));
  const [listDraft, setListDraft] = useState('');
  const [invalid, setInvalid] = useState(false);
  const badInput = useRef(false);
  const composing = useRef(false);
  useEffect(() => {
    setDraft(propertyDraft(value, type));
    setInvalid(false);
    badInput.current = false;
  }, [value, type]);
  const commit = (text = draft) => {
    if (composing.current) return;
    try {
      if (badInput.current) throw new Error('Invalid number');
      const next = parsePropertyDraft(text, type);
      setInvalid(false);
      if (!Object.is(next, value)) onChange(next);
    } catch {
      setInvalid(true);
    }
  };
  if (type === 'object')
    return (
      <code className="property-structured" title="Structured value: edit in source mode">
        {JSON.stringify(value)}
      </code>
    );
  if (type === 'checkbox')
    return (
      <label className="property-checkbox-target">
        <Checkbox
          aria-label={propertyKey}
          checked={value === true || value === 'true' || value === 1 || value === '1'}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
      </label>
    );
  if (type === 'list') {
    const items = Array.isArray(value)
      ? value
      : value === null || value === undefined || value === ''
        ? []
        : [value];
    const add = (text = listDraft) => {
      if (composing.current) return;
      const next = text.trim();
      if (!next) return;
      if (!items.map(String).includes(next)) onChange([...items, next]);
      setListDraft('');
    };
    return (
      <>
        {items.map((item, index) => (
          <Button
            key={index}
            type="button"
            variant="secondary"
            size="sm"
            className="property-list-item"
            aria-label={`Remove ${propertyKey} value ${String(item)}`}
            title={String(item)}
            onClick={() => onChange(items.filter((_item, position) => position !== index))}
          >
            <span>{String(item)}</span>
            <X />
          </Button>
        ))}
        <Input
          aria-label={propertyKey}
          list={listId}
          value={listDraft}
          placeholder="Add value"
          onChange={(event) => setListDraft(event.target.value)}
          onCompositionStart={() => (composing.current = true)}
          onCompositionEnd={(event) => {
            composing.current = false;
            if (document.activeElement !== event.currentTarget) add(event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            if (
              composing.current ||
              event.nativeEvent.isComposing ||
              event.nativeEvent.keyCode === 229
            )
              return;
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              setListDraft('');
            }
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              add();
            }
          }}
          onBlur={() => add()}
        />
        <datalist id={listId}>
          {suggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </>
    );
  }
  return (
    <>
      <Input
        aria-label={propertyKey}
        type={
          type === 'number'
            ? 'number'
            : type === 'date'
              ? 'date'
              : type === 'datetime'
                ? 'datetime-local'
                : 'text'
        }
        value={draft}
        step={type === 'number' ? 'any' : undefined}
        placeholder="Empty"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${listId}-error` : undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          badInput.current = event.target.validity.badInput;
          setInvalid(false);
        }}
        onCompositionStart={() => (composing.current = true)}
        onCompositionEnd={(event) => {
          composing.current = false;
          if (document.activeElement !== event.currentTarget) commit(event.currentTarget.value);
        }}
        onBlur={() => commit()}
        onKeyDown={(event) => {
          if (
            composing.current ||
            event.nativeEvent.isComposing ||
            event.nativeEvent.keyCode === 229
          )
            return;
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setDraft(propertyDraft(value, type));
            badInput.current = false;
            setInvalid(false);
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        }}
      />
      {invalid && (
        <span id={`${listId}-error`} role="alert" className="property-error">
          {type === 'number'
            ? 'Enter a finite number or clear the field.'
            : 'Enter a complete date or clear the field.'}
        </span>
      )}
    </>
  );
}
