import { looks_like_rst, rst_to_markdown } from './rst';

interface IDocumentation {
  signatures: string[];
  value: string;
  isMarkdownLike: boolean;
}

/**
 *
 */
export function parse_documentation(
  documentation: string,
  expected_signature: string,
  language: string
): IDocumentation {
  let result: IDocumentation = {
    signatures: [],
    value: '',
    isMarkdownLike: documentation.includes('```\n')
  };
  const signature_prefix = expected_signature.split('(')[0];

  let look_for_signature = true;
  let body_started = false;
  let body_lines: string[] = [];

  for (let line of documentation.split('\n')) {
    if (look_for_signature) {
      if (language == 'python') {
        // TODO: fix upstream
        // workaround for pyls bug that adds incorrect/redundant ufunc signature to hundreds of numpy functions
        if (signature_prefix != 'ufunc' && line.trim().startsWith('ufunc(')) {
          continue;
        }
        // the signature is broken across one or more lines
        if (line.match(/^\s+/)) {
          result.signatures[result.signatures.length - 1] += ' ' + line.trim();
          continue;
        }
      }
      if (line.trim().startsWith(signature_prefix)) {
        result.signatures.push(line.trim());
        continue;
      }
      if (line.trim() != '') {
        // signatures should appear near the very beginning:
        // in the first line, or in the second line if first line is empty;
        // sometimes there is a single extra new line between signatures - this is ok
        // if we are past this point, stop searching for signatures
        look_for_signature = false;
      }
    }
    // skip empty lines prior to the body start
    if (!body_started && line.trim() != '') {
      body_started = true;
    }
    if (body_started) {
      body_lines.push(line);
    }
  }
  result.value += body_lines.join('\n');

  return result;
}

/**
 * Returns markdown syntax for code
 */
function wrap_code(code: string, language: string) {
  return (
    '```' + language + '\n' + code + (code.endsWith('\n') ? '' : '\n') + '```\n'
  );
}

/**
 * A temporary workaround for servers returning plain text RST rather than markdown
 *
 * This is intended to be replaced by a proper conversion in the servers upstream;
 * in the meantime a very simple converter for Python docstrings is used.
 */
export function string_to_markdown(
  text: string,
  language: string,
  signature: string,
  skip_signatures: boolean = false,
  collapse_signatures: boolean = true
) {
  let markdown = '';

  let documentation = parse_documentation(text, signature, language);

  // if the documentation contains markdown-formatted code, we assume that it is markdown
  // (though the language server forgot to label it as such) and return as is
  if (documentation.isMarkdownLike) {
    return text;
  }

  if (!skip_signatures) {
    if (
      language == 'python' &&
      collapse_signatures &&
      documentation.signatures.length > 1
    ) {
      markdown += wrap_code(documentation.signatures[0], language);
      markdown +=
        '<details class="lsp-signatures">\n<summary>More signatures</summary>\n\n';
      for (signature of documentation.signatures.slice(1)) {
        markdown += wrap_code(signature, language) + '\n';
      }
      markdown += '\n</details>\n\n';
    } else {
      for (signature of documentation.signatures) {
        markdown += wrap_code(signature, language);
      }
    }
  }

  if (language == 'python' && looks_like_rst(documentation.value)) {
    markdown += rst_to_markdown(documentation.value);
  } else {
    // escape the text as a pre-formatted, block (without code highlighting)
    markdown += wrap_code(documentation.value, '');
  }

  return markdown;
}
