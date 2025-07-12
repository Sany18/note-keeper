import { FC, forwardRef, useState } from "react";

import { Icon } from "../Icon/Icon";
import { Spinner } from "components/Spinner/Spinner";

import "./Img.css";

type Props = {
  src?: string;
  alt?: string;
  [key: string]: any;
}

export const Img: FC<Props> = forwardRef(({ src, alt, ...props }, ref: any) => {
  const [error, setError] = useState<any>(false);
  const [imageLoaded, setImageLoaded] = useState<any>(false);

  const onLoad = () => {
    setImageLoaded(true);
    props.onLoad && props.onLoad();
  };

  const onError = () => {
    setImageLoaded(true);
    setError(true);
  }

  return (
    <div className={`Img ${props.className || ''}`}>
      <img
        src={src}
        alt={alt || 'image'}
        ref={ref}
        {...props}
        onLoad={onLoad}
        onError={onError}
        className={`Img__img ${error ? "hidden" : ''}`}
      />

      {!imageLoaded &&
        <div className="Img__spinner">
          <Spinner />
        </div>
      }

      {error &&
        <div className="Img__error">
          <Icon
            size="2rem"
            className="Img__errorIcon">
            error
          </Icon>
        </div>
      }
    </div>
  )
});
