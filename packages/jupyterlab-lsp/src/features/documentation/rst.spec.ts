/*eslint no-irregular-whitespace: ["error", { "skipTemplates": true }]*/
import { expect } from 'chai';
import { looks_like_rst, rst_to_markdown } from './rst';

const SEE_ALSO = `
See Also
--------
DataFrame.from_records : Constructor from tuples, also record arrays.
read_table : Read general delimited file into DataFrame.
read_clipboard : Read text from clipboard into DataFrame.
`;

const SEE_ALSO_MARKDOWN = `
#### See Also

- \`DataFrame.from_records\`: Constructor from tuples, also record arrays.
- \`read_table\`: Read general delimited file into DataFrame.
- \`read_clipboard\`: Read text from clipboard into DataFrame.
`;

const CODE_MULTI_LINE_CODE_OUTPUT = `
To enforce a single dtype:

>>> df = pd.DataFrame(data=d, dtype=np.int8)
>>> df.dtypes
col1    int8
col2    int8
dtype: object

Constructing DataFrame from numpy ndarray:

>>> df2 = pd.DataFrame(np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]]),
...                    columns=['a', 'b', 'c'])
>>> df2
   a  b  c
0  1  2  3
1  4  5  6
2  7  8  9
`;

const CODE_MULTI_LINE_CODE_OUTPUT_MARKDOWN = `
To enforce a single dtype:

\`\`\`python
df = pd.DataFrame(data=d, dtype=np.int8)
df.dtypes
\`\`\`

\`\`\`
col1    int8
col2    int8
dtype: object
\`\`\`


Constructing DataFrame from numpy ndarray:

\`\`\`python
df2 = pd.DataFrame(np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]]),
                   columns=['a', 'b', 'c'])
df2
\`\`\`

\`\`\`
   a  b  c
0  1  2  3
1  4  5  6
2  7  8  9
\`\`\`

`;

const RST_LINK_EXAMPLE = `To learn more about the frequency strings, please see \`this link
<https://pandas.pydata.org/pandas-docs/stable/user_guide/timeseries.html#offset-aliases>\`__.`;
const RST_LINK_EXAMPLE_MARKDOWN = `To learn more about the frequency strings, please see [this link](https://pandas.pydata.org/pandas-docs/stable/user_guide/timeseries.html#offset-aliases).`;
(':ref:`here <timeseries.offset_aliases>`');
const RST_REF_EXAMPLE = `See :ref:\`here <timeseries.offset_aliases>\` for a list of frequency aliases.`;
const RST_REF_MARKDOWN = `See here: \`timeseries.offset_aliases\` for a list of frequency aliases.`;

const RST_PRODUCTION_LIST_EXAMPLE = `
A function definition defines a user-defined function object:

.. productionlist:: python-grammar
   funcdef: [\`decorators\`] "def" \`funcname\` "(" [\`parameter_list\`] ")"
          : ["->" \`expression\`] ":" \`suite\`
   decorators: \`decorator\`+
   defparameter: \`parameter\` ["=" \`expression\`]
   funcname: \`identifier\`

A function definition is an executable statement.
`;

const RST_PRODUCTION_LIST_EXAMPLE_MARKDOWN = `
A function definition defines a user-defined function object:

\`\`\`python-grammar
funcdef: [\`decorators\`] "def" \`funcname\` "(" [\`parameter_list\`] ")"
       : ["->" \`expression\`] ":" \`suite\`
decorators: \`decorator\`+
defparameter: \`parameter\` ["=" \`expression\`]
funcname: \`identifier\`
\`\`\`

A function definition is an executable statement.
`;

const RST_COLON_CODE_BLOCK = `
For example, the following code ::

   @f1(arg)
   @f2
   def func(): pass

is roughly equivalent to (.. seealso:: exact_conversion) ::

   def func(): pass
   func = f1(arg)(f2(func))

except that the original function is not temporarily bound to the name func.
`;

const RST_COLON_CODE_BLOCK_MARKDOWN = `
For example, the following code 

\`\`\`python
@f1(arg)
@f2
def func(): pass
\`\`\`

is roughly equivalent to (*See also* exact_conversion) 

\`\`\`python
def func(): pass
func = f1(arg)(f2(func))
\`\`\`

except that the original function is not temporarily bound to the name func.
`;

// note: two spaces indent
const NUMPY_EXAMPLE = `
The docstring examples assume that \`numpy\` has been imported as \`np\`::

  >>> import numpy as np
  
Code snippets are indicated by three greater-than signs::

  >>> x = 42
  >>> x = x + 1
`;

const NUMPY_EXAMPLE_MARKDOWN = `
The docstring examples assume that \`numpy\` has been imported as \`np\`

\`\`\`python
>>> import numpy as np
\`\`\`

Code snippets are indicated by three greater-than signs

\`\`\`python
>>> x = 42
>>> x = x + 1
\`\`\`
`;

const NUMPY_MATH_EXAMPLE = `
single-frequency component at linear frequency :math:\`f\` is
represented by a complex exponential
:math:\`a_m = \\exp\\{2\\pi i\\,f m\\Delta t\\}\`, where :math:\`\\Delta t\`
is the sampling interval.
`;

const NUMPY_MATH_EXAMPLE_MARKDOWN = `
single-frequency component at linear frequency $f$ is
represented by a complex exponential
$a_m = \\exp\\{2\\pi i\\,f m\\Delta t\\}$, where $\\Delta t$
is the sampling interval.
`;

const PEP_287_CODE_BLOCK = `
Here's a doctest block:

>>> print 'Python-specific usage examples; begun with ">>>"'
Python-specific usage examples; begun with ">>>"
>>> print '(cut and pasted from interactive sessions)'
(cut and pasted from interactive sessions)`;

const PEP_287_CODE_BLOCK_MARKDOWN = `
Here's a doctest block:

\`\`\`python
print 'Python-specific usage examples; begun with ">>>"'
\`\`\`

\`\`\`
Python-specific usage examples; begun with ">>>"
\`\`\`

\`\`\`python
print '(cut and pasted from interactive sessions)'
\`\`\`

\`\`\`
(cut and pasted from interactive sessions)
\`\`\`
`;

const RST_HIGHLIGHTED_BLOCK = `
.. highlight:: R

Code block ::

   data.frame()
`;

const RST_HIGHLIGHTED_BLOCK_MARKDOWN = `

Code block 

\`\`\`R
data.frame()
\`\`\`
`;

const RST_MATH_EXAMPLE = `
In two dimensions, the DFT is defined as

.. math::
   A_{kl} =  \\\\sum_{m=0}^{M-1} \\\\sum_{n=0}^{N-1}
   a_{mn}\\\\exp\\\\left\\\\{-2\\\\pi i \\\\left({mk\\\\over M}+{nl\\\\over N}\\\\right)\\\\right\\\\}
   \\\\qquad k = 0, \\\\ldots, M-1;\\\\quad l = 0, \\\\ldots, N-1,
   
which extends in the obvious way to higher dimensions, and the inverses
`;

const RST_MATH_EXAMPLE_MARKDOWN = `
In two dimensions, the DFT is defined as

$$
A_{kl} =  \\\\sum_{m=0}^{M-1} \\\\sum_{n=0}^{N-1}
a_{mn}\\\\exp\\\\left\\\\{-2\\\\pi i \\\\left({mk\\\\over M}+{nl\\\\over N}\\\\right)\\\\right\\\\}
\\\\qquad k = 0, \\\\ldots, M-1;\\\\quad l = 0, \\\\ldots, N-1,
$$

which extends in the obvious way to higher dimensions, and the inverses
`;

describe('looks_like_rst', () => {
  it('recognises reStructuredText', () => {
    expect(looks_like_rst(PEP_287_CODE_BLOCK)).to.be.true;
    expect(looks_like_rst('the following code ::\n\n\tcode')).to.be.true;
    expect(looks_like_rst('the following code::\n\n\tcode')).to.be.true;
    expect(looks_like_rst('See Also\n--------\n')).to.be.true;
  });

  it('ignores plain text', () => {
    expect(looks_like_rst('this is plain text')).to.be.false;
    expect(looks_like_rst('this might be **markdown**')).to.be.false;
    expect(looks_like_rst('::::::\n\n\tcode')).to.be.false;
    expect(looks_like_rst('::')).to.be.false;
    expect(looks_like_rst('See Also: Interesting Topic')).to.be.false;
  });
});

const INTEGRATION = `
Return a fixed frequency DatetimeIndex.

Parameters
----------
start : str or datetime-like, optional
    Frequency strings can have multiples, e.g. '5H'. See
    :ref:\`here <timeseries.offset_aliases>\` for a list of
    frequency aliases.
tz : str or tzinfo, optional

To learn more about the frequency strings, please see \`this link
<https://pandas.pydata.org/pandas-docs/stable/user_guide/timeseries.html#offset-aliases>\`__.
`;

describe('rst_to_markdown', () => {
  // TODO: all of this needs unit-testing using examples from pandas documentation and numpy documentation
  //   and examples of corresponding valid Markdown

  it('Converts PEP 287 examples correctly', () => {
    // https://www.python.org/dev/peps/pep-0287/
    let converted = rst_to_markdown(PEP_287_CODE_BLOCK);
    expect(converted).to.be.equal(PEP_287_CODE_BLOCK_MARKDOWN);
  });

  it('handles prompt continuation and multi-line output', () => {
    let converted = rst_to_markdown(CODE_MULTI_LINE_CODE_OUTPUT);
    expect(converted).to.be.equal(CODE_MULTI_LINE_CODE_OUTPUT_MARKDOWN);
  });

  it('converts links', () => {
    let converted = rst_to_markdown(RST_LINK_EXAMPLE);
    expect(converted).to.be.equal(RST_LINK_EXAMPLE_MARKDOWN);

    converted = rst_to_markdown(INTEGRATION);
    expect(converted).to.be.contain(RST_LINK_EXAMPLE_MARKDOWN);
  });

  it('changes highlight', () => {
    let converted = rst_to_markdown(RST_HIGHLIGHTED_BLOCK);
    expect(converted).to.be.equal(RST_HIGHLIGHTED_BLOCK_MARKDOWN);
  });

  it('converts production list', () => {
    let converted = rst_to_markdown(RST_PRODUCTION_LIST_EXAMPLE);
    expect(converted).to.be.equal(RST_PRODUCTION_LIST_EXAMPLE_MARKDOWN);
  });

  it('converts inline math', () => {
    let converted = rst_to_markdown(NUMPY_MATH_EXAMPLE);
    expect(converted).to.be.equal(NUMPY_MATH_EXAMPLE_MARKDOWN);
  });

  it('converts math blocks', () => {
    let converted = rst_to_markdown(RST_MATH_EXAMPLE);
    expect(converted).to.be.equal(RST_MATH_EXAMPLE_MARKDOWN);
  });

  it('converts references', () => {
    let converted = rst_to_markdown(RST_REF_EXAMPLE);
    expect(converted).to.be.equal(RST_REF_MARKDOWN);
  });

  it('converts double colon-initiated code block and the preceding lines', () => {
    let converted = rst_to_markdown(RST_COLON_CODE_BLOCK);
    expect(converted).to.be.equal(RST_COLON_CODE_BLOCK_MARKDOWN);
  });

  it('converts double colon-initiated code block with different indent and Python prompt', () => {
    let converted = rst_to_markdown(NUMPY_EXAMPLE);
    expect(converted).to.be.equal(NUMPY_EXAMPLE_MARKDOWN);
  });

  it('converts version changed', () => {
    expect(rst_to_markdown('.. versionchanged:: 0.23.0')).to.be.equal(
      '*Changed in 0.23.0*'
    );
  });

  it('converts "see also" section', () => {
    let converted = rst_to_markdown(SEE_ALSO);
    expect(converted).to.be.equal(SEE_ALSO_MARKDOWN);
  });

  it('converts module', () => {
    expect(
      rst_to_markdown('Discrete Fourier Transform (:mod:`numpy.fft`)')
    ).to.be.equal('Discrete Fourier Transform (`numpy.fft`)');
  });
});
