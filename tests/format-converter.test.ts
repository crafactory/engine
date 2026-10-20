import {describe,it,expect} from 'vitest';
import {MarkdownConverter, formatConverterPlugin, createFormatConverterRuntime, FORMAT_CONVERTER_CONTRACT} from '../src/services';
import {Kernel} from '../src/kernel';

describe('format converter service', () => {
  it('converts highlight tags and same-vault Markdown links', () => {
    const converter = new MarkdownConverter();
    expect(converter.convert('a <mark>hot</mark> b')).toBe('a ==hot== b');
    expect(converter.convert('See [Other note](Notes/Other.md).')).toBe('See [[Notes/Other|Other note]].');
    expect(converter.convert('<mark>one</mark> and [Two](Two.md)')).toBe('==one== and [[Two|Two]]');
  });
  it('leaves external links and non-Markdown targets untouched', () => {
    const converter = new MarkdownConverter();
    expect(converter.convert('[Site](https://example.com/a.md)')).toBe('[Site](https://example.com/a.md)');
    expect(converter.convert('[Image](image.png)')).toBe('[Image](image.png)');
    expect(converter.convert('plain text')).toBe('plain text');
  });
  it('resolves the contract from a runtime and serves a consumer', async () => {
    const runtime = await createFormatConverterRuntime();
    expect(runtime.kernel.diagnostics).toEqual([]);
    expect(runtime.kernel.runtime.services.resolve(FORMAT_CONVERTER_CONTRACT).ok).toBe(true);
    expect(runtime.service.convert('<mark>x</mark>')).toBe('==x==');
    let converted = '';
    const kernel = new Kernel({engineVersion: '1.0.0'});
    kernel.register(formatConverterPlugin(new MarkdownConverter()));
    kernel.register({manifest: {id: 'engine.probe', name: 'Probe', version: '1.0.0', consumes: [{contract: FORMAT_CONVERTER_CONTRACT}]}, setup(context) { converted = context.service<MarkdownConverter>(FORMAT_CONVERTER_CONTRACT).convert('[A](A.md)'); }});
    await kernel.start();
    expect(converted).toBe('[[A|A]]');
  });
});
