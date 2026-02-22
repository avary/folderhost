export const parseAnsi = (text: string): React.ReactNode[] => {
  const cleanText = text
    .replace(/\x1b\[[0-9;]*[ABCDEFGHJKLMPSTfhilnrsu]/g, '')
    .replace(/\x1b\][^\x07\x1b]*[\x07\x1b\\]/g, '')
    .replace(/\[\?[0-9]+[hl]/g, '')
    .replace(/\][0-9]+;[^\\\n]*\\/g, '')
    .replace(/\]0;[^\r\n]*/g, '')
    .replace(/^\\+$/gm, '')
    .replace(/\r/g, '')
    .replace(/[\u2580-\u259F]/g, '')
    .replace(/[\u25A0-\u25FF]/g, '')
    .replace(/[\uFFFD]/g, '');

  const ansiRegex = /\x1b\[([0-9;]*)([a-zA-Z])/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let currentStyles: React.CSSProperties = {};

  const applyStyle = (codes: string): React.CSSProperties => {
    const style: React.CSSProperties = {};
    const codeList = codes.split(';').map(Number);
    
    for (const code of codeList) {
      switch (code) {
        case 0: return {};
        case 1: style.fontWeight = 'bold'; break;
        case 3: style.fontStyle = 'italic'; break;
        case 4: style.textDecoration = 'underline'; break;
        case 30: style.color = '#666'; break;
        case 31: style.color = '#ff6b6b'; break;
        case 32: style.color = '#69db7e'; break;
        case 33: style.color = '#ffd43b'; break;
        case 34: style.color = '#4dabf7'; break;
        case 35: style.color = '#da77f2'; break;
        case 36: style.color = '#3bc9db'; break;
        case 37: style.color = '#f8f9fa'; break;
        case 90: style.color = '#868e96'; break;
        case 91: style.color = '#ff8787'; break;
        case 92: style.color = '#8ce99a'; break;
        case 93: style.color = '#ffe066'; break;
        case 94: style.color = '#74c0fc'; break;
        case 95: style.color = '#e599f7'; break;
        case 96: style.color = '#66d9e8'; break;
        case 97: style.color = '#ffffff'; break;
        default:
          if (code === 38 && codeList.includes(2)) {
            const index = codeList.indexOf(38);
            if (index >= 0 && codeList.length > index + 4) {
              const r = codeList[index + 2];
              const g = codeList[index + 3];
              const b = codeList[index + 4];
              style.color = `rgb(${r}, ${g}, ${b})`;
            }
          }
          break;
      }
    }
    return style;
  };

  let match;
  while ((match = ansiRegex.exec(cleanText)) !== null) {
    const [fullMatch, codes, command] = match;
    const start = match.index;
    
    if (start > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} style={currentStyles}>
          {cleanText.slice(lastIndex, start)}
        </span>
      );
    }
    
    if (command === 'm') {
      if (codes === '' || codes === '0') {
        currentStyles = {};
      } else if (codes) {
        currentStyles = { ...currentStyles, ...applyStyle(codes) };
      }
    }
    
    lastIndex = start + fullMatch.length;
  }
  
  if (lastIndex < cleanText.length) {
    parts.push(
      <span key={`text-${lastIndex}`} style={currentStyles}>
        {cleanText.slice(lastIndex)}
      </span>
    );
  }
  
  return parts.length ? parts : [<span key="full">{cleanText}</span>];
};