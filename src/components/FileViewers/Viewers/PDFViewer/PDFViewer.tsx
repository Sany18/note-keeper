import { useActiveFile } from 'reactHooks/fileManager/activeFile/activeFile.hook';
import { useEffect, useRef, useState } from 'react';

import { Loader } from 'components/Loader/Loader';

import './PDFViewer.css';

type Props = {
};

const PDFViewer: React.FC<Props> = () => {
  const [showLoader, setShowLoader] = useState(true);
  const { activeFileModel: activeFile } = useActiveFile();

  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setShowLoader(true);
    ref.current.style.height = '100%';
  }, [activeFile?.id]);

  return (
    <div className='PDFViewer'>
      {showLoader && <div className='PDFViewer__loader'>
        <Loader />
      </div>}

      {activeFile?.id &&
        <iframe
          className={`PDFViewer__iframe ${showLoader ? 'hidden' : ''}`}
          ref={ref}
          src={`https://docs.google.com/viewer?srcid=${activeFile.id}&pid=explorer&efh=false&a=v&chrome=false&embedded=true`}
          onLoad={() => {
            ref.current.style.height = '101%';

            setTimeout(() => {
              setShowLoader(false);
            }, 100);
          }}>
        </iframe>
      }
    </div>
  )
}

export default PDFViewer;
