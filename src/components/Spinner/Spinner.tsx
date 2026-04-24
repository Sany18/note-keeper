import './Spinner.css';

type Props = {
  size?: number | string;
  text?: string;
}

export const Spinner: React.FC<Props> = ({ size, text }) => {
  const style = {
    width: size || '1rem',
  };

  return (
    <div
      style={style}
      className="Spinner">
      <div className="rotor"></div>
    </div>
  );
}
