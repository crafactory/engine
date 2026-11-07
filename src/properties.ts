import type {PropertyType} from './types';

/** Types inferred from a value; structured values are read-only in the inline editor. */
export type PropertyValueType=PropertyType|'object';

/** Supported explicit types, in menu order. */
export const PROPERTY_TYPES:PropertyType[]=['text','number','checkbox','date','datetime','list'];

/** Infer a value type when no explicit vault type overrides it. */
export function inferPropertyType(value:unknown):PropertyValueType {
  if(Array.isArray(value))return 'list';
  if(typeof value==='boolean')return 'checkbox';
  if(typeof value==='number')return 'number';
  if(value instanceof Date)return 'date';
  if(value!==null&&typeof value==='object')return 'object';
  const text=String(value??'');
  if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text))return 'datetime';
  if(/^\d{4}-\d{2}-\d{2}$/.test(text))return 'date';
  return 'text';
}

/** ISO date portion for a date input. */
export function datePropertyValue(value:unknown):string {
  if(value instanceof Date)return value.toISOString().slice(0,10);
  return String(value??'').slice(0,10);
}

/** Local datetime input value without seconds or timezone. */
export function datetimePropertyValue(value:unknown):string {
  if(value instanceof Date)return value.toISOString().slice(0,16);
  return String(value??'').slice(0,16);
}

/** Initial controlled-input text for a value and type. */
export function propertyDraft(value:unknown,type:PropertyValueType):string {
  if(type==='date')return datePropertyValue(value);
  if(type==='datetime')return datetimePropertyValue(value);
  if(type==='list'||Array.isArray(value))return '';
  return String(value??'');
}

/** Convert a value to the chosen explicit type without losing text-like content. */
export function convertPropertyValue(value:unknown,type:PropertyType):unknown {
  switch(type){
    case 'list': return Array.isArray(value)?value:value===null||value===undefined||value===''?[]:[typeof value==='object'?JSON.stringify(value):String(value)];
    case 'checkbox': return value===true||value==='true'||value===1||value==='1';
    case 'number': {const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;}
    case 'date': return datePropertyValue(value)||new Date().toISOString().slice(0,10);
    case 'datetime': return datetimePropertyValue(value)||new Date().toISOString().slice(0,16);
    default: return Array.isArray(value)?value.join(', '):value instanceof Date?value.toISOString():value!==null&&typeof value==='object'?JSON.stringify(value):String(value??'');
  }
}

/** Human label for the type menu button. */
export function propertyTypeLabel(type:PropertyValueType):string {
  return type==='datetime'?'Date & time':type[0].toUpperCase()+type.slice(1);
}

/** Keep only known stored types from persisted vault state. */
export function readPropertyTypes(value:unknown):Record<string,PropertyType> {
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  const result:Record<string,PropertyType>={};
  for(const [key,type]of Object.entries(value))if(!['__proto__','constructor','prototype'].includes(key)&&PROPERTY_TYPES.includes(type as PropertyType))result[key]=type as PropertyType;
  return result;
}
