import { FC } from "react";

import "./Loader.css";

type Props = {

}

export const Loader: FC<Props> = () => {
  return (
    <div
      aria-label="loader"
      className="Loader__containter">
      <div className="Loader"></div>
    </div>
  )
}