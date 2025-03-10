import React from "react";

interface SkipSectionProps {
  onSkip?: () => void;
  label?: string;
  subText?: string;
}

const SkipSection: React.FC<SkipSectionProps> = ({
  onSkip,
  label = "Skip for now",
  subText = "(You can add these later from profile)",
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onSkip) {
      onSkip();
    }
  };

  return (
    <div className="skip-sec">
      <a href="#" onClick={handleClick} >
        <span>{label}</span>
        <svg
          width={18}
          height={16}
          viewBox="0 0 18 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15.1895 7.24997H1.25C1.05109 7.24997 0.860322 7.32899 0.71967 7.46964C0.579018 7.61029 0.5 7.80106 0.5 7.99997C0.5 8.19888 0.579018 8.38965 0.71967 8.5303C0.860322 8.67095 1.05109 8.74997 1.25 8.74997H15.1895L9.719 14.219C9.57817 14.3598 9.49905 14.5508 9.49905 14.75C9.49905 14.9491 9.57817 15.1401 9.719 15.281C9.85983 15.4218 10.0508 15.5009 10.25 15.5009C10.4492 15.5009 10.6402 15.4218 10.781 15.281L17.531 8.53097C17.6008 8.4613 17.6563 8.37854 17.6941 8.28742C17.7319 8.1963 17.7513 8.09862 17.7513 7.99997C17.7513 7.90132 17.7319 7.80364 17.6941 7.71252C17.6563 7.6214 17.6008 7.53864 17.531 7.46897L10.781 0.718971C10.6402 0.578141 10.4492 0.499023 10.25 0.499023C10.0508 0.499023 9.85983 0.578141 9.719 0.718971C9.57817 0.859801 9.49905 1.05081 9.49905 1.24997C9.49905 1.44913 9.57817 1.64014 9.719 1.78097L15.1895 7.24997Z"
            fill="#333333"
          />
        </svg>
      </a>
      <p className="small-text">{subText}</p>
    </div>
  );
};

export default SkipSection;
