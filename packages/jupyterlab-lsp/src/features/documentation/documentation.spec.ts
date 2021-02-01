/*eslint no-irregular-whitespace: ["error", { "skipTemplates": true }]*/
import { expect } from 'chai';
import { parse_documentation, string_to_markdown } from './documentation';

const DELATTR_DOCSTRING = `
delattr(o: Any, name: Text, /) -> None

Deletes the named attribute from the given object.

delattr(x, 'y') is equivalent to \`\`del x.y''
`;

const DELATTR_BODY = `Deletes the named attribute from the given object.

delattr(x, 'y') is equivalent to \`\`del x.y''
`;

const SIGNATURES_WITH_BREAK = `
ndarray(shape, dtype=float, buffer=None, offset=0, strides=None, order=None, /)

ndarray(shape, dtype=float, buffer=None, offset=0,
        strides=None, order=None)

An array object represents a multidimensional, homogeneous array
`;

const MAP_DOCSTRING = `
map(func: Callable[[_T1], _S], iter1: Iterable[_T1], /) -> Iterator[_S]
map(func: Callable[[_T1, _T2], _S], iter1: Iterable[_T1], iter2: Iterable[_T2], /) -> Iterator[_S]
map(func: Callable[[_T1, _T2, _T3], _S], iter1: Iterable[_T1], iter2: Iterable[_T2], iter3: Iterable[_T3], /) -> Iterator[_S]
map(func: Callable[[_T1, _T2, _T3, _T4], _S], iter1: Iterable[_T1], iter2: Iterable[_T2], iter3: Iterable[_T3], iter4: Iterable[_T4], /) -> Iterator[_S]
map(func: Callable[[_T1, _T2, _T3, _T4, _T5], _S], iter1: Iterable[_T1], iter2: Iterable[_T2], iter3: Iterable[_T3], iter4: Iterable[_T4], iter5: Iterable[_T5], /) -> Iterator[_S]
map(func: Callable[..., _S], iter1: Iterable[Any], iter2: Iterable[Any], iter3: Iterable[Any], iter4: Iterable[Any], iter5: Iterable[Any], iter6: Iterable[Any], /, *iterables: Iterable[Any]) -> Iterator[_S]

map(func, *iterables) --> map object

Make an iterator that computes the function using arguments from
each of the iterables.  Stops when the shortest iterable is exhausted.
`;

const MAP_BODY = `Make an iterator that computes the function using arguments from
each of the iterables.  Stops when the shortest iterable is exhausted.
`;

const MAP_IN_BLOCK = `\`\`\`
Make an iterator that computes the function using arguments from
each of the iterables.  Stops when the shortest iterable is exhausted.
\`\`\`
`;

const MAP_COLLAPSED_SIGNATURES = `\
\`\`\`python
map(func: Callable[[_T1], _S], iter1: Iterable[_T1], /) -> Iterator[_S]
\`\`\`
<details class="lsp-signatures">
<summary>More signatures</summary>

\`\`\`python
map(func: Callable[[_T1, _T2], _S], iter1: Iterable[_T1], iter2: Iterable[_T2], /) -> Iterator[_S]
\`\`\`

\`\`\`python
map(func: Callable[[_T1, _T2, _T3], _S], iter1: Iterable[_T1], iter2: Iterable[_T2], iter3: Iterable[_T3], /) -> Iterator[_S]
\`\`\`

\`\`\`python
map(func: Callable[[_T1, _T2, _T3, _T4], _S], iter1: Iterable[_T1], iter2: Iterable[_T2], iter3: Iterable[_T3], iter4: Iterable[_T4], /) -> Iterator[_S]
\`\`\`

\`\`\`python
map(func: Callable[[_T1, _T2, _T3, _T4, _T5], _S], iter1: Iterable[_T1], iter2: Iterable[_T2], iter3: Iterable[_T3], iter4: Iterable[_T4], iter5: Iterable[_T5], /) -> Iterator[_S]
\`\`\`

\`\`\`python
map(func: Callable[..., _S], iter1: Iterable[Any], iter2: Iterable[Any], iter3: Iterable[Any], iter4: Iterable[Any], iter5: Iterable[Any], iter6: Iterable[Any], /, *iterables: Iterable[Any]) -> Iterator[_S]
\`\`\`

\`\`\`python
map(func, *iterables) --> map object
\`\`\`


</details>
`;

describe('parse_documentation', () => {
  it('does not mistakes mentions for signatures', () => {
    let delattr = parse_documentation(DELATTR_DOCSTRING, 'delattr()', 'python');
    expect(delattr.signatures).to.deep.equal([
      'delattr(o: Any, name: Text, /) -> None'
    ]);

    expect(delattr.value).to.be.equal(DELATTR_BODY);
  });

  it('extracts multiple signatures if present', () => {
    let map_result = parse_documentation(MAP_DOCSTRING, 'map()', 'python');
    expect(map_result.signatures.length).to.be.equal(7);
    expect(map_result.value).to.be.equal(MAP_BODY);
  });

  it('recognises signatures broken across lines', () => {
    let with_breaks = parse_documentation(
      SIGNATURES_WITH_BREAK,
      'ndarray()',
      'python'
    );
    expect(with_breaks.signatures.length).to.be.equal(2);
    expect(with_breaks.signatures).to.be.deep.equal([
      'ndarray(shape, dtype=float, buffer=None, offset=0, strides=None, order=None, /)',
      'ndarray(shape, dtype=float, buffer=None, offset=0, strides=None, order=None)'
    ]);
  });
});

describe('string_to_markdown', () => {
  it('converts Python ReStructuredText to Markdown', () => {
    let rst_result = string_to_markdown(
      '.. versionchanged:: 0.25.0',
      'python',
      'map()'
    );
    expect(rst_result).to.be.equal('*Changed in 0.25.0*');
  });

  it('returns obvious Markdown as-is', () => {
    let markdown_result = string_to_markdown(
      MAP_COLLAPSED_SIGNATURES,
      'python',
      'map()'
    );
    expect(markdown_result).to.be.equal(MAP_COLLAPSED_SIGNATURES);
  });

  it('wraps repeated signatures in HTML details tag', () => {
    let map_result = string_to_markdown(
      MAP_DOCSTRING,
      'python',
      'map()',
      false,
      true
    );
    expect(map_result).to.be.equal(
      MAP_COLLAPSED_SIGNATURES + '\n' + MAP_IN_BLOCK
    );
  });

  it('wraps plain text Python docstring into preformatted block', () => {
    let map_result = string_to_markdown(MAP_DOCSTRING, 'python', 'map()', true);
    expect(map_result).to.be.equal(MAP_IN_BLOCK);
  });
});
