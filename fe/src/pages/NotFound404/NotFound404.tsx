import { FC, useState } from 'react';

import './NotFound404.css';

export const NotFound404: FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const onPlayHandler = () => {
    const floatText = document.querySelector('.NotFound404__title_float');

    if (isPlaying) {
      floatText?.classList.remove('running');
    } else {
      floatText?.classList.add('running');
    }
  }

  const play = () => {
    setIsPlaying(!isPlaying);
    onPlayHandler();
  };

  return (
    <div className="NotFound404">
      <div
        onClick={play}
        className='NotFound404__titleWrapper'>
        <h1 className="NotFound404__title">404</h1>
        <p className="NotFound404__description">Page not found</p>
      </div>

      <div className='NotFound404__title_float'>
        404
      </div>
    </div>
  );
};
