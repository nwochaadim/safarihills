import { useMemo } from 'react';
import { Text, View } from 'react-native';

type HtmlViewerProps = {
  html: string;
  className?: string;
  textClassName?: string;
};

const BOLD_OPEN = '[[bold]]';
const BOLD_CLOSE = '[[/bold]]';

const decodeHtmlEntities = (value: string) => {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };

  return Object.entries(entities).reduce(
    (result, [entity, decoded]) => result.replace(new RegExp(entity, 'g'), decoded),
    value
  );
};

const htmlToText = (value: string) => {
  const withLineBreaks = value
    .replace(/\r?\n/g, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6])>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/(ul|ol)>/gi, '\n\n')
    .replace(/<\s*(strong|b)[^>]*>/gi, BOLD_OPEN)
    .replace(/<\/\s*(strong|b)\s*>/gi, BOLD_CLOSE);

  const stripped = withLineBreaks.replace(/<[^>]+>/g, '');
  const decoded = decodeHtmlEntities(stripped);

  return decoded.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
};

const parseBoldSegments = (value: string) => {
  const segments: { text: string; bold: boolean }[] = [];
  let remaining = value;
  let bold = false;

  while (remaining.length > 0) {
    if (!bold) {
      const openIndex = remaining.indexOf(BOLD_OPEN);
      if (openIndex === -1) {
        segments.push({ text: remaining, bold: false });
        break;
      }
      if (openIndex > 0) {
        segments.push({ text: remaining.slice(0, openIndex), bold: false });
      }
      remaining = remaining.slice(openIndex + BOLD_OPEN.length);
      bold = true;
    } else {
      const closeIndex = remaining.indexOf(BOLD_CLOSE);
      if (closeIndex === -1) {
        segments.push({ text: remaining, bold: true });
        break;
      }
      if (closeIndex > 0) {
        segments.push({ text: remaining.slice(0, closeIndex), bold: true });
      }
      remaining = remaining.slice(closeIndex + BOLD_CLOSE.length);
      bold = false;
    }
  }

  return segments.filter((segment) => segment.text.length > 0);
};

export function HtmlViewer({ html, className, textClassName }: HtmlViewerProps) {
  const normalized = useMemo(() => htmlToText(html ?? ''), [html]);
  const paragraphs = useMemo(
    () => (normalized ? normalized.split(/\n{2,}/) : []),
    [normalized]
  );

  return (
    <View className={className}>
      {paragraphs.map((paragraph, index) => {
        const segments = parseBoldSegments(paragraph);
        return (
        <Text
          key={`${index}-${paragraph.slice(0, 12)}`}
          className={[textClassName, index > 0 ? 'mt-2' : null].filter(Boolean).join(' ')}>
          {segments.map((segment, segmentIndex) => (
            <Text
              key={`${index}-segment-${segmentIndex}`}
              className={segment.bold ? 'font-semibold' : undefined}>
              {segment.text}
            </Text>
          ))}
        </Text>
        );
      })}
    </View>
  );
}
