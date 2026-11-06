import {it,expect} from 'vitest';
import ts from 'typescript';
import path from 'node:path';

it('native acceptance has no unresolved lexical names after driver refactors',()=>{
  const file=path.resolve('scripts/android-acceptance.mjs');
  const program=ts.createProgram([file],{
    allowJs:true,checkJs:true,noEmit:true,skipLibCheck:true,noImplicitAny:false,
    target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,
    moduleResolution:ts.ModuleResolutionKind.NodeNext,types:['node']
  });
  const unresolved=ts.getPreEmitDiagnostics(program).filter(diagnostic=>
    diagnostic.file?.fileName===file&&[2304,2552,18004].includes(diagnostic.code));
  expect(unresolved.map(diagnostic=>ts.flattenDiagnosticMessageText(diagnostic.messageText,' '))).toEqual([]);
},20000);
