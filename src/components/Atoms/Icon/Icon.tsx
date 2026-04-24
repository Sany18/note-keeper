import { CSSProperties, FC, useEffect, useState } from "react";

import { log } from "services/log/log.service";

type Props = {
  children: string;
  style?: CSSProperties;
  size?: string;
  [key: string]: any;
}

let fontLoaded = false;
// @ts-ignore
WebFont.load({
  google: {
    families: ['Material Symbols Outlined']
  },
  active: () => {
    fontLoaded = true;
    document.dispatchEvent(new Event('font-loaded'));
    log.appEvent('font-loaded', 'Material Symbols Outlined');
  },
  inactive: () => {
    fontLoaded = true;
    document.dispatchEvent(new Event('font-loaded'));
    log.error('font-load failed', 'Material Symbols Outlined');
  },
  timeout: 30_000
});

export const Icon: FC<Props> = (props) => {
  const { children, size, style } = props;
  const [fontReady, setFontReady] = useState(fontLoaded);

  useEffect(() => {
    document.addEventListener('font-loaded', () => setFontReady(true));

    return () => document.removeEventListener('font-loaded', () => setFontReady(true));
  }, []);

  return (
    <i
      style={{
        width: size || '1rem',
        height: size || '1rem',
        fontSize: size || '1rem',
        ...style
      }}
      {...props}
      className={`Icon material-symbols-outlined ${props.className || ''}`}>
      {fontReady && children}
    </i>
  );
}
