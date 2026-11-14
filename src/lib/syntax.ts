// Shiki-style C# colouring for dump.cs declarations and signatures. Pure; never throws.

export type TokenKind = '' | 'kw' | 'type' | 'name' | 'num' | 'str' | 'com';
export type Token = [kind: TokenKind, text: string];

const KW = new Set(('public private protected internal static readonly const sealed abstract virtual override extern unsafe volatile new event ' +
  'class struct enum interface delegate record in out ref params this base void bool byte sbyte char decimal double float int uint nint nuint ' +
  'long ulong short ushort object string dynamic null true false where get set init add remove operator implicit explicit fixed async').split(' '));

// Whitespace, comment, identifier, number, string/char literal, or any other single character: together they cover every input.
const TOKEN = /\s+|\/\*[\s\S]*?(?:\*\/|$)|\/\/.*|[A-Za-z_@]\w*|\d[\w.]*|"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|[^\s\w"'@]/g;
const isIdent = (p: string) => /^[A-Za-z_@]/.test(p);
// IL2CPP also emits names that start with a digit, e.g. the hash-named fields of <PrivateImplementationDetails>.
const isName = (p: string) => isIdent(p) || /^\d\w*[A-Za-z_]/.test(p);

function kindOf(p: string): TokenKind {
  if (p.startsWith('/*') || p.startsWith('//')) return 'com';
  if (KW.has(p)) return 'kw';
  if (isIdent(p)) return /^@?[A-Z]/.test(p) ? 'type' : '';
  if (/^\d/.test(p)) return 'num';
  if (/^["']/.test(p)) return 'str';
  return '';
}

// Tokens whose texts joined give back `s`.
export function tokenize(s: string): Token[] {
  try {
    const parts = s.match(TOKEN) ?? [];
    if (parts.join('') !== s) return [['', s]];
    const kinds = parts.map(kindOf);

    // The declared name: the word after class/struct/enum/interface, else the last name (outside <...> and [...])
    // before the first ( { ; or a spaced " = " (a bare "=" can sit inside a type name: __StaticArrayInitTypeSize=32).
    let name = -1;
    const decl = parts.findIndex(p => p === 'class' || p === 'struct' || p === 'enum' || p === 'interface');
    if (decl >= 0) name = parts.findIndex((p, j) => j > decl && isIdent(p));
    else {
      let end = parts.findIndex((p, j) => p === '(' || p === '{' || p === ';' || (p === '=' && /^\s/.test(parts[j - 1] ?? '')));
      if (end < 0) end = parts.length;
      for (let j = end - 1, depth = 0; j >= 0; j--) {
        const p = parts[j];
        if (p === '>' || p === ']') depth++;
        else if (p === '<' || p === '[') depth--;
        else if (depth === 0 && kinds[j] !== 'com' && isName(p)) { name = j; break; }
      }
    }
    if (name >= 0) kinds[name] = 'name';
    return parts.map((p, j): Token => [kinds[j], p]);
  } catch {
    return [['', s]];
  }
}
