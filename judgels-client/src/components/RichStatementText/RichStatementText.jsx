import HTMLReactParser from 'html-react-parser';
import { useEffect, useRef } from 'react';
import { renderToString } from 'react-dom/server';

import { useWebPrefs } from '../../modules/webPrefs';
import { HtmlText } from '../HtmlText/HtmlText';
import { SourceCode } from '../SourceCode/SourceCode';

import './RichStatementText.scss';
import 'katex/dist/katex.min.css';

export default function RichStatementText({ children, text }) {
  const ref = useRef();
  const { isDarkMode } = useWebPrefs();

  const content = typeof children === 'string' ? children : typeof text === 'string' ? text : '';

  const typesetKatex = async isStale => {
    if (!ref.current) {
      return;
    }

    const { default: renderMathInElement } = await import('katex/dist/contrib/auto-render');
    if (isStale()) {
      return;
    }
    renderMathInElement(ref.current, {
      delimiters: [
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false },
        { left: '\\[', right: '\\]', display: true },
      ],
    });
  };

  const containsKatexSyntax = str => {
    if (!str || typeof str !== 'string') {
      return false;
    }
    const delimiters = ['$', '\\(', '\\)', '\\[', '\\]'];
    for (let delimiter of delimiters) {
      if (str.includes(delimiter)) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    let stale = false;
    if (containsKatexSyntax(content)) {
      typesetKatex(() => stale);
    }
    return () => {
      stale = true;
    };
  }, [content]);

  let str = content || '';

  if (typeof str === 'string') {
    str = str.replace(/<pre data-lang="(.+?)">(.*?)<\/pre>/gs, (_match, lang, code) => {
      return renderToString(
        <SourceCode isDarkMode={isDarkMode} language={lang} showLineNumbers={false}>
          {HTMLReactParser(code.trim())}
        </SourceCode>
      );
    });
  }

  return (
    <div className="rich-statement-text" ref={ref}>
      <HtmlText key={str}>{str}</HtmlText>
    </div>
  );
}
