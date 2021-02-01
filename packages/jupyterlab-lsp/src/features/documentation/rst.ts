interface IDirective {
  pattern: RegExp;
  replacement: string;
  name?: string;
}

const RST_DIRECTIVES: IDirective[] = [
  {
    pattern: /\.\. versionchanged:: (?<version>\S+)(?<end>$|\n)/g,
    replacement: '*Changed in $<version>*$<end>'
  },
  {
    pattern: /\.\. versionadded:: (?<version>\S+)(?<end>$|\n)/g,
    replacement: '*Added in $<version>*$<end>'
  },
  {
    pattern: /\.\. deprecated:: (?<version>\S+)(?<end>$|\n)/g,
    replacement: '*Deprecated since $<version>*$<end>'
  },
  {
    pattern: /\.\. warning::/g,
    replacement: '**Warning**'
  },
  {
    pattern: /\.\. seealso::(?<short_form>.*)(?<end>$|\n)/g,
    replacement: '*See also*$<short_form>$<end>'
  },
  {
    pattern: /:ref:`(?<label>[^<`]+?)\s*<(?<ref>[^>`]+?)>`/g,
    replacement: '$<label>: `$<ref>`'
  },
  {
    pattern: /`(?<label>[^<`]+?)(\n?)<(?<url>[^>`]+)>`_+/g,
    replacement: '[$<label>]($<url>)'
  },
  {
    pattern: /:mod:`(?<label>[^`]+)`/g,
    replacement: '`$<label>`'
  },
  {
    pattern: /\.\. currentmodule:: (?<module>.+)(?<end>$|\n)/g,
    replacement: ''
  },
  {
    pattern: /:math:`(?<latex>[^`]+?)`/g,
    // this will give $latex$, the second dollar is an escape character
    replacement: '$$$<latex>$$'
  },
  {
    pattern: /\.\. highlight:: (?<language>.+)(?<end>$|\n)/,
    replacement: '',
    name: 'highlight'
  },
  {
    pattern: /\.\. (code-block|productionlist)::(?<language>.*)(?<end>$|\n)/,
    replacement: '$<end>',
    name: 'code-block'
  }
];

function _find_directive_pattern(name: string) {
  return RST_DIRECTIVES.filter(directive => directive.name == name)[0].pattern;
}

const HIGHLIGHT_PATTERN = _find_directive_pattern('highlight');
const CODE_BLOCK_PATTERN = _find_directive_pattern('code-block');

const _RST_SECTIONS = [
  'Parameters',
  'Returns',
  'See Also',
  'Examples',
  'Attributes',
  'Notes',
  'References'
];

export function looks_like_rst(value: string): boolean {
  // check if any of the characteristic sections (and the properly formatted underline) is there
  for (let section of _RST_SECTIONS) {
    if (value.includes(section + '\n' + '-'.repeat(section.length) + '\n')) {
      return true;
    }
  }
  for (let directive of RST_DIRECTIVES) {
    if (value.match(directive.pattern)) {
      return true;
    }
  }
  // allow "text::" or "text ::" but not "^::$" or "^:::$"
  return !!value.match(/(\s|\w)::\n/) || value.includes('\n>>> ');
}

interface IBlockBeginning {
  /**
   * Line that does not belong to the code block and should be prepended and analysed separately
   */
  remainder: string;
}

interface IParser {
  canParse: (line: string) => boolean;
  initiateParsing: (line: string, current_language: string) => IBlockBeginning;
  canConsume: (line: string) => boolean;
  consume: (line: string) => void;
  finishConsumption: (final: boolean) => string;
  follower?: IParser;
}

abstract class BlockParser implements IParser {
  public enclosure = '```';
  protected _buffer: string[];
  protected _block_started: boolean;

  constructor() {
    this._buffer = [];
    this._block_started = false;
  }

  abstract canParse(line: string): boolean;
  /**
   * All children should call _startBlock in initiateParsing() implementation.
   */
  abstract initiateParsing(
    line: string,
    current_language: string
  ): IBlockBeginning;
  protected _startBlock(language: string) {
    this._buffer.push(this.enclosure + language);
    this._block_started = true;
  }
  abstract canConsume(line: string): boolean;

  consume(line: string) {
    if (!this._block_started) {
      throw Error('Block has not started');
    }
    this._buffer.push(line);
  }

  finishConsumption(final: boolean) {
    // if the last line is empty (e.g. a separator of intended block), discard it
    if (this._buffer[this._buffer.length - 1].trim() == '') {
      this._buffer.pop();
    }
    this._buffer.push(this.enclosure + '\n');
    let result = this._buffer.join('\n');
    if (!final) {
      result += '\n';
    }
    this._buffer = [];
    this._block_started = false;
    return result;
  }
}

abstract class IndentedBlockParser extends BlockParser {
  protected _is_block_beginning: boolean;
  protected _block_indent_size: number | null;

  constructor() {
    super();
    this._is_block_beginning = false;
  }

  protected _startBlock(language: string) {
    super._startBlock(language);
    this._block_indent_size = null;
    this._is_block_beginning = true;
  }

  canConsume(line: string): boolean {
    if (this._is_block_beginning && line.trim() == '') {
      return true;
    }
    return !!(line.length > 0 && line[0].match(/^\s/)) || line.length == 0;
  }

  consume(line: string) {
    if (this._is_block_beginning) {
      // skip the first empty line
      this._is_block_beginning = false;
      if (line.trim() == '') {
        return;
      }
    }
    if (this._block_indent_size === null) {
      this._block_indent_size = line.length - line.trimLeft().length;
    }
    super.consume(line.substr(this._block_indent_size));
  }

  finishConsumption(final: boolean): string {
    this._is_block_beginning = false;
    this._block_indent_size = null;
    return super.finishConsumption(final);
  }
}

class PythonPromptCodeBlockParser extends BlockParser {
  canParse(line: string): boolean {
    return line.startsWith('>>>');
  }

  initiateParsing(line: string, current_language: string): IBlockBeginning {
    this._startBlock('python');
    this.consume(line);
    return { remainder: '' };
  }

  canConsume(line: string): boolean {
    return line.startsWith('>>>') || line.startsWith('...');
  }

  consume(line: string) {
    super.consume(this._stripPrompt(line));
  }

  protected _stripPrompt(line: string): string {
    return line.substr(
      line.startsWith('>>> ') || line.startsWith('... ') ? 4 : 3
    );
  }

  follower = new PythonOutputBlockParser();
}

class PythonOutputBlockParser extends BlockParser {
  canConsume(line: string): boolean {
    return line.trim() != '' && !line.startsWith('>>>');
  }

  canParse(line: string): boolean {
    // cannot be initiated directly
    return false;
  }

  initiateParsing(line: string, current_language: string): IBlockBeginning {
    this._startBlock('');
    this.consume(line);
    return { remainder: '' };
  }
}

class DoubleColonBlockParser extends IndentedBlockParser {
  canParse(line: string) {
    // note: Python uses ' ::' but numpy uses just '::'
    return line.trimRight().endsWith('::');
  }
  initiateParsing(line: string, current_language: string) {
    let language = current_language;
    if (line.trim() == '.. autosummary::') {
      language = '';
      line = '';
    } else {
      line = line.replace(/::$/, '');
    }
    this._startBlock(language);
    return {
      remainder: line + '\n\n'
    };
  }
}

class MathBlockParser extends IndentedBlockParser {
  public enclosure = '$$';

  canParse(line: string) {
    return line.trim() == '.. math::';
  }
  initiateParsing(line: string, current_language: string) {
    this._startBlock('');
    return {
      remainder: ''
    };
  }
}

class ExplicitCodeBlockParser extends IndentedBlockParser {
  canParse(line: string): boolean {
    return line.match(CODE_BLOCK_PATTERN) != null;
  }

  initiateParsing(line: string, current_language: string): IBlockBeginning {
    let match = line.match(CODE_BLOCK_PATTERN);
    this._startBlock(match.groups['language'].trim() || current_language);
    return { remainder: '' };
  }
}

const BLOCK_PARSERS = [
  new PythonPromptCodeBlockParser(),
  new MathBlockParser(),
  new ExplicitCodeBlockParser(),
  new DoubleColonBlockParser()
];

export const RST_SECTIONS = new Map(
  _RST_SECTIONS.map(section => [
    section,
    '\n' + section + '\n' + '-'.repeat(section.length)
  ])
);

const NBSP_INDENT = '    ';

/**
 * Try to parse docstrings in following formats to markdown:
 *  - https://www.python.org/dev/peps/pep-0287/
 *  - https://www.python.org/dev/peps/pep-0257/
 *  - https://sphinxcontrib-napoleon.readthedocs.io/en/latest/example_numpy.html
 *
 *  It is intended to improve the UX while better the solutions at the backend
 *  are being investigated rather than provide a fully-featured implementation.
 *
 *  Supported features:
 *   - code blocks:
 *     - PEP0257 (formatting of code with highlighting, formatting of output without highlighting)
 *     - after ::
 *     - production lists,
 *     - explicit code blocks
 *   - NumPy-like list items
 *   - external links (inline only)
 *   - as subset of paragraph-level and inline directives (which must fit into a single line)
 *
 * @param text - the input docstring
 */
export function rst_to_markdown(text: string) {
  let language = 'python';
  let markdown = '';
  let active_parser: IParser = null;
  let lines_buffer: string[] = [];

  function flush_buffer() {
    let lines = lines_buffer.join('\n');
    // rst markup handling
    for (let directive of RST_DIRECTIVES) {
      lines = lines.replace(directive.pattern, directive.replacement);
    }
    for (let [section, header] of RST_SECTIONS) {
      lines = lines.replace(header, '\n#### ' + section + '\n');
    }
    lines = lines.replace(NBSP_INDENT, '    ');
    lines_buffer = [];
    return lines;
  }

  for (let line of text.split('\n')) {
    let trimmed_line = line.trimLeft();

    if (active_parser) {
      if (active_parser.canConsume(line)) {
        active_parser.consume(line);
      } else {
        markdown += flush_buffer();
        markdown += active_parser.finishConsumption(false);
        if (active_parser.follower) {
          active_parser = active_parser.follower;
          active_parser.initiateParsing(line, language);
        } else {
          active_parser = null;
        }
      }
    }
    if (!active_parser) {
      // we are not in a code block now but maybe we enter start one?
      for (let parser of BLOCK_PARSERS) {
        if (parser.canParse(line)) {
          active_parser = parser;
          let block_start = parser.initiateParsing(line, language);
          line = block_start.remainder;
          break;
        }
      }

      // ok, we are not in any code block (it may start with the next line, but this line is clear - or empty)

      // lists handling:  items detection
      let match = trimmed_line.match('^(?<argument>[^: ]+) : (?<type>.+)$');
      if (match && match.length) {
        line =
          '- `' + match.groups['argument'] + '`: ' + match.groups['type'] + '';
      }

      // change highlight language if requested
      // this should not conflict with the parsers starting above
      // as the highlight directive should be in a line of its own
      let highlight_match = line.match(HIGHLIGHT_PATTERN);
      if (highlight_match && highlight_match.groups['language'].trim() != '') {
        language = highlight_match.groups['language'].trim();
      }

      lines_buffer.push(line);
    }
  }
  markdown += flush_buffer();
  // close off the code block - if any
  if (active_parser) {
    markdown += active_parser.finishConsumption(true);
  }
  return markdown;
}
