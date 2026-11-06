/** Preserve both claims rather than silently choosing a license on conflicting metadata. */
export function licenseClaims(declared,text){
  if(declared==='ISC'&&/MIT License|Permission is hereby granted, free of charge/i.test(text)){
    return 'Conflicting license claims: package metadata declares ISC, but the included license text contains MIT terms. Both claims are preserved; neither is identified here as authoritative. Publisher clarification is outstanding; no external issue or contact has been initiated.';
  }
  return '';
}
