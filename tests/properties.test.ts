import {describe,it,expect} from 'vitest';
import {convertPropertyValue,datePropertyValue,datetimePropertyValue,inferPropertyType,propertyDraft,propertyTypeLabel,readPropertyTypes} from '../src/properties';

describe('inline property value helpers',()=>{
  it('infers the YAML value type',()=>{
    expect(inferPropertyType('hello')).toBe('text');
    expect(inferPropertyType(5)).toBe('number');
    expect(inferPropertyType(false)).toBe('checkbox');
    expect(inferPropertyType('2026-08-06')).toBe('date');
    expect(inferPropertyType('2026-08-06T12:30')).toBe('datetime');
    expect(inferPropertyType(['a','b'])).toBe('list');
    expect(inferPropertyType({nested:true})).toBe('object');
  });

  it('converts values without changing text-like content',()=>{
    expect(convertPropertyValue('5','number')).toBe(5);
    expect(convertPropertyValue(5,'text')).toBe('5');
    expect(convertPropertyValue('true','checkbox')).toBe(true);
    expect(convertPropertyValue('yes','checkbox')).toBe(false);
    expect(convertPropertyValue('a','list')).toEqual(['a']);
    expect(convertPropertyValue(['a','b'],'text')).toBe('a, b');
    expect(convertPropertyValue('2026-08-06','date')).toBe('2026-08-06');
    expect(convertPropertyValue('2026-08-06T12:30','datetime')).toBe('2026-08-06T12:30');
    expect(convertPropertyValue({a:1},'text')).toBe('{"a":1}');
  });

  it('formats date and datetime input drafts',()=>{
    expect(datePropertyValue('2026-08-06T12:30:00')).toBe('2026-08-06');
    expect(datetimePropertyValue('2026-08-06T12:30:00')).toBe('2026-08-06T12:30');
    expect(propertyDraft(['a'],'list')).toBe('');
    expect(propertyDraft('x','text')).toBe('x');
  });

  it('keeps only known persisted types',()=>{
    expect(readPropertyTypes(JSON.parse('{"rating":"number","note":"text","bad":"object","worse":3,"__proto__":"list"}'))).toEqual({rating:'number',note:'text'});
    expect(readPropertyTypes(null)).toEqual({});
    expect(readPropertyTypes(['number'])).toEqual({});
  });

  it('labels types for the menu button',()=>{
    expect(propertyTypeLabel('datetime')).toBe('Date & time');
    expect(propertyTypeLabel('checkbox')).toBe('Checkbox');
  });
});
