export const parseAnsi = (text: string): React.ReactNode[] => {
  const ansiRegex = /\x1b\[([0-9;]*)([a-zA-Z])/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let currentStyles: React.CSSProperties = {};

  const applyStyle = (codes: string): React.CSSProperties => {
    const style: React.CSSProperties = {};
    const codeList = codes.split(';').map(Number);
    
    for (const code of codeList) {
      switch (code) {
        case 0: // Reset
          return {};
        case 1: // Bold
          style.fontWeight = 'bold';
          break;
        case 3: // Italic
          style.fontStyle = 'italic';
          break;
        case 4: // Underline
          style.textDecoration = 'underline';
          break;
        case 30: style.color = '#666'; break; // Dark Gray
        case 31: style.color = '#ff6b6b'; break; // Red
        case 32: style.color = '#69db7e'; break; // Green
        case 33: style.color = '#ffd43b'; break; // Yellow
        case 34: style.color = '#4dabf7'; break; // Blue
        case 35: style.color = '#da77f2'; break; // Magenta
        case 36: style.color = '#3bc9db'; break; // Cyan
        case 37: style.color = '#f8f9fa'; break; // White
        case 90: style.color = '#868e96'; break; // Light Gray
        case 91: style.color = '#ff8787'; break; // Light Red
        case 92: style.color = '#8ce99a'; break; // Light Green
        case 93: style.color = '#ffe066'; break; // Light Yellow
        case 94: style.color = '#74c0fc'; break; // Light Blue
        case 95: style.color = '#e599f7'; break; // Light Magenta
        case 96: style.color = '#66d9e8'; break; // Light Cyan
        case 97: style.color = '#ffffff'; break; // Bright White
        default:
          // Handle RGB colors: 38;2;r;g;b
          if (code === 38 && codeList.includes(2)) {
            const index = codeList.indexOf(38);
            if (index >= 0 && codeList.length > index + 3) {
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
  while ((match = ansiRegex.exec(text)) !== null) {
    const [fullMatch, codes, command] = match;
    const start = match.index;
    
    if (start > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} style={currentStyles}>
          {text.slice(lastIndex, start)}
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
  
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`} style={currentStyles}>
        {text.slice(lastIndex)}
      </span>
    );
  }
  
  return parts.length ? parts : [<span key="full">{text}</span>];
};